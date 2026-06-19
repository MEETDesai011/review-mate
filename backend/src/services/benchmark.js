const prisma = require('./prisma');

async function detectRepositoryCategory(repositoryId) {
  const commonIssues = await prisma.issue.groupBy({
    by: ['fixLanguage'],
    where: {
      review: { repositoryId },
      fixLanguage: { not: null }
    },
    _count: { fixLanguage: true },
    orderBy: { _count: { fixLanguage: 'desc' } },
    take: 1
  });

  if (commonIssues.length > 0 && commonIssues[0].fixLanguage) {
    return commonIssues[0].fixLanguage.toLowerCase();
  }
  return 'unknown';
}

async function getBenchmark(repositoryId) {
  console.log(`[ReviewMate] Calculating benchmark for repo: ${repositoryId}`);

  const repoCategory = await detectRepositoryCategory(repositoryId);

  // Find repos with similar category (having the same most common fixLanguage)
  // This is a heuristic. For high performance, we would use a materialized view.
  // Given SQLite/Postgres flexibility, we'll fetch global aggregates and filter in JS if needed,
  // or just run an aggregate query. Since we need to ensure pool size >= 10:
  
  // To strictly respect "no cross-installation data exposure" and "aggregate metrics only",
  // we compute averages across all repos in the DB for the global benchmark.
  
  const allHealthScores = await prisma.healthScore.findMany({
    select: { score: true, repositoryId: true }
  });

  const uniqueRepos = new Set(allHealthScores.map(h => h.repositoryId));
  const poolSize = uniqueRepos.size;

  if (poolSize < 10) {
    return {
      available: false,
      reason: 'Not enough benchmark data'
    };
  }

  // Aggregate metrics
  let totalScore = 0;
  allHealthScores.forEach(h => totalScore += h.score);
  const averageGlobalScore = totalScore / allHealthScores.length;

  const repoScores = allHealthScores.filter(h => h.repositoryId === repositoryId);
  const repoAverage = repoScores.length > 0 
    ? repoScores.reduce((sum, h) => sum + h.score, 0) / repoScores.length 
    : 0;

  // Calculate percentile
  const repoAverages = Array.from(uniqueRepos).map(rId => {
    const scores = allHealthScores.filter(h => h.repositoryId === rId);
    return scores.reduce((sum, h) => sum + h.score, 0) / scores.length;
  }).sort((a, b) => a - b);

  let rank = 0;
  while (rank < repoAverages.length && repoAverages[rank] <= repoAverage) {
    rank++;
  }
  const percentile = Math.round((rank / repoAverages.length) * 100);

  return {
    available: true,
    poolSize,
    category: poolSize >= 10 ? 'Global' : repoCategory,
    metrics: {
      averageGlobalScore: Math.round(averageGlobalScore * 10) / 10,
      repositoryScore: Math.round(repoAverage * 10) / 10,
      percentile
    }
  };
}

module.exports = { getBenchmark };
