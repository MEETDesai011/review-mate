const prisma = require('../services/prisma');

async function authenticate(req, res, next) {
  const apiKey = req.headers['x-reviewmate-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  // Check global admin/dev key fallback
  const globalKey = process.env.REVIEWMATE_API_KEY;
  if (globalKey && apiKey === globalKey) {
    req.authenticated = true;
    req.isGlobalAdmin = true;
    return next();
  }

  try {
    const installation = await prisma.installation.findUnique({
      where: { apiKey }
    });

    if (!installation) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    if (installation.suspendedAt) {
      return res.status(403).json({ error: 'Installation is suspended' });
    }

    req.authenticated = true;
    req.installationId = installation.id;
    next();
  } catch (error) {
    next(error);
  }
}

async function optionalAuth(req, res, next) {
  const apiKey = req.headers['x-reviewmate-api-key'];
  if (!apiKey) {
    req.authenticated = false;
    return next();
  }

  const globalKey = process.env.REVIEWMATE_API_KEY;
  if (globalKey && apiKey === globalKey) {
    req.authenticated = true;
    req.isGlobalAdmin = true;
    return next();
  }

  try {
    const installation = await prisma.installation.findUnique({
      where: { apiKey }
    });

    if (installation && !installation.suspendedAt) {
      req.authenticated = true;
      req.installationId = installation.id;
    } else {
      req.authenticated = false;
    }
    next();
  } catch (error) {
    // If DB check fails, fail optional auth silently but log it
    req.authenticated = false;
    next();
  }
}

module.exports = { authenticate, optionalAuth };
