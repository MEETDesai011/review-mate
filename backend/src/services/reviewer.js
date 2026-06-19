const { GoogleGenerativeAI } = require('@google/generative-ai');
const prisma = require('./prisma');
const { calculateScoreDelta } = require('./scorer');
const { sendNotifications } = require('./notifier');
// Assume these exist in action/ but need to be copied/moved to backend or recreated:
// We will create severityClassifier.js, testCoverageAnalyzer.js, healthScorer.js, riskPredictor.js
const { classifySeverity, countBySeverity } = require('./severityClassifier');
const { analyzeTestCoverage } = require('./testCoverageAnalyzer');
const { calculateHealthScore } = require('./healthScorer');
const { calculateRisk } = require('./riskPredictor');

const PERSONA_CONTEXT = {
  SENIOR_ENGINEER: {
    role: 'a Senior Staff Engineer with 15+ years of experience',
    tone: 'Think methodically. You care deeply about clean architecture, SOLID principles, and maintainability. You\'ve seen too many codebases rot from shortcuts. Be thorough but constructive — you mentor, not lecture.',
    focus: ['code organization', 'naming conventions', 'error handling', 'separation of concerns', 'DRY violations', 'dead code', 'API design'],
  },
  SECURITY_ENGINEER: {
    role: 'a Principal Security Engineer specializing in application security',
    tone: 'Think like an attacker. Every input is hostile, every boundary is a potential breach point. You\'ve done pentesting for Fortune 500 companies. Be precise about vulnerability classifications and remediation urgency.',
    focus: ['injection vulnerabilities', 'authentication flaws', 'hardcoded secrets', 'insecure dependencies', 'XSS/CSRF', 'data exposure', 'cryptographic weaknesses'],
  },
  PERFORMANCE_ENGINEER: {
    role: 'a Performance Engineering Lead who has optimized systems serving millions of requests',
    tone: 'Think in terms of throughput, latency percentiles, and resource utilization. You profile before you optimize. Be data-driven — cite complexity classes, memory patterns, and concurrency implications.',
    focus: ['algorithmic complexity', 'memory leaks', 'unnecessary allocations', 'N+1 queries', 'blocking operations', 'cache opportunities', 'bundle size impact'],
  },
  STARTUP_CTO: {
    role: 'a pragmatic Startup CTO who has shipped 4 products from zero to scale',
    tone: 'Think about velocity and pragmatic trade-offs. Perfect is the enemy of shipped. Flag genuine risks but don\'t nitpick style. You value readable code over clever code, and working software over architectural purity.',
    focus: ['shipping blockers', 'over-engineering', 'missing error handling for users', 'unclear logic', 'tech debt worth taking', 'quick wins'],
  },
};

function buildPrompt(persona, files, prTitle, prBody) {
  const ctx = PERSONA_CONTEXT[persona] || PERSONA_CONTEXT.SENIOR_ENGINEER;

  const diffContent = files
    .map((f) => `--- ${f.filename} (${f.status}) ---\n${f.patch}`)
    .join('\n\n');

  return `You are ${ctx.role}.

${ctx.tone}

Your focus areas: ${ctx.focus.join(', ')}.

You are reviewing a Pull Request. Analyze the code changes below and produce a structured review.

**PR Title:** ${prTitle || 'Untitled PR'}
**PR Description:** ${prBody || 'No description provided.'}

**Code Changes:**
\`\`\`diff
${diffContent}
\`\`\`

Respond with STRICT JSON matching this exact schema — no markdown, no commentary outside the JSON:

{
  "summary": "2-3 sentence PR summary describing what the changes do and their impact",
  "overallScore": <number 0-100>,
  "issues": [
    {
      "severity": "CRITICAL|WARNING|INFO",
      "category": "SECURITY|PERFORMANCE|STYLE|BUG|TESTING",
      "file": "path/to/file",
      "line": <number>,
      "description": "What the problem is",
      "suggestion": "What to do instead",
      "fixSnippet": "actual corrected code",
      "fixLanguage": "javascript"
    }
  ],
  "testingAnalysis": {
    "coverage": "GOOD|PARTIAL|MISSING",
    "gaps": ["description of untested scenarios"],
    "suggestions": ["specific test suggestions"]
  },
  "positives": ["things done well"],
  "healthImpact": "POSITIVE|NEUTRAL|NEGATIVE"
}

Rules:
- overallScore: 90-100 = excellent, 70-89 = good, 50-69 = needs work, <50 = significant issues
- Only report real issues you are confident about. Do not fabricate problems.
- Each issue must reference a specific file and line number from the diff.
- fixSnippet should contain the corrected code, not the broken code.
- fixLanguage should match the file's language.
- positives: list at least 1 thing done well, even in poor code.
- If there are no issues, return an empty issues array — do not invent problems.`;
}

