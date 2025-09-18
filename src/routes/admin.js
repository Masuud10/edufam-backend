// src/routes/admin.js
// Routes for Admin web app (admin_users)
// Expected endpoints to add in Phase 2:
// - user management, audit logs
// - organization-wide reports, billing, settings

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'admin placeholder' });
});

module.exports = router;
