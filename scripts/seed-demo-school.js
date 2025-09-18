// scripts/seed-demo-school.js
// Seed script to create a Demo school and a set of school and admin users
// NOTE: Run locally only. Ensure your DATABASE_URL points to your development database.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

async function upsertUser({ email, password, firstName, lastName, userType, role, schoolId = null }) {
  const lower = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) {
    console.log(`User already exists: ${existing.email} (${existing.id})`);
    // Optionally update role/school if different
    const updates = {};
    if (existing.role !== role) updates.role = role;
    if (existing.userType !== userType) updates.userType = userType;
    if ((existing.schoolId || null) !== (schoolId || null)) updates.schoolId = schoolId;
    if (Object.keys(updates).length) {
      await prisma.user.update({ where: { id: existing.id }, data: updates });
      console.log(`  Updated user ${existing.email} with ${JSON.stringify(updates)}`);
    }
    return existing;
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  const hashed = await bcrypt.hash(password, saltRounds);

  const created = await prisma.user.create({
    data: {
      email: lower,
      password: hashed,
      firstName: firstName || null,
      lastName: lastName || null,
      userType,
      role,
      schoolId: schoolId || null,
    },
  });
  console.log(`Created user: ${created.email} (${created.id}) role=${created.role} type=${created.userType}`);
  return created;
}

async function main() {
  console.log('Starting Demo school seed...');

  // Create or find Demo school
  const schoolName = 'Demo school';
  let school = await prisma.school.findFirst({ where: { name: schoolName } });
  if (!school) {
    school = await prisma.school.create({ data: { name: schoolName, address: '123 Demo Road' } });
    console.log(`Created school: ${school.name} (${school.id})`);
  } else {
    console.log(`Found existing school: ${school.name} (${school.id})`);
  }

  // School users
  const schoolUsers = [
    { role: 'school_director', email: 'collins@gmail.com', password: 'elimisha123', firstName: 'Collins' },
    { role: 'principal', email: 'masuud@gmail.com', password: 'elimisha123', firstName: 'Masuud' },
    { role: 'teacher', email: 'leeroy@gmail.com', password: 'elimisha123', firstName: 'Leeroy' },
    { role: 'parent', email: 'khalid@gmail.com', password: 'elimisha123', firstName: 'Khalid' },
    { role: 'hr', email: 'sharon@gmail.com', password: 'elimisha123', firstName: 'Sharon' },
    { role: 'finance', email: 'kelvin@gmail.com', password: 'elimisha123', firstName: 'Kelvin' },
  ];

  for (const u of schoolUsers) {
    await upsertUser({
      email: u.email,
      password: u.password,
      firstName: u.firstName,
      lastName: '',
      userType: 'school_user',
      role: u.role,
      schoolId: school.id,
    });
  }

  // Admin users
  const adminUsers = [
    { role: 'super_admin', email: 'adan@gmail.com', password: 'elimisha123', firstName: 'Adan' },
    { role: 'sales_marketing', email: 'aisha@gmail.com', password: 'elimisha123', firstName: 'Aisha' },
    { role: 'support_hr', email: 'nasra@gmail.com', password: 'elimisha123', firstName: 'Nasra' },
    { role: 'engineer', email: 'joseph@gmail.com', password: 'elimisha123', firstName: 'Joseph' },
    { role: 'admin_finance', email: 'john@gmail.com', password: 'elimisha123', firstName: 'John' },
  ];

  for (const u of adminUsers) {
    await upsertUser({
      email: u.email,
      password: u.password,
      firstName: u.firstName,
      lastName: '',
      userType: 'admin_user',
      role: u.role,
      schoolId: null,
    });
  }

  console.log('Demo school seed complete.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Seed failed', e);
  await prisma.$disconnect();
  process.exit(1);
});
