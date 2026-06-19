export function calculateHealthScore(reviewResult) {
  let score = reviewResult.overallScore ?? 100;

  if (reviewResult.testingAnalysis?.coverage === 'MISSING') {
    score -= 5;
  }

  const criticalCount = (reviewResult.issues || []).filter(
    (i) => i.severity === 'CRITICAL'
  ).length;

  if (criticalCount > 3) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
