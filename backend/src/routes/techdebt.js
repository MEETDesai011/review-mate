const { Router } = require('express');
const { getTechDebtHistory, snapshotTechDebt } = require('../services/techDebt');
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');

const router = Router();

// Endpoint for Dashboard
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

    const history = await getTechDebtHistory(req.params.repoId);
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

// Nightly cron trigger (protected)
router.post('/snapshot', async (req, res, next) => {
  try {
    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fire and forget (or await if railway cron expects completion)
    await snapshotTechDebt();
    res.json({ message: 'Tech Debt snapshots completed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
