// src/services/schoolsService.js
// Example service for schools (Phase 1 scaffold)
// TODO: implement pagination, filtering, and error handling in Phase 2
const prisma = require('../lib/prisma');

async function listSchools() {
  // Minimal implementation for Phase 1: return empty array or small sample
  try {
    const schools = await prisma.school.findMany({ take: 50 });
    return schools;
  } catch (e) {
    // In Phase 2: add logging and structured errors
    return [];
  }
}

module.exports = {
  listSchools,
};
