const { Router } = require('express');
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/:repoId', authenticate, async (req, res, next) => {
  try {
    const { repoId } = req.params;

    const repo = await prisma.repository.findFirst({
      where: {
        id: repoId,
        ...(req.isGlobalAdmin ? {} : { installationId: req.installationId }),
      },
    });
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const releaseNotes = await prisma.releaseNote.findMany({
      where: { repositoryId: repoId },
      orderBy: { mergedAt: 'desc' },
    });

    res.json(releaseNotes);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { owner, repoName, githubId, prNumber, title, author, content } = req.body;

    if (!owner || !repoName || !githubId || !prNumber || !title || !author || !content) {
      return res.status(400).json({
        error: 'Missing required fields: owner, repoName, githubId, prNumber, title, author, content',
      });
    }

    // Verify repository ownership / prevent IDOR if repository exists
    const existingRepo = await prisma.repository.findUnique({
      where: { githubId: BigInt(githubId) }
    });

    if (existingRepo && !req.isGlobalAdmin && existingRepo.installationId && existingRepo.installationId !== req.installationId) {
      return res.status(403).json({ error: 'Unauthorized: Repository belongs to a different installation' });
    }

    const repository = await prisma.repository.upsert({
      where: { githubId: BigInt(githubId) },
      create: {
        githubId: BigInt(githubId),
        owner,
        name: repoName,
        installationId: req.installationId || null,
      },
      update: {
        owner,
        name: repoName,
        ...(req.installationId ? { installationId: req.installationId } : {}),
      },
    });

    const releaseNote = await prisma.releaseNote.upsert({
      where: {
        repositoryId_prNumber: {
          repositoryId: repository.id,
          prNumber,
        },
      },
      create: {
        prNumber,
        title,
        author,
        content,
        repositoryId: repository.id,
      },
      update: {
        title,
        author,
        content,
      },
    });

    const { ...rest } = releaseNote;
    res.status(201).json(rest);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
