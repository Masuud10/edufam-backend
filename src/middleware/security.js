// src/middleware/security.js
require('dotenv').config();
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// CORS middleware factory
function corsMiddleware() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  const allowed = raw.split(',').map(s => s.trim()).filter(Boolean);
  return cors({
    origin: function (origin, callback) {
      // allow non-browser tools (postman) or server-to-server if no origin
      if (!origin) return callback(null, true);
      if (allowed.length === 0) return callback(null, true); // dev mode: allow all
      if (allowed.includes(origin)) return callback(null, true);
      return callback(new Error('CORS not allowed'));
    },
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','Accept','X-Request-Id'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
}

// attach X-Request-Id for tracing
function requestId() {
  return function (req, res, next) {
    const id = req.get('X-Request-Id') || uuidv4();
    req.requestId = id;
    res.set('X-Request-Id', id);
    next();
  };
}

// enforce JSON Content-Type/Accept on JSON endpoints
function enforceJson() {
  return function (req, res, next) {
    const ct = req.get('Content-Type') || '';
    const accept = req.get('Accept') || '';
    // only enforce for endpoints that have body (POST/PUT/PATCH)
    if (['POST','PUT','PATCH'].includes(req.method)) {
      if (!ct.includes('application/json')) {
        return res.status(415).json({ ok:false, error:{ code:'UNSUPPORTED_MEDIA_TYPE', message:'Content-Type must be application/json' }});
      }
    }
    // accept header - be lenient but recommend application/json
    if (accept && !accept.includes('*/*') && !accept.includes('application/json')) {
      // not fatal — just set Vary
      res.vary('Accept');
    }
    next();
  };
}

// rate limiter factory (defaults)
function createRateLimiter(options = {}) {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 minute
  const max = parseInt(process.env.RATE_LIMIT_MAX || '20', 10); // default
  return rateLimit({
    windowMs: options.windowMs || windowMs,
    max: options.max || max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok:false, error: { code:'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later.' } },
  });
}

module.exports = { corsMiddleware, requestId, enforceJson, createRateLimiter };

// Phase 3: consider adding IP-based rate limit stores and Redis-backed rate limiter for distributed deployments.
