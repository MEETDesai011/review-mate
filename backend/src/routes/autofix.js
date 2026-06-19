const { Router } = require('express');
const { createAutoFixPR } = require('../services/autoFixPR');
const { authenticate } = require('../middleware/auth');
const prisma = require('../services/prisma');

const router = Router();

router.post('/:reviewId/apply', authenticate, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    
    // Verify review ownership
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        ...(req.isGlobalAdmin ? {} : { repository: { installationId: req.installationId } })
      }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    // Call our service
    const pr = await createAutoFixPR(reviewId);
    
    if (!pr) {
      return res.status(400).json({ error: 'No deterministic fixes available for this review.' });
    }

    res.json({
      message: 'Draft PR created successfully',
      prUrl: pr.html_url,
      prNumber: pr.number
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
