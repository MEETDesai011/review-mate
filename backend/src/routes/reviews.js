const { Router } = require('express');
const prisma = require('../services/prisma');
const { authenticate } = require('../middleware/auth');
const { calculateScoreDelta } = require('../services/scorer');
const { processReview } = require('../services/reviewer');

const router = Router();

router.post('/analyze', authenticate, async (req, res, next) => {
  try {
    const { owner, repoName, githubId, prNumber, title, author, files, persona, severityThreshold } = req.body;
    
    if (!owner || !repoName || !githubId || !prNumber || !files) {
      return res.status(400).json({ error: 'Missing required fields for analysis' });
    }

    const result = await processReview({
      owner,
      repoName,
      githubId,
      installationId: req.installationId || null,
      prNumber,
      title,
      author,
      files,
      persona: persona || 'SENIOR_ENGINEER',
      severityThreshold: severityThreshold || 'WARNING'
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      owner,
      repoName,
      githubId,
      prNumber,
      title,
      author,
      score,
      persona,
      issues = [],
      summary,
      positives = [],
      healthImpact = 'NEUTRAL',
      testCoverage = 'MISSING',
    } = req.body;

    if (!owner || !repoName || !githubId || !prNumber || !title || !author || score == null || !persona) {
      return res.status(400).json({ error: 'Missing required fields: owner, repoName, githubId, prNumber, title, author, score, persona' });
    }

    // Verify repository ownership / prevent IDOR if repository exists
    const existingRepo = await prisma.repository.findUnique({
      where: { githubId: BigInt(githubId) }
    });

    if (existingRepo && !req.isGlobalAdmin && existingRepo.installationId && existingRepo.installationId !== req.installationId) {
      return res.status(403).json({ error: 'Unauthorized: Repository belongs to a different installation' });
    }

    const repository = await prisma.repository.upsert({
      where: { githubId: BigInt(githubId) },
      create: {
        githubId: BigInt(githubId),
        owner,
        name: repoName,
        installationId: req.installationId || null,
      },
      update: {
        owner,
        name: repoName,
        ...(req.installationId ? { installationId: req.installationId } : {}),
      },
    });

    const { previousScore, scoreDelta } = await calculateScoreDelta(
      prisma,
      repository.id,
      author,
      score
    );

    const review = await prisma.review.upsert({
      where: {
        repositoryId_prNumber: {
          repositoryId: repository.id,
          prNumber,
        },
      },
      create: {
        prNumber,
        title,
        author,
        score,
        previousScore,
        scoreDelta,
        persona,
        summary,
        positives,
        healthImpact,
        testCoverage,
        repositoryId: repository.id,
        issues: {
          create: issues.map((issue) => ({
            filePath: issue.filePath || 'unknown',
            lineNumber: issue.lineNumber || 0,
            severity: issue.severity || 'INFO',
            category: issue.category || 'STYLE',
            description: issue.description || '',
            suggestion: issue.suggestion || null,
            fixSnippet: issue.fixSnippet || null,
            fixLanguage: issue.fixLanguage || null,
          })),
        },
      },
      update: {
        title,
        author,
        score,
        previousScore,
        scoreDelta,
        persona,
        summary,
        positives,
        healthImpact,
        testCoverage,
      },
    });

    await prisma.healthScore.create({
      data: {
        score,
        repositoryId: repository.id,
      },
    });

    res.status(201).json({
      reviewId: review.id,
      score: review.score,
      previousScore: review.previousScore,
      scoreDelta: review.scoreDelta,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const review = await prisma.review.findFirst({
      where: {
        id: req.params.id,
        ...(req.isGlobalAdmin ? {} : { repository: { installationId: req.installationId } })
      },
      include: {
        issues: true,
        riskAssessment: true,
        autoFixPR: true,
        repository: {
          select: { owner: true, name: true, id: true, installationId: true },
        },
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
