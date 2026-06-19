const { calculateScoreDelta } = require('../../src/services/scorer');

describe('calculateScoreDelta', () => {
  it('should return nulls if no previous review exists', async () => {
    const mockPrisma = {
      review: {
        findFirst: jest.fn().mockResolvedValue(null)
      }
    };

    const result = await calculateScoreDelta(mockPrisma, 'repo-id', 'john_doe', 85);
    expect(result).toEqual({ previousScore: null, scoreDelta: null });
    expect(mockPrisma.review.findFirst).toHaveBeenCalledWith({
      where: { repositoryId: 'repo-id', author: 'john_doe' },
      orderBy: { createdAt: 'desc' },
      select: { score: true }
    });
  });

  it('should calculate correct delta if a previous review exists', async () => {
    const mockPrisma = {
      review: {
        findFirst: jest.fn().mockResolvedValue({ score: 80 })
      }
    };

    const result = await calculateScoreDelta(mockPrisma, 'repo-id', 'john_doe', 85.5);
    expect(result).toEqual({ previousScore: 80, scoreDelta: 5.5 });
  });

  it('should round the delta to 1 decimal place', async () => {
    const mockPrisma = {
      review: {
        findFirst: jest.fn().mockResolvedValue({ score: 80.123 })
      }
    };

    const result = await calculateScoreDelta(mockPrisma, 'repo-id', 'john_doe', 85.789);
    expect(result.scoreDelta).toBe(5.7);
  });
});
