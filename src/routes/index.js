// src/routes/index.js
// Aggregates API namespace routers
const express = require('express');
const router = express.Router();

// Namespace routers
router.use('/school', require('./school'));
router.use('/mobile', require('./mobile'));
router.use('/admin', require('./admin'));

// Phase 2: add auth routes at /auth
// router.use('/auth', require('./auth'));

module.exports = router;
