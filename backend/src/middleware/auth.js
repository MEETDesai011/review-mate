function authenticate(req, res, next) {
  const apiKey = req.headers['x-reviewmate-api-key'];
  const expected = process.env.REVIEWMATE_API_KEY;

  if (!expected) {
    return res.status(500).json({ error: 'Server API key not configured' });
  }

  if (!apiKey || apiKey !== expected) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  req.authenticated = true;
  next();
}

function optionalAuth(req, res, next) {
  const apiKey = req.headers['x-reviewmate-api-key'];
  const expected = process.env.REVIEWMATE_API_KEY;

  req.authenticated = !!(expected && apiKey && apiKey === expected);
  next();
}

module.exports = { authenticate, optionalAuth };
