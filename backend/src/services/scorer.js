async function calculateScoreDelta(prisma, repositoryId, author, currentScore) {
  const previousReview = await prisma.review.findFirst({
    where: {
      repositoryId,
      author,
    },
    orderBy: { createdAt: 'desc' },
    select: { score: true },
  });

  if (!previousReview) {
    return { previousScore: null, scoreDelta: null };
  }

  const previousScore = previousReview.score;
  const scoreDelta = Math.round((currentScore - previousScore) * 10) / 10;

  return { previousScore, scoreDelta };
}

module.exports = { calculateScoreDelta };
