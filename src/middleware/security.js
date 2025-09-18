// src/middleware/security.js
require('dotenv').config();
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// CORS middleware factory
function corsMiddleware() {
  // Default safe origins (production + local dev). Can be overridden via ALLOWED_ORIGINS env var
  const defaultAllowed = ['https://www.edufam.org', 'http://localhost:3000'];
  const raw = process.env.ALLOWED_ORIGINS || '';
  const allowedFromEnv = raw.split(',').map(s => s.trim()).filter(Boolean);
  const allowed = Array.from(new Set([...(allowedFromEnv.length ? allowedFromEnv : defaultAllowed)]));

  return cors({
    origin: function (origin, callback) {
      // allow non-browser tools (Postman, server-to-server) when no origin header is present
      if (!origin) return callback(null, true);
      // Allow exact matches from the allowed list
      if (allowed.includes(origin)) return callback(null, true);
      // Not allowed
      return callback(new Error('CORS not allowed by server'));
    },
    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // Allowed headers (include custom headers required by frontends)
    allowedHeaders: ['Content-Type', 'Authorization', 'x-portfolio-mode'],
    // Allow browsers to include credentials (cookies, authorization headers)
    credentials: true,
    // Standard preflight handling: do not pass to next handler, respond with 204 on success
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
