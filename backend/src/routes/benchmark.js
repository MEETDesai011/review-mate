const { Router } = require('express');
const { getBenchmark } = require('../services/benchmark');
const { authenticate } = require('../middleware/auth');
const prisma = require('../services/prisma');

const router = Router();

router.get('/:repoId', authenticate, async (req, res, next) => {
  try {
    const repo = await prisma.repository.findFirst({
      where: {
        id: req.params.repoId,
        ...(req.isGlobalAdmin ? {} : { installationId: req.installationId }),
      },
    });
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const benchmark = await getBenchmark(req.params.repoId);
    res.json(benchmark);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
