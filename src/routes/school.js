// src/routes/school.js
// Routes for School web app (school_users)
// Expected endpoints to add in Phase 2:
// - CRUD /schools
// - CRUD /schools/:schoolId/users
// - /classes, /subjects, /academic-years, /terms, scheduling, grades, reports

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'school placeholder' });
});

module.exports = router;
