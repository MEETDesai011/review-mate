const { Router } = require('express');
const { createAutoFixPR } = require('../services/autoFixPR');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/:reviewId/apply', authenticate, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    
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
