require('dotenv').config();
const express = require('express');
const { createNodeMiddleware } = require('@octokit/webhooks');
const { Webhooks } = require('@octokit/webhooks');

// Import identical review pipeline from backend
const { processReview } = require('../backend/src/services/reviewer');
const prisma = require('../backend/src/services/prisma');
const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');
const crypto = require('crypto');

const app = express();

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET || 'development-secret',
});

async function checkSuspension(installationId) {
  if (!installationId) return false;
  const inst = await prisma.installation.findUnique({
    where: { githubId: BigInt(installationId) }
  });
  return inst && inst.suspendedAt !== null;
}

async function getOctokit(installationId) {
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
  const installationAuth = await auth({ type: 'installation', installationId });
  return new Octokit({ auth: installationAuth.token });
}

// Global gate for suspension
webhooks.onAny(async ({ id, name, payload }) => {
  if (name !== 'installation' && payload.installation) {
    const isSuspended = await checkSuspension(payload.installation.id);
    if (isSuspended) {
      console.log(`[GitHub App] Ignored event ${name} for suspended installation ${payload.installation.id}`);
      throw new Error('Installation suspended'); // Will stop execution
    }
  }
});

webhooks.on('installation.created', async ({ payload }) => {
  const githubId = BigInt(payload.installation.id);
  const accountLogin = payload.installation.account.login;

  await prisma.installation.upsert({
    where: { githubId },
    create: { githubId, accountLogin, suspendedAt: null },
    update: { accountLogin, suspendedAt: null },
  });

  if (payload.repositories) {
    for (const ghRepo of payload.repositories) {
      const inst = await prisma.installation.findUnique({ where: { githubId } });
      await prisma.repository.upsert({
        where: { githubId: BigInt(ghRepo.id) },
        create: {
          githubId: BigInt(ghRepo.id),
          owner: accountLogin,
          name: ghRepo.name,
          installationId: inst.id
        },
        update: {
          owner: accountLogin,
          name: ghRepo.name,
          installationId: inst.id
        }
      });
    }
  }
});

webhooks.on('installation.deleted', async ({ payload }) => {
  const githubId = BigInt(payload.installation.id);
  await prisma.installation.deleteMany({ where: { githubId } });
});

webhooks.on('installation.suspend', async ({ payload }) => {
  const githubId = BigInt(payload.installation.id);
  await prisma.installation.update({
    where: { githubId },
    data: { suspendedAt: new Date() }
  });
});

webhooks.on('installation.unsuspend', async ({ payload }) => {
  const githubId = BigInt(payload.installation.id);
  await prisma.installation.update({
    where: { githubId },
    data: { suspendedAt: null }
  });
});

webhooks.on(['pull_request.opened', 'pull_request.synchronize'], async ({ payload }) => {
  const pr = payload.pull_request;
  const ghRepo = payload.repository;
  const owner = ghRepo.owner.login;
  const repoName = ghRepo.name;
  const githubId = BigInt(ghRepo.id);
  const prNumber = pr.number;
  
  try {
    const recentReview = await prisma.review.findFirst({
      where: {
        repository: { githubId },
        prNumber,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
      }
    });

    if (recentReview) {
      console.log(`[GitHub App] Skipped duplicate review request for ${owner}/${repoName}#${prNumber}`);
      return;
    }

    const octokit = await getOctokit(payload.installation.id);

    const { data: filesData } = await octokit.rest.pulls.listFiles({
      owner,
      repo: repoName,
      pull_number: prNumber,
      per_page: 100
    });

    const files = filesData
      .filter(f => f.patch && f.status !== 'removed')
      .map(f => ({
        filename: f.filename,
        status: f.status,
        patch: f.patch,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes
      }));

    const instDb = await prisma.installation.findUnique({ where: { githubId: BigInt(payload.installation.id) } });

    const result = await processReview({
      owner,
      repoName,
      githubId: ghRepo.id,
      installationId: instDb ? instDb.id : null,
      prNumber,
      title: pr.title,
      author: pr.user.login,
      files,
      persona: 'SENIOR_ENGINEER',
      severityThreshold: 'WARNING'
    });

    await octokit.rest.checks.create({
      owner,
      repo: repoName,
      name: 'ReviewMate AI',
      head_sha: pr.head.sha,
      status: 'completed',
      conclusion: result.score >= 50 ? 'success' : 'failure',
      output: {
        title: `ReviewMate Score: ${result.score}/100`,
        summary: `**Score:** ${result.score}/100\\n**Critical Issues:** ${result.criticalCount}\\n\\n${result.reviewResult.summary}`,
        text: `View full details on the ReviewMate Dashboard.`
      },
      actions: [
        {
          label: 'View Dashboard',
          description: 'Open the ReviewMate Dashboard',
          identifier: 'view_dashboard'
        },
        {
          label: 'View Auto-Fix PR',
          description: 'Check for deterministic fixes',
          identifier: 'view_autofix'
        }
      ]
    });

  } catch (err) {
    console.error(`[GitHub App] Error processing PR: ${err.message}`);
  }
});

// Use @octokit/webhooks built-in express middleware which does constant-time signature verification
app.use('/api/webhooks/github', createNodeMiddleware(webhooks, { path: '/' }));

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`[GitHub App] Webhook listener running on port ${PORT}`);
});
