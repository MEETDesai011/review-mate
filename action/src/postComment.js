const PERSONA_DISPLAY = {
  SENIOR_ENGINEER: '👨‍💻 Senior Engineer',
  SECURITY_ENGINEER: '🔒 Security Engineer',
  PERFORMANCE_ENGINEER: '⚡ Performance Engineer',
  STARTUP_CTO: '🚀 Startup CTO',
};

const COVERAGE_EMOJI = {
  GOOD: '✅ Good',
  PARTIAL: '⚠️ Partial',
  MISSING: '❌ Missing',
};

const HEALTH_EMOJI = {
  POSITIVE: '🟢 Positive',
  NEUTRAL: '🟡 Neutral',
  NEGATIVE: '🔴 Negative',
};

function scoreBadge(score) {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  return '🔴';
}

function buildDeltaLine(scoreDelta) {
  if (scoreDelta === null || scoreDelta === undefined) {
    return '📝 First review for this author';
  }
  if (scoreDelta >= 0) {
    return `📈 ↑ +${scoreDelta} from previous review`;
  }
  return `📉 ↓ ${scoreDelta} from previous review`;
}

function buildCriticalSection(issues) {
  const critical = issues.filter((i) => i.severity === 'CRITICAL');
  if (critical.length === 0) return '';

  const lines = [`### 🚨 Critical Issues (${critical.length})`, ''];

  for (const issue of critical) {
    const lang = issue.fixLanguage || 'plaintext';
    lines.push(`**${issue.file}:${issue.line}** — ${issue.description}`);
    lines.push('');

    if (issue.fixSnippet) {
      lines.push('<details>');
      lines.push('<summary>View Fix</summary>');
      lines.push('');
      lines.push(`**Suggestion:** ${issue.suggestion || 'See fix below'}`);
      lines.push('');
      lines.push('```' + lang);
      lines.push(issue.fixSnippet);
      lines.push('```');
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

function buildWarningSection(issues) {
  const warnings = issues.filter((i) => i.severity === 'WARNING');
  if (warnings.length === 0) return '';

  const lines = [
    `### ⚠️ Warnings (${warnings.length})`,
    '',
    '| File | Line | Category | Description |',
    '|------|------|----------|-------------|',
  ];

  for (const w of warnings) {
    const desc = w.description.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    lines.push(`| ${w.file} | ${w.line} | ${w.category} | ${desc} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

function buildTestingSection(testingAnalysis) {
  const analysis = testingAnalysis || { coverage: 'MISSING', gaps: [], suggestions: [] };
  const coverageText = COVERAGE_EMOJI[analysis.coverage] || '⚪ Unknown';

  const lines = ['### 🧪 Testing Analysis', '', `**Coverage:** ${coverageText}`, ''];

  if (analysis.gaps && analysis.gaps.length > 0) {
    lines.push('**Gaps:**');
    for (const gap of analysis.gaps) {
      lines.push(`- ${gap}`);
    }
    lines.push('');
  }

  if (analysis.suggestions && analysis.suggestions.length > 0) {
    lines.push('**Suggestions:**');
    for (const suggestion of analysis.suggestions) {
      lines.push(`- ${suggestion}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

function buildPositivesSection(positives) {
  if (!positives || positives.length === 0) return '';

  const lines = ['### ✅ What\'s Good', ''];
  for (const p of positives) {
    lines.push(`- ${p}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

export async function postComment(
  octokit,
  owner,
  repo,
  pullNumber,
  reviewResult,
  score,
  previousScore,
  scoreDelta,
  dashboardUrl
) {
  const persona = reviewResult._persona || 'SENIOR_ENGINEER';
  const personaDisplay = PERSONA_DISPLAY[persona] || '👨‍💻 Senior Engineer';
  const healthText = HEALTH_EMOJI[reviewResult.healthImpact] || '🟡 Neutral';

  const lines = [
    '## 🔍 ReviewMate Analysis',
    '',
    `### Score: ${score}/100 ${scoreBadge(score)}`,
    buildDeltaLine(scoreDelta),
    '',
    `**Persona:** ${personaDisplay}`,
    `**Health Impact:** ${healthText}`,
    '',
    '---',
    '',
    '### 📋 Summary',
    reviewResult.summary || 'No summary available.',
    '',
    '---',
    '',
    buildCriticalSection(reviewResult.issues || []),
    buildWarningSection(reviewResult.issues || []),
    buildTestingSection(reviewResult.testingAnalysis),
    buildPositivesSection(reviewResult.positives),
    `> 📊 [View full analysis on ReviewMate Dashboard](${dashboardUrl})`,
    `> *Reviewed by ReviewMate AI • ${personaDisplay}*`,
  ];

  const body = lines.join('\n');

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
}
