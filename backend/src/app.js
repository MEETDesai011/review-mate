const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const reviewsRouter = require('./routes/reviews');
const reposRouter = require('./routes/repos');
const analyticsRouter = require('./routes/analytics');
const leaderboardRouter = require('./routes/leaderboard');
const insightsRouter = require('./routes/insights');
const releasenotesRouter = require('./routes/releasenotes');
const badgeRouter = require('./routes/badge');
const webhookRouter = require('./routes/webhook');
const snippetRouter = require('./routes/snippet');
const techdebtRouter = require('./routes/techdebt');
const benchmarkRouter = require('./routes/benchmark');
const autofixRouter = require('./routes/autofix');

const app = express();

const allowedOrigins = [
  'https://dashboard.reviewmate.dev',
  'https://docs.reviewmate.dev',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/reviews', reviewsRouter);
app.use('/api/repos', reposRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/releasenotes', releasenotesRouter);
app.use('/api/badge', badgeRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/review-snippet', snippetRouter);
app.use('/api/techdebt', techdebtRouter);
app.use('/api/benchmark', benchmarkRouter);
app.use('/api/autofix', autofixRouter);

app.use(errorHandler);

module.exports = app;
