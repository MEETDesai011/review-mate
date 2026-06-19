const { Router } = require('express');
const prisma = require('../services/prisma');

const router = Router();

function generateBadgeSVG(score, label) {
  const leftText = 'ReviewMate';
  const rightText = `${score} - ${label}`;

  const leftWidth = 82;
  const rightWidth = Math.max(rightText.length * 6.5 + 16, 70);
  const totalWidth = leftWidth + rightWidth;

  let color;
  if (score >= 90) color = '#2EA043';
  else if (score >= 70) color = '#D29922';
  else if (score >= 50) color = '#E16F24';
  else color = '#F85149';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="20" role="img" aria-label="${leftText}: ${rightText}">
  <title>${leftText}: ${rightText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#555"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${leftWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${leftText}</text>
    <text x="${leftWidth / 2}" y="14">${leftText}</text>
    <text aria-hidden="true" x="${leftWidth + rightWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${rightText}</text>
    <text x="${leftWidth + rightWidth / 2}" y="14">${rightText}</text>
  </g>
</svg>`;
}

router.get('/:repoId', async (req, res, next) => {
  try {
    const { repoId } = req.params;

    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
      include: {
        reviews: {
          select: { score: true },
        },
      },
    });

    let score = 0;
    let label = 'no data';

    if (repo && repo.reviews.length > 0) {
      const totalScore = repo.reviews.reduce((sum, r) => sum + r.score, 0);
      score = Math.round((totalScore / repo.reviews.length) * 10) / 10;

      if (score >= 90) label = 'excellent';
      else if (score >= 70) label = 'good';
      else if (score >= 50) label = 'fair';
      else label = 'needs work';
    }

    const svg = generateBadgeSVG(score, label);

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.send(svg);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
