/**
 * src/index.js
 * Express app bootstrap for Edufam Phase 1
 * - Loads env
 * - Adds security and parsing middlewares
 * - Mounts API routers
 * - Health check with DB ping
 */
const app = require('./app');
const prisma = require('./lib/prisma');

const PORT = process.env.PORT || 4000;

// Helper to attempt DB connection with a few retries before starting server
async function startServer() {
  const maxAttempts = parseInt(process.env.DB_CONNECT_ATTEMPTS || '5', 10);
  const delayMs = parseInt(process.env.DB_CONNECT_RETRY_MS || '2000', 10);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempting to connect to database (attempt ${attempt}/${maxAttempts})`);
      await prisma.$connect();
      console.log('Database connection established');
      break;
    } catch (err) {
      console.error(`Database connection attempt ${attempt} failed:`, err && err.message ? err.message : err);
      if (attempt === maxAttempts) {
        console.error('Unable to connect to database after multiple attempts. Please check DATABASE_URL and ensure the DB server is reachable.');
        // Exit process with non-zero code so container orchestrators or developers see the failure
        process.exit(1);
      }
      // wait before retrying
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  app.listen(PORT, () => {
    console.log(`edufam-backend listening on port ${PORT}`);
  });
}

// Start
startServer().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

// Improve visibility on unhandled errors and try to disconnect Prisma gracefully
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  try { await prisma.$disconnect(); } catch {};
  process.exit(1);
});

process.on('uncaughtException', async (err) => {
  console.error('Uncaught Exception thrown:', err);
  try { await prisma.$disconnect(); } catch {};
  process.exit(1);
});