function buildFallback() {
  return {
    summary: 'Unable to generate AI review. The code has not been blocked.',
    overallScore: 100,
    issues: [],
    testingAnalysis: { coverage: 'MISSING', gaps: [], suggestions: [] },
    positives: ['Review could not be completed — no issues flagged.'],
    healthImpact: 'NEUTRAL',
  };
}

function validateResult(result) {
  if (typeof result.summary !== 'string') return false;
  if (typeof result.overallScore !== 'number') return false;
  if (!Array.isArray(result.issues)) return false;
  return true;
}

let genAI = null;
function getGenAI() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

async function runGeminiReview(files, persona, prTitle, prBody) {
  if (!files || files.length === 0) {
    return buildFallback();
  }

  const prompt = buildPrompt(persona, files, prTitle, prBody);

  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const latency = Date.now() - startTime;
    console.log(`[ReviewMate] Gemini latency: ${latency}ms`);

    const response = result.response;
    const text = response.text();

    let cleanText = text.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanText);

    if (!validateResult(parsed)) {
      console.error('[ReviewMate] Gemini response failed validation, using fallback');
      return buildFallback();
    }

    parsed.overallScore = Math.max(0, Math.min(100, Math.round(parsed.overallScore)));
    parsed.issues = parsed.issues || [];
    parsed.testingAnalysis = parsed.testingAnalysis || { coverage: 'MISSING', gaps: [], suggestions: [] };
    parsed.positives = parsed.positives || [];
    parsed.healthImpact = parsed.healthImpact || 'NEUTRAL';

    return parsed;
  } catch (err) {
    console.error(`[ReviewMate] Gemini review failed: ${err.message}`);
    return buildFallback();
  }
}

/**
 * Shared Review Pipeline
 */
async function processReview({
  owner,
  repoName,
  githubId,
  installationId,
  prNumber,
  title,
  author,
  files,
  persona = 'SENIOR_ENGINEER',
  severityThreshold = 'WARNING',
}) {
  const repository = await prisma.repository.upsert({
    where: { githubId: BigInt(githubId) },
    create: {
      githubId: BigInt(githubId),
      owner,
      name: repoName,
      installationId: installationId || null,
    },
    update: {
      owner,
      name: repoName,
      installationId: installationId || null,
    },
  });

  const reviewResult = await runGeminiReview(files, persona, title, '');

  const testCoverage = analyzeTestCoverage(files, reviewResult);
  const healthScore = calculateHealthScore(reviewResult);
  
  const augmentedIssues = reviewResult.issues.map((issue) => {
    if (!issue.fixLanguage && issue.file) {
      const ext = issue.file.split('.').pop();
      issue.fixLanguage = ext;
    }
    return issue;
  });

  const finalIssues = classifySeverity(augmentedIssues, severityThreshold);
  const severityCounts = countBySeverity(finalIssues);

  const { previousScore, scoreDelta } = await calculateScoreDelta(
    prisma,
    repository.id,
    author,
    healthScore
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
      score: healthScore,
      previousScore,
      scoreDelta,
      persona,
      summary: reviewResult.summary,
      positives: reviewResult.positives,
      healthImpact: reviewResult.healthImpact,
      testCoverage: testCoverage.coverage || 'MISSING',
      repositoryId: repository.id,
      issues: {
        create: finalIssues.map((issue) => ({
          filePath: issue.file || 'unknown',
          lineNumber: issue.line || 0,
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
      score: healthScore,
      previousScore,
      scoreDelta,
      persona,
      summary: reviewResult.summary,
      positives: reviewResult.positives,
      healthImpact: reviewResult.healthImpact,
      testCoverage: testCoverage.coverage || 'MISSING',
      issues: {
        deleteMany: {},
        create: finalIssues.map((issue) => ({
          filePath: issue.file || 'unknown',
          lineNumber: issue.line || 0,
          severity: issue.severity || 'INFO',
          category: issue.category || 'STYLE',
          description: issue.description || '',
          suggestion: issue.suggestion || null,
          fixSnippet: issue.fixSnippet || null,
          fixLanguage: issue.fixLanguage || null,
        })),
      },
    },
    include: {
      issues: true,
    },
  });

  const risk = await calculateRisk(files, finalIssues, testCoverage, repository.id, review.id);

  await prisma.healthScore.create({
    data: {
      score: healthScore,
      repositoryId: repository.id,
    },
  });

  console.log(`[ReviewMate] Review created for ${owner}/${repoName}#${prNumber}. Installation: ${installationId || 'None'}`);

  return {
    reviewId: review.id,
    score: healthScore,
    previousScore,
    scoreDelta,
    criticalCount: severityCounts.critical,
    reviewResult,
    testCoverage,
    severityCounts,
    finalIssues: review.issues,
    riskLevel: risk.level,
  };
}

module.exports = {
  processReview,
  runGeminiReview,
};
