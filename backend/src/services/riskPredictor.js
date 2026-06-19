const prisma = require('./prisma');

async function calculateRisk(files, issues, testCoverage, repositoryId, reviewId) {
  if (!files || files.length === 0) {
    return await prisma.riskAssessment.create({
      data: {
        touchesAuth: false,
        touchesPayments: false,
        touchesMigrations: false,
        filesChanged: 0,
        linesChanged: 0,
        hasNoNewTests: true,
        score: 0,
        level: 'LOW',
        reviewId,
      },
    });
  }

  let touchesAuth = false;
  let touchesPayments = false;
  let touchesMigrations = false;
  let linesChanged = 0;

  files.forEach((f) => {
    const filename = (f.filename || '').toLowerCase();
    
    if (filename.includes('auth') || filename.includes('login') || filename.includes('jwt') || filename.includes('passport')) {
      touchesAuth = true;
    }
    if (filename.includes('payment') || filename.includes('stripe') || filename.includes('checkout')) {
      touchesPayments = true;
    }
    if (filename.includes('migration') || filename.includes('schema') || filename.includes('prisma')) {
      touchesMigrations = true;
    }
    
    linesChanged += (f.additions || 0) + (f.deletions || 0);
  });

  const filesChanged = files.length;
  const hasNoNewTests = testCoverage.testFileCount === 0;

  let score = 0;

  if (touchesAuth) score += 20;
  if (touchesPayments) score += 25;
  if (touchesMigrations) score += 20;
  if (hasNoNewTests) score += 10;
  
  if (filesChanged > 20) score += 10;
  else if (filesChanged > 10) score += 5;
  
  if (linesChanged > 500) score += 15;
  else if (linesChanged > 200) score += 5;

  score = Math.min(100, score);

  let level = 'LOW';
  if (score >= 60) {
    level = 'HIGH';
  } else if (score >= 30) {
    level = 'MEDIUM';
  }

  const riskAssessment = await prisma.riskAssessment.create({
    data: {
      touchesAuth,
      touchesPayments,
      touchesMigrations,
      filesChanged,
      linesChanged,
      hasNoNewTests,
      score,
      level,
      reviewId,
    },
  });

  return riskAssessment;
}

module.exports = { calculateRisk };
