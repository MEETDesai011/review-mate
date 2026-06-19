const { Router } = require('express');
const { optionalAuth } = require('../middleware/auth');
const { reviewSnippet } = require('../services/gemini');

const router = Router();

router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { code, language, persona = 'SENIOR_ENGINEER', filePath } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing required field: code (string)' });
    }

    if (code.length > 50000) {
      return res.status(400).json({ error: 'Code snippet too large. Maximum 50,000 characters.' });
    }

    const validPersonas = ['SENIOR_ENGINEER', 'SECURITY_ENGINEER', 'PERFORMANCE_ENGINEER', 'STARTUP_CTO'];
    const selectedPersona = validPersonas.includes(persona) ? persona : 'SENIOR_ENGINEER';

    const result = await reviewSnippet(code, language, selectedPersona, filePath);

    res.json({
      ...result,
      persona: selectedPersona,
      language: language || 'unknown',
      filePath: filePath || 'unknown',
      authenticated: req.authenticated || false,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
