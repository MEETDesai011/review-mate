function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${err.stack || err.message || err}`);

  const status = err.status || err.statusCode || 500;
  const payload = { error: 'Internal server error' };

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
    payload.message = err.message;
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}

module.exports = errorHandler;
