const prisma = require('./prisma');

async function snapshotTechDebt() {
  console.log('[ReviewMate] Starting nightly Tech Debt snapshot...');
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const repositories = await prisma.repository.findMany({
    select: { id: true }
  });

  for (const repo of repositories) {
    const recentReviews = await prisma.review.findMany({
      where: {
        repositoryId: repo.id,
        createdAt: { gte: ninetyDaysAgo }
      },
      include: {
        issues: true
      }
    });

    if (recentReviews.length === 0) continue;

    let missingTests = 0;
    let largeFunctionsCount = 0;
    let duplicateLogicCount = 0;
    let totalIssues = 0;
    let debtScore = 0;

    for (const review of recentReviews) {
      if (review.testCoverage === 'MISSING') {
        missingTests++;
      }

      for (const issue of review.issues) {
        totalIssues++;
        const desc = (issue.description || '').toLowerCase();
        
        if (desc.includes('large') || desc.includes('long') || desc.includes('complex')) {
          largeFunctionsCount++;
        }
        
        if (desc.includes('duplicate') || desc.includes('dry') || desc.includes('repeat')) {
          duplicateLogicCount++;
        }

        // Add to debt score based on severity
        if (issue.severity === 'CRITICAL') debtScore += 4;
        else if (issue.severity === 'WARNING') debtScore += 2;
        else debtScore += 0.5;
      }
    }

    const missingTestsPct = Math.round((missingTests / recentReviews.length) * 100);

    await prisma.techDebtSnapshot.create({
      data: {
        debtScore,
        missingTestsPct,
        largeFunctionsCount,
        duplicateLogicCount,
        repositoryId: repo.id,
      }
    });
  }

  console.log('[ReviewMate] Tech Debt snapshots completed.');
}

async function getTechDebtHistory(repositoryId) {
  return await prisma.techDebtSnapshot.findMany({
    where: { repositoryId },
    orderBy: { date: 'asc' },
    take: 30
  });
}

module.exports = { snapshotTechDebt, getTechDebtHistory };
