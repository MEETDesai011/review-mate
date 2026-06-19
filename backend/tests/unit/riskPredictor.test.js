const prisma = require('../../src/services/prisma');
const { calculateRisk } = require('../../src/services/riskPredictor');

jest.mock('../../src/services/prisma', () => ({
  riskAssessment: {
    create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'mock-id', ...data }))
  }
}));

describe('calculateRisk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return low risk for empty changes', async () => {
    const risk = await calculateRisk([], [], { testFileCount: 0 }, 'repo-id', 'review-id');
    expect(risk.level).toBe('LOW');
    expect(risk.score).toBe(0);
    expect(prisma.riskAssessment.create).toHaveBeenCalled();
  });

  it('should calculate risk correctly based on code impact', async () => {
    const files = [
      { filename: 'src/auth/login.js', additions: 100, deletions: 50 }, // Auth touches + lines
      { filename: 'prisma/schema.prisma', additions: 5, deletions: 2 }   // Migration/Schema touches
    ];
    
    // Auth: 20
    // Migration: 20
    // No tests: 10
    // Files changed <= 10: 0
    // Lines changed = 157 (<=200): 0
    // Total score: 50 => MEDIUM
    const risk = await calculateRisk(files, [], { testFileCount: 0 }, 'repo-id', 'review-id');
    expect(risk.touchesAuth).toBe(true);
    expect(risk.touchesMigrations).toBe(true);
    expect(risk.touchesPayments).toBe(false);
    expect(risk.level).toBe('MEDIUM');
    expect(risk.score).toBe(50);
  });

  it('should trigger high risk with large changes and payment files', async () => {
    const files = [
      { filename: 'src/stripe/checkout.js', additions: 300, deletions: 200 } // Payment: 25
    ];
    
    // Payment: 25
    // No tests: 10
    // Lines changed = 500 (<= 500, wait linesChanged > 500 is 15, linesChanged > 200 is 5): 5
    // Total score: 40 => MEDIUM
    const risk1 = await calculateRisk(files, [], { testFileCount: 0 }, 'repo-id', 'review-id');
    expect(risk1.level).toBe('MEDIUM');

    const filesLarge = [
      { filename: 'src/stripe/checkout.js', additions: 400, deletions: 200 }, // Payment: 25
      { filename: 'src/auth/login.js', additions: 50, deletions: 50 }          // Auth: 20
    ];
    // Payment: 25
    // Auth: 20
    // No tests: 10
    // Lines changed = 700 (> 500): 15
    // Total score: 70 => HIGH
    const risk2 = await calculateRisk(filesLarge, [], { testFileCount: 0 }, 'repo-id', 'review-id');
    expect(risk2.level).toBe('HIGH');
  });
});
