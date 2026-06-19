require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[ReviewMate] Server running on port ${PORT}`);
  console.log(`[ReviewMate] Environment: ${process.env.NODE_ENV || 'development'}`);
});
