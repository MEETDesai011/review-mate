const MEDALS = ['🥇', '🥈', '🥉'];

function getDateThreshold(timeRange) {
  const now = new Date();
  if (timeRange === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (timeRange === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return new Date('2000-01-01');
}

function annotateMedals(rows) {
  return rows.map((row, i) => ({
    ...row,
    medal: MEDALS[i] || null,
  }));
}

async function getLeaderboard(prisma, repoId, timeRange = '30d') {
  const since = getDateThreshold(timeRange);

  const bestQuality = await prisma.$queryRawUnsafe(
    `SELECT author, COUNT(*)::int AS "prCount", ROUND(AVG(score)::numeric, 1) AS "avgScore"
     FROM "Review"
     WHERE "repositoryId" = $1 AND "createdAt" >= $2
     GROUP BY author
     HAVING COUNT(*) >= 3
     ORDER BY "avgScore" DESC
     LIMIT 10`,
    repoId,
    since
  );

  const mostImproved = await prisma.$queryRawUnsafe(
    `WITH ranked AS (
       SELECT author, score, ROW_NUMBER() OVER (PARTITION BY author ORDER BY "createdAt" DESC) as rn,
       COUNT(*) OVER (PARTITION BY author) as total
       FROM "Review" WHERE "repositoryId" = $1 AND "createdAt" >= $2
     )
     SELECT author,
       ROUND(AVG(CASE WHEN rn <= 5 THEN score END)::numeric, 1) AS "recentAvg",
       ROUND(AVG(CASE WHEN rn > 5 AND rn <= 10 THEN score END)::numeric, 1) AS "previousAvg",
       ROUND((AVG(CASE WHEN rn <= 5 THEN score END) - COALESCE(AVG(CASE WHEN rn > 5 AND rn <= 10 THEN score END), AVG(CASE WHEN rn <= 5 THEN score END)))::numeric, 1) AS "improvement"
     FROM ranked WHERE total >= 2
     GROUP BY author
     ORDER BY "improvement" DESC
     LIMIT 10`,
    repoId,
    since
  );

  const mostSecurityConscious = await prisma.$queryRawUnsafe(
    `SELECT r.author, COUNT(DISTINCT r.id)::int AS "prCount",
       COUNT(DISTINCT CASE WHEN i.category = 'SECURITY' AND i.severity IN ('CRITICAL','WARNING') THEN i.id END)::int AS "securityIssues",
       ROUND((100 - (COUNT(DISTINCT CASE WHEN i.category = 'SECURITY' AND i.severity IN ('CRITICAL','WARNING') THEN i.id END)::float / GREATEST(COUNT(DISTINCT r.id), 1) * 10))::numeric, 1) AS "securityScore"
     FROM "Review" r LEFT JOIN "Issue" i ON i."reviewId" = r.id
     WHERE r."repositoryId" = $1 AND r."createdAt" >= $2
     GROUP BY r.author HAVING COUNT(DISTINCT r.id) >= 2
     ORDER BY "securityScore" DESC
     LIMIT 10`,
    repoId,
    since
  );

  return {
    bestQuality: annotateMedals(bestQuality),
    mostImproved: annotateMedals(mostImproved),
    mostSecurityConscious: annotateMedals(mostSecurityConscious),
  };
}

module.exports = { getLeaderboard };
