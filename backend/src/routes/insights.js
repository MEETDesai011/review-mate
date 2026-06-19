const { Router } = require('express');
const prisma = require('../services/prisma');
const { getInsights } = require('../services/insights');

const router = Router();

router.get('/:repoId', async (req, res, next) => {
  try {
    const { repoId } = req.params;

    const repo = await prisma.repository.findUnique({ where: { id: repoId } });
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
