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
const cors = require('cors');
const morgan = require('morgan');
const prisma = require('./lib/prisma');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Route aggregator
const apiRouter = require('./routes');
app.use('/api', apiRouter);

// Health check
app.get('/api/health', async (req, res) => {
  let db = 'unknown';
  try {
    // Minimal DB ping - may vary by provider
    await prisma.$queryRaw`SELECT 1`;
    db = 'ok';
  } catch (e) {
    db = 'error';
  }

  res.json({ service: 'edufam-backend', time: new Date().toISOString(), db });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`edufam-backend listening on port ${PORT}`);
});
