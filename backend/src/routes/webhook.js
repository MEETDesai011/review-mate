const { Router } = require('express');
const crypto = require('crypto');
const prisma = require('../services/prisma');
const { generateReleaseNotes } = require('../services/gemini');
const { sendNotifications } = require('../services/notifier');
const { processReview } = require('../services/reviewer');
const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');

const router = Router();

function verifySignature(req, res, next) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return next();

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  const payload = req.rawBody; // Populated by express.json middleware
  if (!payload) {
    return res.status(400).json({ error: 'Missing raw payload body' });
  }

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  } catch {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

async function checkSuspension(installationId) {
  if (!installationId) return false;
  const inst = await prisma.installation.findUnique({
    where: { githubId: BigInt(installationId) }
  });
  return inst && inst.suspendedAt !== null;
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

// Fetch diff files using Octokit
async function fetchDiffFiles(octokit, owner, repo, pull_number) {
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number,
    per_page: 100
  });

  return files
    .filter(f => f.patch && f.status !== 'removed')
    .map(f => ({
      filename: f.filename,
      status: f.status,
      patch: f.patch,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes
    }));
}

router.post('/github', verifySignature, async (req, res, next) => {
  try {
    const event = req.headers['x-github-event'];
    const { action, installation } = req.body;

    if (installation && installation.id) {
      const isSuspended = await checkSuspension(installation.id);
      if (isSuspended && event !== 'installation') {
        return res.status(403).json({ error: 'Installation is suspended' });
      }
    }

    if (event === 'installation') {
      const githubId = BigInt(installation.id);
      const accountLogin = installation.account.login;

      if (action === 'created' || action === 'unsuspend') {
        await prisma.installation.upsert({
          where: { githubId },
          create: { githubId, accountLogin, suspendedAt: null },
          update: { accountLogin, suspendedAt: null },
        });

        // Initialize repos
        if (req.body.repositories) {
          for (const ghRepo of req.body.repositories) {
            await prisma.repository.upsert({
              where: { githubId: BigInt(ghRepo.id) },
              create: {
                githubId: BigInt(ghRepo.id),
                owner: accountLogin,
                name: ghRepo.name,
                installationId: (await prisma.installation.findUnique({ where: { githubId } })).id
              },
              update: {
                owner: accountLogin,
                name: ghRepo.name,
                installationId: (await prisma.installation.findUnique({ where: { githubId } })).id
              }
            });
          }
        }
      } else if (action === 'deleted') {
        await prisma.installation.deleteMany({ where: { githubId } });
      } else if (action === 'suspend') {
        await prisma.installation.update({
          where: { githubId },
          data: { suspendedAt: new Date() }
        });
      }

      return res.status(200).json({ message: 'Installation event processed' });
    }

    if (event === 'pull_request') {
      const { pull_request: pr, repository: ghRepo } = req.body;
      const owner = ghRepo.owner.login;
      const repoName = ghRepo.name;
      const githubId = BigInt(ghRepo.id);
      const prNumber = pr.number;
      const prTitle = pr.title;
      const prBody = pr.body || '';
      const author = pr.user.login;

      // Handle Review
      if (action === 'opened' || action === 'synchronize') {
        // Dual-review guard: check if review was just created
        const recentReview = await prisma.review.findFirst({
          where: {
            repository: { githubId },
            prNumber,
            createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
          }
        });

        if (recentReview) {
          return res.status(200).json({ message: 'Skipped duplicate review request' });
        }

        let installationIdDb = null;
        if (installation) {
          const instDb = await prisma.installation.findUnique({ where: { githubId: BigInt(installation.id) } });
          if (instDb) installationIdDb = instDb.id;
        }

        const octokit = await getOctokitForInstallation(installation?.id);

        // Fetch files
        const files = await fetchDiffFiles(octokit, owner, repoName, prNumber);

        // Run analysis
        const result = await processReview({
          owner,
          repoName,
          githubId: ghRepo.id,
          installationId: installationIdDb,
          prNumber,
          title: prTitle,
          author,
          files,
          persona: 'SENIOR_ENGINEER',
          severityThreshold: 'WARNING'
        });

        // Create Check Run
        await octokit.rest.checks.create({
          owner,
          repo: repoName,
          name: 'ReviewMate AI',
          head_sha: pr.head.sha,
          status: 'completed',
          conclusion: result.score >= 50 ? 'success' : 'failure',
          output: {
            title: `ReviewMate Score: ${result.score}/100`,
            summary: `**Score:** ${result.score}/100\n**Critical Issues:** ${result.criticalCount}\n\n${result.reviewResult.summary}`,
            text: `View full details on the ReviewMate Dashboard.`
          },
          actions: [
            {
              label: 'View Dashboard',
              description: 'Open the ReviewMate Dashboard',
              identifier: 'view_dashboard'
            },
            {
              label: 'Apply Auto-Fix',
              description: 'Generate a Draft PR with deterministic fixes',
              identifier: 'apply_autofix'
            }
          ]
        });

        return res.status(200).json({ message: 'Review completed', reviewId: result.reviewId });
      }

      // Handle Release Notes
      if (action === 'closed' && pr.merged) {
        const repository = await prisma.repository.upsert({
          where: { githubId },
          create: { githubId, owner, name: repoName },
          update: { owner, name: repoName },
        });

        const octokit = await getOctokitForInstallation(installation?.id);
        const files = await fetchDiffFiles(octokit, owner, repoName, prNumber);
        const filesChanged = files.map(f => f.filename);

        const releaseNotesData = await generateReleaseNotes(prTitle, prBody, filesChanged);
        const content = JSON.stringify(releaseNotesData);

        const releaseNote = await prisma.releaseNote.upsert({
          where: {
            repositoryId_prNumber: { repositoryId: repository.id, prNumber }
          },
          create: {
            prNumber,
            title: prTitle,
            author,
            content,
            mergedAt: new Date(pr.merged_at),
            repositoryId: repository.id,
          },
          update: {
            title: prTitle,
            author,
            content,
            mergedAt: new Date(pr.merged_at),
          },
        });

        return res.status(200).json({ message: 'Release notes generated', releaseNoteId: releaseNote.id });
      }

      return res.status(200).json({ message: 'Event ignored' });
    }

    if (event === 'check_run') {
      const { check_run, requested_action } = req.body;
      if (requested_action && requested_action.identifier === 'apply_autofix') {
        // Find review based on PR and trigger autofix.
        // Simplified for this implementation
      }
      return res.status(200).json({ message: 'Check run action ignored' });
    }

    res.status(200).json({ message: 'Event ignored', event });
  } catch (err) {
    console.error(`[ReviewMate] Webhook error: ${err.message}`);
    next(err);
  }
});

module.exports = router;
