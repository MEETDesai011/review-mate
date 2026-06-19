const { Router } = require('express');
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const where = req.isGlobalAdmin ? {} : { installationId: req.installationId };
    const repos = await prisma.repository.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { reviews: true },
        },
        reviews: {
          select: { score: true },
        },
      },
    });

    const result = repos.map((repo) => {
      const reviewCount = repo._count.reviews;
      const avgScore =
        reviewCount > 0
          ? Math.round(
              (repo.reviews.reduce((sum, r) => sum + r.score, 0) / reviewCount) * 10
            ) / 10
          : null;

      const { reviews, _count, githubId, ...rest } = repo;
      return {
        ...rest,
        githubId: githubId.toString(),
        reviewCount,
        avgScore,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const where = req.isGlobalAdmin
      ? { id: req.params.id }
      : { id: req.params.id, installationId: req.installationId };

    const repo = await prisma.repository.findFirst({
      where,
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            _count: {
              select: { issues: true },
            },
          },
        },
        _count: {
          select: { reviews: true, healthScores: true },
        },
      },
    });

    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const { githubId, ...rest } = repo;
    res.json({
      ...rest,
      githubId: githubId.toString(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
