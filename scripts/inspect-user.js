require('dotenv').config();
const prisma = require('../src/lib/prisma');

async function main(){
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@edufam.org').toLowerCase();
  const u = await prisma.user.findUnique({ where: { email } });
  console.log('USER:', u);
  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
