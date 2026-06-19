async function sendNotifications({
  slackWebhookUrl,
  discordWebhookUrl,
  prTitle,
  repoName,
  score,
  scoreDelta,
  criticalCount,
  author,
  prNumber,
  dashboardUrl,
}) {
  const scoreEmoji = score >= 90 ? '🟢' : score >= 70 ? '🟡' : score >= 50 ? '🟠' : '🔴';
  const deltaText = scoreDelta != null
    ? (scoreDelta >= 0 ? `+${scoreDelta}` : `${scoreDelta}`)
    : 'N/A';

  if (slackWebhookUrl) {
    try {
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${scoreEmoji} ReviewMate: PR #${prNumber} Reviewed`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Repository:*\n${repoName}` },
            { type: 'mrkdwn', text: `*Author:*\n${author}` },
            { type: 'mrkdwn', text: `*Score:*\n${score}/100 (${deltaText})` },
            { type: 'mrkdwn', text: `*Critical Issues:*\n${criticalCount}` },
            { type: 'mrkdwn', text: `*PR Title:*\n${prTitle}` },
          ],
        },
      ];

      if (dashboardUrl) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `<${dashboardUrl}|View Dashboard>`,
          },
        });
      }

      const color = score >= 90 ? '#2EA043' : score >= 70 ? '#D29922' : score >= 50 ? '#E16F24' : '#F85149';

      const payload = {
        attachments: [
          {
            color,
            blocks,
          },
        ],
      };

      await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('[Notifier] Slack notification failed:', err.message);
    }
  }

  if (discordWebhookUrl) {
    try {
      const color = score >= 90 ? 0x2ea043 : score >= 70 ? 0xd29922 : score >= 50 ? 0xe16f24 : 0xf85149;

      const embed = {
        title: `${scoreEmoji} PR #${prNumber} Reviewed`,
        color,
        fields: [
          { name: 'Repository', value: repoName, inline: true },
          { name: 'Author', value: author, inline: true },
          { name: 'Score', value: `${score}/100 (${deltaText})`, inline: true },
          { name: 'Critical Issues', value: `${criticalCount}`, inline: true },
          { name: 'PR Title', value: prTitle, inline: false },
        ],
        footer: {
          text: 'ReviewMate AI Code Review',
        },
        timestamp: new Date().toISOString(),
      };

      if (dashboardUrl) {
        embed.url = dashboardUrl;
      }

      await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (err) {
      console.error('[Notifier] Discord notification failed:', err.message);
    }
  }
}

module.exports = { sendNotifications };
