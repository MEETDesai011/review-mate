const SEVERITY_ORDER = { CRITICAL: 3, WARNING: 2, INFO: 1 };

function classifySeverity(issues, threshold) {
  const minLevel = SEVERITY_ORDER[threshold] || SEVERITY_ORDER.WARNING;
  return issues.filter((issue) => {
    const level = SEVERITY_ORDER[issue.severity] || 0;
    return level >= minLevel;
  });
}

function countBySeverity(issues) {
  const counts = { critical: 0, warning: 0, info: 0 };
  for (const issue of issues) {
    switch (issue.severity) {
      case 'CRITICAL':
        counts.critical++;
        break;
      case 'WARNING':
        counts.warning++;
        break;
      case 'INFO':
        counts.info++;
        break;
    }
  }
  return counts;
}

module.exports = { classifySeverity, countBySeverity };
