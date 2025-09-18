// src/routes/mobile.js
// Routes for Mobile app (subset of school features)
// Expected endpoints to add in Phase 2:
// - limited user profile endpoints
// - class listings, schedules, notifications

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'mobile placeholder' });
});

module.exports = router;
