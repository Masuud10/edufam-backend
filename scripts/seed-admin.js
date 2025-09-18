// scripts/seed-admin.js
// Seed a super_admin user for initial development
// NOTE: This is a simple seed script for Phase 1. Do not use in production without reviews.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@edufam.org').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'SuperSecurePassword123!';
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${existing.email} (${existing.id})`);
    await prisma.$disconnect();
    return;
  }

  const hashed = await bcrypt.hash(password, saltRounds);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      firstName: 'Edufam',
      lastName: 'Admin',
      userType: 'admin_user',
      role: 'super_admin'
    }
  });

  console.log(`Created admin user: ${user.email} (${user.id})`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
