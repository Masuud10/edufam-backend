/**
 * src/index.js
 * Express app bootstrap for Edufam Phase 1
 * - Loads env
 * - Adds security and parsing middlewares
 * - Mounts API routers
 * - Health check with DB ping
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const prisma = require('./lib/prisma');
const { corsMiddleware, requestId, enforceJson } = require('./middleware/security');
const { success, error } = require('./utils/response');

const app = express();

// Security middlewares
app.use(helmet());
app.use(corsMiddleware());
app.use(requestId());
app.use(enforceJson());

// Parsers and logging
app.use(express.json());
// include request id in logs
morgan.token('id', function getId(req) { return req.requestId; });
app.use(morgan(':id :remote-addr :method :url :status :res[content-length] - :response-time ms'));

// Route aggregator
const apiRouter = require('./routes');
app.use('/api', apiRouter);

// Health check
app.get('/api/health', async (req, res) => {
  let db = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = 'ok';
  } catch (e) {
    db = 'error';
  }

  return success(res, { service: 'edufam-backend', time: new Date().toISOString(), db });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  return error(res, 'SERVER_ERROR', 'Server error', 500);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`edufam-backend listening on port ${PORT}`);
});
