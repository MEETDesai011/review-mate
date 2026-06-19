const { Router } = require('express');
const prisma = require('../services/prisma');

const router = Router();

router.get('/:repoId', async (req, res, next) => {
  try {
    const { repoId } = req.params;

    const repo = await prisma.repository.findUnique({ where: { id: repoId } });
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const reviews = await prisma.review.findMany({
      where: { repositoryId: repoId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        score: true,
        createdAt: true,
        author: true,
      },
    });

    const dailyMap = {};
    for (const review of reviews) {
      const day = review.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) {
        dailyMap[day] = { totalScore: 0, count: 0 };
      }
      dailyMap[day].totalScore += review.score;
      dailyMap[day].count += 1;
    }

    const scoreHistory = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { totalScore, count }]) => ({
        date,
        avgScore: Math.round((totalScore / count) * 10) / 10,
        reviewCount: count,
      }));

    const issues = await prisma.issue.findMany({
      where: {
        review: { repositoryId: repoId },
      },
      select: {
        severity: true,
        category: true,
      },
    });

    const severityDistribution = { INFO: 0, WARNING: 0, CRITICAL: 0 };
    const categoryDistribution = { SECURITY: 0, PERFORMANCE: 0, STYLE: 0, BUG: 0, TESTING: 0 };

    for (const issue of issues) {
      severityDistribution[issue.severity] = (severityDistribution[issue.severity] || 0) + 1;
      categoryDistribution[issue.category] = (categoryDistribution[issue.category] || 0) + 1;
    }

    const totalReviews = reviews.length;
    const avgScore =
      totalReviews > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.score, 0) / totalReviews) * 10) / 10
        : 0;

    const recentReviews = reviews.slice(-10);
    const recentAvg =
      recentReviews.length > 0
        ? Math.round(
            (recentReviews.reduce((sum, r) => sum + r.score, 0) / recentReviews.length) * 10
          ) / 10
        : 0;

    const olderReviews = reviews.slice(0, Math.max(0, reviews.length - 10));
    const olderAvg =
      olderReviews.length > 0
        ? Math.round(
            (olderReviews.reduce((sum, r) => sum + r.score, 0) / olderReviews.length) * 10
          ) / 10
        : recentAvg;

    const recentTrend = Math.round((recentAvg - olderAvg) * 10) / 10;

    res.json({
      scoreHistory,
      severityDistribution,
      categoryDistribution,
      totalReviews,
      avgScore,
      recentTrend,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
