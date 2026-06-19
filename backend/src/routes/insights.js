const { Router } = require('express');
const prisma = require('../services/prisma');
const { getInsights } = require('../services/insights');
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

    const insights = await getInsights(prisma, repoId);
    res.json(insights);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
