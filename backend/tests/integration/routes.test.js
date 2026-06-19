const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/services/prisma');

// Mock Prisma client methods
jest.mock('../../src/services/prisma', () => {
  const mockRepo = {
    id: 'repo-1',
    githubId: '99999',
    owner: 'MEETDesai011',
    name: 'review-mate',
    installationId: 'install-1'
  };

  const mockReview = {
    id: 'review-1',
    prNumber: 42,
    title: 'Update auth',
    author: 'MEETDesai011',
    score: 95,
    repositoryId: 'repo-1',
    repository: mockRepo
  };

  return {
    installation: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.apiKey === 'valid-key') {
          return Promise.resolve({ id: 'install-1', apiKey: 'valid-key', suspendedAt: null });
        }
        if (where.apiKey === 'suspended-key') {
          return Promise.resolve({ id: 'install-2', apiKey: 'suspended-key', suspendedAt: new Date() });
        }
        return Promise.resolve(null);
      })
    },
    repository: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'repo-1',
          githubId: BigInt(99999),
          owner: 'MEETDesai011',
          name: 'review-mate',
          installationId: 'install-1',
          _count: { reviews: 1 },
          reviews: [{ score: 95 }]
        }
      ]),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'repo-1' && (!where.installationId || where.installationId === 'install-1')) {
          return Promise.resolve({
            id: 'repo-1',
            githubId: BigInt(99999),
            owner: 'MEETDesai011',
            name: 'review-mate',
            installationId: 'install-1',
            reviews: [],
            _count: { reviews: 0, healthScores: 0 }
          });
        }
        return Promise.resolve(null);
      })
    },
    review: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'review-1' && (!where.repository || where.repository.installationId === 'install-1')) {
          return Promise.resolve(mockReview);
        }
        return Promise.resolve(null);
      })
    }
  };
});

describe('Integration Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/repos', () => {
    it('should return 401 if API key is missing', async () => {
      const res = await request(app).get('/api/repos');
      expect(res.status).toBe(401);
    });

    it('should return 401 if API key is invalid', async () => {
      const res = await request(app)
        .get('/api/repos')
        .set('x-reviewmate-api-key', 'invalid-key');
      expect(res.status).toBe(401);
    });

    it('should return 403 if installation is suspended', async () => {
      const res = await request(app)
        .get('/api/repos')
        .set('x-reviewmate-api-key', 'suspended-key');
      expect(res.status).toBe(403);
    });

    it('should return repos list if API key is valid', async () => {
      const res = await request(app)
        .get('/api/repos')
        .set('x-reviewmate-api-key', 'valid-key');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('review-mate');
      expect(prisma.repository.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { installationId: 'install-1' }
      }));
    });
  });

  describe('GET /api/reviews/:id', () => {
    it('should return review detail for authorized installations', async () => {
      const res = await request(app)
        .get('/api/reviews/review-1')
        .set('x-reviewmate-api-key', 'valid-key');
      
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('review-1');
    });

    it('should return 404/403 for unauthorized review access (tenant separation)', async () => {
      // Simulate another tenant trying to access a review that is not theirs
      // The mock installation lookup returns 'install-3' for 'tenant3-key'
      prisma.installation.findUnique.mockResolvedValueOnce({ id: 'install-3', apiKey: 'tenant3-key', suspendedAt: null });

      const res = await request(app)
        .get('/api/reviews/review-1')
        .set('x-reviewmate-api-key', 'tenant3-key');
      
      expect(res.status).toBe(404); // returns 404 if not found for that installationId
    });
  });
});
