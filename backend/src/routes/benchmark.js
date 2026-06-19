const { Router } = require('express');
const { getBenchmark } = require('../services/benchmark');

const router = Router();

router.get('/:repoId', async (req, res, next) => {
  try {
    const benchmark = await getBenchmark(req.params.repoId);
    res.json(benchmark);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
