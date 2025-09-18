// src/controllers/schoolsController.js
// Example controller for schools (Phase 1 scaffold)
// TODO: implement validation, error handling, and full CRUD in Phase 2
const schoolsService = require('../services/schoolsService');

async function getSchools(req, res) {
  // Placeholder: call service layer to fetch schools
  const schools = await schoolsService.listSchools();
  res.json({ data: schools });
}

module.exports = {
  getSchools,
};
