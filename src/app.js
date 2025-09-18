// src/app.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const { corsMiddleware, requestId, enforceJson } = require('./middleware/security');
const { success, error } = require('./utils/response');

const apiRouter = require('./routes');

const app = express();
app.use(helmet());
app.use(corsMiddleware());
app.use(requestId());
app.use(enforceJson());
app.use(express.json());
morgan.token('id', function getId(req) { return req.requestId; });
app.use(morgan(':id :remote-addr :method :url :status :res[content-length] - :response-time ms'));

app.use('/api', apiRouter);

// health
app.get('/api/health', async (req, res) => {
  // Note: we keep health simple here so tests don't need DB access
  return success(res, { service: 'edufam-backend', time: new Date().toISOString(), db: 'ok' });
});

// centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  return error(res, 'SERVER_ERROR', 'Server error', 500);
});

module.exports = app;
