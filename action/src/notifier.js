function scoreColor(score) {
  if (score >= 90) return '#2EA043';
  if (score >= 70) return '#D29922';
  return '#F85149';
}

function scoreColorDecimal(score) {
  if (score >= 90) return 3056707;   // #2EA043
  if (score >= 70) return 13801762;  // #D29922
  return 16339273;                    // #F85149
}

async function sendSlack(webhookUrl, reviewData) {
  const color = scoreColor(reviewData.score);
  const deltaText =
    reviewData.scoreDelta !== null && reviewData.scoreDelta !== undefined
      ? `${reviewData.scoreDelta >= 0 ? '+' : ''}${reviewData.scoreDelta}`
      : 'N/A';

  const payload = {
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🔍 ReviewMate: ${reviewData.prTitle}`,
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Score:*\n${reviewData.score}/100` },
              { type: 'mrkdwn', text: `*Delta:*\n${deltaText}` },
              { type: 'mrkdwn', text: `*Critical Issues:*\n${reviewData.criticalCount}` },
              { type: 'mrkdwn', text: `*Persona:*\n${reviewData.persona}` },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Repository:* ${reviewData.repo}\n*PR:* <${reviewData.prUrl}|#${reviewData.prNumber}>`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '📊 View Dashboard', emoji: true },
                url: reviewData.dashboardUrl,
              },
            ],
          },
        ],
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`[ReviewMate] Slack notification failed: ${response.status}`);
  }
}

async function sendDiscord(webhookUrl, reviewData) {
  const color = scoreColorDecimal(reviewData.score);
  const deltaText =
    reviewData.scoreDelta !== null && reviewData.scoreDelta !== undefined
      ? `${reviewData.scoreDelta >= 0 ? '+' : ''}${reviewData.scoreDelta}`
      : 'N/A';

  const payload = {
    embeds: [
      {
        title: `🔍 ReviewMate: ${reviewData.prTitle}`,
        color,
        fields: [
          { name: 'Score', value: `${reviewData.score}/100`, inline: true },
          { name: 'Delta', value: deltaText, inline: true },
          { name: 'Critical Issues', value: `${reviewData.criticalCount}`, inline: true },
          { name: 'Persona', value: reviewData.persona, inline: true },
          { name: 'Repository', value: reviewData.repo, inline: true },
          { name: 'PR', value: `[#${reviewData.prNumber}](${reviewData.prUrl})`, inline: true },
        ],
        url: reviewData.dashboardUrl,
        timestamp: new Date().toISOString(),
        footer: { text: 'ReviewMate AI' },
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`[ReviewMate] Discord notification failed: ${response.status}`);
  }
}

export async function notify(config, reviewData) {
  const tasks = [];

  if (config.slackWebhookUrl) {
    tasks.push(
      sendSlack(config.slackWebhookUrl, reviewData).catch((err) => {
        console.error(`[ReviewMate] Slack notification error: ${err.message}`);
      })
    );
  }

  if (config.discordWebhookUrl) {
    tasks.push(
      sendDiscord(config.discordWebhookUrl, reviewData).catch((err) => {
        console.error(`[ReviewMate] Discord notification error: ${err.message}`);
      })
    );
  }

  await Promise.allSettled(tasks);
}
