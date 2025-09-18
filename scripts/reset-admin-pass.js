require('dotenv').config();
const prisma = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');

async function main(){
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@edufam.org').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'SuperSecurePassword123!';
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  const hashed = await bcrypt.hash(password, saltRounds);
  const user = await prisma.user.update({ where: { email }, data: { password: hashed } });
  console.log('Updated user password for', user.email);
  await prisma.$disconnect();
}

main().catch(async e=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });
