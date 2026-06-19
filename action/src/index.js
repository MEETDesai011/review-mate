import * as core from '@actions/core';
import * as github from '@actions/github';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDiff } from './getDiff.js';
import { reviewWithGemini } from './reviewWithGemini.js';
import { generateAutoFixes } from './autoFixGenerator.js';
import { classifySeverity, countBySeverity } from './severityClassifier.js';
import { analyzeTestCoverage } from './testCoverageAnalyzer.js';
import { calculateHealthScore } from './healthScorer.js';
import { submitReview, submitReleaseNotes } from './dbClient.js';
import { postComment } from './postComment.js';
import { generateReleaseNotes } from './releaseNotesGenerator.js';
import { notify } from './notifier.js';

async function run() {
  try {
    const geminiApiKey = core.getInput('gemini-api-key', { required: true });
    const reviewmateApiKey = core.getInput('reviewmate-api-key', { required: true });
    const reviewmateApiUrl = core.getInput('reviewmate-api-url');
    const maxFiles = parseInt(core.getInput('max-files') || '20', 10);
    const severityThreshold = core.getInput('severity-threshold') || 'WARNING';
    const reviewerPersona = core.getInput('reviewer-persona') || 'SENIOR_ENGINEER';
    const slackWebhookUrl = core.getInput('slack-webhook-url') || '';
    const discordWebhookUrl = core.getInput('discord-webhook-url') || '';
    const generateReleaseNotesFlag = core.getInput('generate-release-notes') !== 'false';

    const context = github.context;
    const payload = context.payload;

    if (!payload.pull_request) {
      core.info('Not a pull request event — skipping ReviewMate analysis.');
      return;
    }

    const pr = payload.pull_request;
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const pullNumber = pr.number;
    const prTitle = pr.title || '';
    const prBody = pr.body || '';
    const prAuthor = pr.user?.login || 'unknown';
    const prUrl = pr.html_url || '';
    const isMerged = pr.merged === true;

    const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
    const octokit = github.getOctokit(token);

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    core.info(`[ReviewMate] Analyzing PR #${pullNumber}: ${prTitle}`);
    core.info(`[ReviewMate] Persona: ${reviewerPersona} | Threshold: ${severityThreshold}`);

    const files = await getDiff(octokit, owner, repo, pullNumber);
    core.info(`[ReviewMate] Found ${files.length} changed files`);

    const effectiveMax = Math.min(maxFiles, 50);
    if (files.length > effectiveMax) {
      core.warning(`PR has ${files.length} files, exceeding limit of ${effectiveMax}. Skipping AI review.`);
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body: `## 🔍 ReviewMate Analysis\n\n⚠️ **PR too large for AI review** (${files.length} files, limit ${effectiveMax}).\n\nPlease break this PR into smaller, focused changes for a thorough review.\n\n> *ReviewMate AI*`,
      });
      core.setOutput('review-score', '100');
      core.setOutput('score-delta', '0');
      core.setOutput('critical-count', '0');
      return;
    }

    if (files.length === 0) {
      core.info('[ReviewMate] No reviewable files found. Skipping.');
      core.setOutput('review-score', '100');
      core.setOutput('score-delta', '0');
      core.setOutput('critical-count', '0');
      return;
    }

    core.info('[ReviewMate] Sending files to backend for identical review pipeline...');
    
    const analyzePayload = {
      owner,
      repoName: repo,
      githubId: context.payload.repository.id.toString(),
      prNumber: pullNumber,
      title: prTitle,
      author: prAuthor,
      files,
      persona: reviewerPersona,
      severityThreshold
    };

    let backendResult = null;
    let reviewResult = null;
    let healthScore = 100;
    let previousScore = null;
    let scoreDelta = null;
    let severityCounts = { critical: 0, warning: 0, info: 0 };

    try {
      const response = await fetch(`${reviewmateApiUrl}/api/reviews/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${reviewmateApiKey}`
        },
        body: JSON.stringify(analyzePayload)
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${await response.text()}`);
      }

      backendResult = await response.json();
      reviewResult = backendResult.reviewResult;
      healthScore = backendResult.score;
      previousScore = backendResult.previousScore;
      scoreDelta = backendResult.scoreDelta;
      severityCounts = backendResult.severityCounts;
      reviewResult._persona = reviewerPersona;

      core.info(`[ReviewMate] Backend response — reviewId: ${backendResult.reviewId}, delta: ${scoreDelta}`);
    } catch (apiErr) {
      core.warning(`[ReviewMate] Backend unreachable or failed: ${apiErr.message} — proceeding without AI review.`);
      // Fallback
      reviewResult = {
        summary: 'Unable to complete AI review via backend. The code has not been blocked.',
        overallScore: 100,
        issues: [],
        testingAnalysis: { coverage: 'MISSING', gaps: [], suggestions: [] },
        positives: ['Review could not be completed.'],
        healthImpact: 'NEUTRAL',
        _persona: reviewerPersona
      };
    }

    const dashboardUrl = `${reviewmateApiUrl}/dashboard/${owner}/${repo}/${pullNumber}`;

    await postComment(
      octokit,
      owner,
      repo,
      pullNumber,
      reviewResult,
      healthScore,
      previousScore,
      scoreDelta,
      dashboardUrl
    );
    core.info('[ReviewMate] Posted review comment on PR');

    if (generateReleaseNotesFlag && isMerged) {
      core.info('[ReviewMate] Generating release notes for merged PR...');
      const releaseNotes = await generateReleaseNotes(genAI, prTitle, prBody, files);
      await submitReleaseNotes(reviewmateApiUrl, reviewmateApiKey, {
        owner,
        repoName: repo,
        prNumber: pullNumber,
        title: prTitle,
        author: prAuthor,
        releaseNotes,
      });
      core.info('[ReviewMate] Release notes submitted');
    }

    await notify(
      { slackWebhookUrl, discordWebhookUrl },
      {
        prTitle,
        prNumber: pullNumber,
        prUrl,
        repo: `${owner}/${repo}`,
        score: healthScore,
        scoreDelta,
        criticalCount: severityCounts.critical,
        persona: reviewerPersona,
        dashboardUrl,
      }
    );

    core.setOutput('review-score', String(healthScore));
    core.setOutput('score-delta', String(scoreDelta ?? 0));
    core.setOutput('critical-count', String(severityCounts.critical));

    core.info(`[ReviewMate] ✅ Analysis complete — Score: ${healthScore}/100`);
  } catch (err) {
    core.error(`[ReviewMate] Fatal error: ${err.message}`);
    core.error(err.stack || '');

    try {
      const context = github.context;
      const payload = context.payload;
      if (payload.pull_request) {
        const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
        const octokit = github.getOctokit(token);
        await octokit.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: payload.pull_request.number,
          body: `## 🔍 ReviewMate Analysis\n\n⚠️ **ReviewMate encountered an error during analysis.** The PR has not been blocked.\n\nPlease check the Action logs for details.\n\n> *ReviewMate AI*`,
        });
      }
    } catch (commentErr) {
      core.warning(`[ReviewMate] Could not post fallback comment: ${commentErr.message}`);
    }

    core.setOutput('review-score', '100');
    core.setOutput('score-delta', '0');
    core.setOutput('critical-count', '0');
  }
}

run();
