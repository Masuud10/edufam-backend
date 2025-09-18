// src/lib/prisma.js
// Prisma client singleton with graceful shutdown
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

const prisma = globalForPrisma.__prisma || new PrismaClient({
	log: ['error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

// Graceful shutdown
async function disconnectPrisma() {
	try {
		await prisma.$disconnect();
		// eslint-disable-next-line no-console
		console.log('Prisma disconnected');
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('Error disconnecting Prisma', e);
	}
}

process.on('SIGINT', disconnectPrisma);
process.on('SIGTERM', disconnectPrisma);

module.exports = prisma;
