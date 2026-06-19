const TEST_PATTERNS = [
  /\.test\./i,
  /\.spec\./i,
  /\/__tests__\//i,
  /\/test\//i,
  /\.tests\./i,
  /\.specs\./i,
  /\/tests\//i,
];

function isTestFile(filename) {
  return TEST_PATTERNS.some((pattern) => pattern.test(filename));
}

function analyzeTestCoverage(files, reviewResult) {
  const testFiles = files.filter((f) => isTestFile(f.filename));
  const sourceFiles = files.filter((f) => !isTestFile(f.filename));

  const testFileCount = testFiles.length;
  const sourceFileCount = sourceFiles.length;
  const ratio = sourceFileCount > 0 ? testFileCount / sourceFileCount : 0;

  const analysis = reviewResult?.testingAnalysis || {
    coverage: 'MISSING',
    gaps: [],
    suggestions: [],
  };

  return {
    hasTestFiles: testFileCount > 0,
    testFileCount,
    sourceFileCount,
    ratio: Math.round(ratio * 100) / 100,
    analysis,
  };
}

module.exports = { analyzeTestCoverage };
