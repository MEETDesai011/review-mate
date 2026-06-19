const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');
const prisma = require('./prisma');

function isDeterministicFix(issue) {
  const desc = (issue.description || '').toLowerCase();
  
  // Excluded terms
  if (
    desc.includes('architecture') ||
    desc.includes('business logic') ||
    desc.includes('auth') ||
    desc.includes('payment') ||
    desc.includes('dependency') ||
    desc.includes('refactor')
  ) {
    return false;
  }

  // Allowed terms
  if (
    desc.includes('unused') ||
    desc.includes('import') ||
    desc.includes('dead') ||
    desc.includes('null check') ||
    desc.includes('syntax') ||
    desc.includes('type') ||
    desc.includes('format')
  ) {
    return true;
  }

  return false;
}

async function getOctokitForInstallation(installationId) {
  if (process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY) {
    const auth = createAppAuth({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    const installationAuth = await auth({ type: 'installation', installationId });
    return new Octokit({ auth: installationAuth.token });
  }
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

async function createAutoFixPR(reviewId) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      issues: true,
      repository: {
        include: { installation: true }
      }
    }
  });

  if (!review) throw new Error('Review not found');

  const deterministicIssues = review.issues.filter(
    issue => issue.fixSnippet && (issue.severity === 'CRITICAL' || issue.severity === 'WARNING') && isDeterministicFix(issue)
  );

  if (deterministicIssues.length === 0) {
    return null;
  }

  const { owner, name: repo } = review.repository;
  const installationId = review.repository.installation?.githubId?.toString();
  const octokit = await getOctokitForInstallation(installationId);

  const branchName = `reviewmate/fix-${reviewId.slice(0, 8)}`;
  let rollbackRef = null;

  try {
    const autoFixRecord = await prisma.autoFixPR.create({
      data: {
        branchName,
        status: 'PENDING',
        reviewId,
      }
    });

    const { data: pullRequest } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: review.prNumber
    });
    
    const headSha = pullRequest.head.sha;
    const baseBranch = pullRequest.head.ref; // The branch the PR is coming from

    // Create a new branch off the PR's head branch
    try {
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: headSha
      });
      rollbackRef = `heads/${branchName}`;
    } catch (err) {
      if (err.status !== 422) throw err; // 422 usually means branch exists
    }

    const { data: baseTree } = await octokit.rest.git.getCommit({
      owner,
      repo,
      commit_sha: headSha,
    });

    const treeData = [];

    // Apply fixes
    for (const issue of deterministicIssues) {
      const filePath = issue.filePath;
      try {
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: filePath,
          ref: headSha
        });

        if (!Array.isArray(fileData) && fileData.type === 'file' && fileData.content) {
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
          
          const lines = content.split('\n');
          // Extremely simple apply: replace the specific line. 
          // In a real robust system, we'd use line ranges.
          const lineIndex = issue.lineNumber - 1;
          if (lineIndex >= 0 && lineIndex < lines.length) {
            lines[lineIndex] = issue.fixSnippet;
          }

          const newContent = lines.join('\n');
          
          const { data: blob } = await octokit.rest.git.createBlob({
            owner,
            repo,
            content: newContent,
            encoding: 'utf-8'
          });

          treeData.push({
            path: filePath,
            mode: '100644',
            type: 'blob',
            sha: blob.sha
          });
        }
      } catch (err) {
        console.warn(`[ReviewMate] Failed to apply fix for ${filePath}: ${err.message}`);
      }
    }

    if (treeData.length === 0) {
      throw new Error('No fixes could be applied successfully.');
    }

    const { data: newTree } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTree.tree.sha,
      tree: treeData
    });

    const { data: newCommit } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: `ReviewMate Auto-Fix\n\nApplies deterministic AI fixes for Review ${reviewId}`,
      tree: newTree.sha,
      parents: [headSha]
    });

    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: newCommit.sha
    });

    // Create Draft PR
    const { data: newPr } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: `[ReviewMate] Auto-Fixes for PR #${review.prNumber}`,
      head: branchName,
      base: pullRequest.base.ref, // Open against the original base
      body: `ReviewMate has generated deterministic auto-fixes for the issues found in PR #${review.prNumber}.\n\nReview the changes and merge if they look correct.`,
      draft: true // STRICT RULE: Must be hardcoded true
    });

    await prisma.autoFixPR.update({
      where: { id: autoFixRecord.id },
      data: {
        prNumber: newPr.number,
        status: 'DRAFT_OPENED'
      }
    });

    return newPr;

  } catch (err) {
    console.error(`[ReviewMate] Auto-fix PR creation failed: ${err.message}`);
    
    // Rollback branch
    if (rollbackRef) {
      try {
        await octokit.rest.git.deleteRef({
          owner,
          repo,
          ref: rollbackRef
        });
      } catch (rollbackErr) {
        console.error(`[ReviewMate] Branch rollback failed: ${rollbackErr.message}`);
      }
    }

    const existingRecord = await prisma.autoFixPR.findUnique({ where: { reviewId } });
    if (existingRecord) {
      await prisma.autoFixPR.update({
        where: { id: existingRecord.id },
        data: {
          status: 'FAILED',
          error: err.message
        }
      });
    }

    throw err;
  }
}

module.exports = { createAutoFixPR };
