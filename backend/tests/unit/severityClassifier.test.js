const { classifySeverity, countBySeverity } = require('../../src/services/severityClassifier');

describe('severityClassifier', () => {
  const mockIssues = [
    { severity: 'CRITICAL', description: 'SQL Injection' },
    { severity: 'WARNING', description: 'Deprecated API' },
    { severity: 'INFO', description: 'Typo' }
  ];

  describe('classifySeverity', () => {
    it('should show all issues when threshold is INFO', () => {
      const result = classifySeverity(mockIssues, 'INFO');
      expect(result).toHaveLength(3);
    });

    it('should filter out INFO issues when threshold is WARNING', () => {
      const result = classifySeverity(mockIssues, 'WARNING');
      expect(result).toHaveLength(2);
      expect(result.some(i => i.severity === 'INFO')).toBe(false);
    });

    it('should show only CRITICAL issues when threshold is CRITICAL', () => {
      const result = classifySeverity(mockIssues, 'CRITICAL');
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe('CRITICAL');
    });

    it('should default to WARNING if threshold is invalid', () => {
      const result = classifySeverity(mockIssues, 'INVALID');
      expect(result).toHaveLength(2);
    });
  });

  describe('countBySeverity', () => {
    it('should count critical, warning, and info issues correctly', () => {
      const counts = countBySeverity([
        { severity: 'CRITICAL' },
        { severity: 'CRITICAL' },
        { severity: 'WARNING' },
        { severity: 'INFO' },
        { severity: 'UNKNOWN' }
      ]);
      expect(counts).toEqual({ critical: 2, warning: 1, info: 1 });
    });
  });
});
