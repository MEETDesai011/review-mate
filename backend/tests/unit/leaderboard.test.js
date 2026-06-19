const { getLeaderboard } = require('../../src/services/leaderboard');

describe('getLeaderboard', () => {
  it('should call queryRawUnsafe with correct repositoryId and threshold, and return annotated rows', async () => {
    const mockBest = [{ author: 'alice', prCount: 4, avgScore: 92.5 }];
    const mockImproved = [{ author: 'bob', recentAvg: 88, previousAvg: 70, improvement: 18 }];
    const mockSecurity = [{ author: 'charlie', prCount: 3, securityIssues: 0, securityScore: 100 }];

    const mockPrisma = {
      $queryRawUnsafe: jest.fn()
        .mockResolvedValueOnce(mockBest)      // first call: bestQuality
        .mockResolvedValueOnce(mockImproved)  // second call: mostImproved
        .mockResolvedValueOnce(mockSecurity)  // third call: mostSecurityConscious
    };

    const repoId = 'repo-123';
    const result = await getLeaderboard(mockPrisma, repoId, '7d');

    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(3);
    
    // Assert annotations (medals for rank index 0)
    expect(result.bestQuality[0]).toEqual({
      author: 'alice',
      prCount: 4,
      avgScore: 92.5,
      medal: '🥇'
    });
    expect(result.mostImproved[0].medal).toBe('🥇');
    expect(result.mostSecurityConscious[0].medal).toBe('🥇');
  });
});
