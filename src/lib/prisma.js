// src/lib/prisma.js
// Prisma client wrapper scaffolded by Edufam Phase 1
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Configure Prisma client options here (e.g., logging) in Phase 2 as needed
const prisma = new PrismaClient();

module.exports = prisma;
