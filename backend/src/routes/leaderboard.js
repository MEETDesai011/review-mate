const { Router } = require('express');
const prisma = require('../services/prisma');
const { getLeaderboard } = require('../services/leaderboard');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { repoId, timeRange = '30d' } = req.query;

    if (!repoId) {
      return res.status(400).json({ error: 'repoId query parameter is required' });
    }

    const validRanges = ['7d', '30d', 'all'];
    const range = validRanges.includes(timeRange) ? timeRange : '30d';

    const repo = await prisma.repository.findFirst({
      where: {
        id: repoId,
        ...(req.isGlobalAdmin ? {} : { installationId: req.installationId }),
      },
    });
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const leaderboard = await getLeaderboard(prisma, repoId, range);

    res.json({
      repoId,
      timeRange: range,
      ...leaderboard,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
