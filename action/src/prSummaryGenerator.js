const HEALTH_EMOJI = {
  POSITIVE: '🟢 Positive',
  NEUTRAL: '🟡 Neutral',
  NEGATIVE: '🔴 Negative',
};

export function generatePRSummary(reviewResult, files) {
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);
  const fileCount = files.length;
  const healthText = HEALTH_EMOJI[reviewResult.healthImpact] || '⚪ Unknown';

  const lines = [
    `### 📊 PR Summary`,
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Files Changed | ${fileCount} |`,
    `| Lines Added | +${totalAdditions} |`,
    `| Lines Removed | -${totalDeletions} |`,
    `| Net Change | ${totalAdditions - totalDeletions >= 0 ? '+' : ''}${totalAdditions - totalDeletions} |`,
    `| Health Impact | ${healthText} |`,
    '',
    `#### AI Summary`,
    reviewResult.summary || 'No summary available.',
    '',
  ];

  return lines.join('\n');
}
