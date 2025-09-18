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
app.listen(PORT, () => {
  console.log(`edufam-backend listening on port ${PORT}`);
});
