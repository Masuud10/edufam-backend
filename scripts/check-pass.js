require('dotenv').config();
const prisma = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');

(async function(){
  const email = process.env.SEED_ADMIN_EMAIL;
  const u = await prisma.user.findUnique({ where: { email } });
  console.log('hash:', u.password);
  const ok = await bcrypt.compare(process.env.SEED_ADMIN_PASSWORD, u.password);
  console.log('compare result', ok);
  await prisma.$disconnect();
})();
