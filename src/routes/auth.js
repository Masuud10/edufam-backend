// src/routes/auth.js
// Auth API (Phase 2)
// Endpoints:
// POST /api/auth/login  - headers: Content-Type: application/json, Accept: application/json
//   body: { email, password }
//   success: 200 { ok:true, data: { user, tokens: { accessToken, refreshToken, refreshTokenId } } }
// POST /api/auth/refresh
//   body: { refreshTokenId, refreshToken }
//   success: 200 new tokens (rotated)
// POST /api/auth/logout
//   body: { refreshTokenId }
//   success: 200
// GET /api/auth/me
//   headers: Authorization: Bearer <accessToken>
//   success: 200 { ok:true, data: { user } }

require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
// Use bcryptjs for easier cross-platform installs (no native build required)
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { success, error } = require('../utils/response');
const { loginValidator, refreshValidator, logoutValidator } = require('../middleware/validators');
const { createRateLimiter } = require('../middleware/security');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Structured error logger to surface Prisma codes/meta and stacks for debugging.
function logServerError(context, err) {
  try {
    if (!err) return console.error(`${context} unknown error`);
    // Log the full stack if available
    if (err.stack) console.error(`${context} stack`, err.stack);
    // Log Prisma error code/meta if present
    if (err.code) console.error(`${context} code`, err.code, 'meta', err.meta || {});
    // Fallback to printing the error object
    console.error(`${context} error`, typeof err === 'object' ? err : String(err));
  } catch (e) {
    // Ensure logging never throws
    console.error('logServerError failure', e);
  }
}

const loginLimiter = createRateLimiter({ max: 10, windowMs: 60 * 1000 });
const refreshLimiter = createRateLimiter({ max: 30, windowMs: 60 * 1000 });
const logoutLimiter = createRateLimiter({ max: 30, windowMs: 60 * 1000 });

function signAccessToken(user) {
  const payload = { userId: user.id, role: user.role, userType: user.userType };
  const opts = {};
  const expiresIn = process.env.ACCESS_TOKEN_EXP || '15m';
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString('hex');
}

function fingerprintForToken(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

async function hashToken(token) {
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  return bcrypt.hash(token, rounds);
}

// Helper: create refresh token record but gracefully fall back if the DB does
// not yet have the `tokenFingerprint` column (Prisma P2022). This allows the
// backend to continue working during a migration window.
async function createRefreshTokenRecord(data) {
  try {
    return await prisma.refreshToken.create({ data });
  } catch (e) {
    // Prisma error when column is missing
    if (e && e.code === 'P2022' && e.meta && e.meta.column === 'tokenFingerprint') {
      // Column missing: warn and remove tokenFingerprint then retry
      console.warn('tokenFingerprint column missing in DB - falling back to create without fingerprint');
      // Remove tokenFingerprint and retry
      const { tokenFingerprint, ...rest } = data;
      return await prisma.refreshToken.create({ data: rest });
    }
    throw e;
  }
}

// POST /api/auth/login
router.post('/login', loginLimiter, loginValidator, async (req, res) => {
  try {
    const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return error(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);

  // Prisma schema stores the hashed password in `password` field
  const valid = await bcrypt.compare(password, user.password || '');
  if (!valid) return error(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);

  // If `isActive` field exists in schema, ensure user is active; otherwise treat as active
  if (typeof user.isActive !== 'undefined' && !user.isActive) return error(res, 'USER_INACTIVE', 'User is inactive', 403);

    // create session
  // Create a session record: Prisma model uses ipAddress and userAgent
  const session = await prisma.userSession.create({ data: { userId: user.id, ipAddress: req.ip || '', userAgent: req.get('User-Agent') || '' } });

    // generate tokens
    const accessToken = signAccessToken(user);
  const refreshTokenPlain = generateRefreshTokenValue();
  const refreshTokenHash = await hashToken(refreshTokenPlain);
  const refreshTokenFingerprint = fingerprintForToken(refreshTokenPlain);
    const refreshTokenDays = parseInt(process.env.REFRESH_TOKEN_DAYS || '30', 10);
    const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

    // Prisma RefreshToken model stores token in `token` (we store the hashed token here)
    // Use resilient create helper in case DB doesn't include tokenFingerprint yet.
    const refresh = await createRefreshTokenRecord({
      userId: user.id,
      token: refreshTokenHash,
      tokenFingerprint: refreshTokenFingerprint,
      expiresAt,
    });

    const safeUser = { id: user.id, email: user.email, role: user.role, userType: user.userType, firstName: user.firstName, lastName: user.lastName, schoolId: user.schoolId };

    return success(res, { user: safeUser, tokens: { accessToken, refreshToken: refreshTokenPlain, refreshTokenId: refresh.id } }, 200);
  } catch (err) {
    logServerError('login error', err);
    return error(res, 'SERVER_ERROR', 'Server error', 500);
  }
});

// POST /api/auth/refresh
// Helper: find refresh token record by plain token (compat for frontends that don't store ID)
async function findRefreshTokenRecordByPlain(plain) {
  if (!plain) return null;
  const fp = fingerprintForToken(plain);
  // Try indexed lookup by fingerprint first; if the column is missing, fall
  // back to scanning non-expired tokens and bcrypt comparing them.
  try {
    const candidates = await prisma.refreshToken.findMany({ where: { tokenFingerprint: fp, expiresAt: { gt: new Date() } } });
    for (const c of candidates) {
      try {
        const ok = await bcrypt.compare(plain, c.token || '');
        if (ok) return c;
      } catch (e) {
        // ignore compare errors
      }
    }
  } catch (e) {
    if (e && e.code === 'P2022' && e.meta && e.meta.column === 'tokenFingerprint') {
      // Column missing: full scan of non-expired tokens (slower)
      console.warn('tokenFingerprint column missing in DB - falling back to full scan on refresh token lookup');
      const candidates = await prisma.refreshToken.findMany({ where: { expiresAt: { gt: new Date() } } });
      for (const c of candidates) {
        try {
          const ok = await bcrypt.compare(plain, c.token || '');
          if (ok) return c;
        } catch (err) {
          // ignore
        }
      }
    } else {
      throw e;
    }
  }

  return null;
}

async function rotateRefreshTokenAndRespond(res, existingRecord, providedPlain) {
  // existingRecord must be a Prisma RefreshToken record
  if (!existingRecord) return error(res, 'INVALID_REFRESH', 'Refresh token not found', 401);
  if (existingRecord.expiresAt && existingRecord.expiresAt <= new Date()) return error(res, 'REFRESH_EXPIRED', 'Refresh token expired', 401);

  // If providedPlain is present, verify it matches stored hash
  if (providedPlain) {
    const matches = await bcrypt.compare(providedPlain, existingRecord.token || '');
    if (!matches) {
      // revoke/delete this token to be safe
      await prisma.refreshToken.delete({ where: { id: existingRecord.id } }).catch(() => {});
      return error(res, 'INVALID_REFRESH', 'Refresh token invalid', 401);
    }
  }

  // rotation: delete old token and issue a new one
  await prisma.refreshToken.delete({ where: { id: existingRecord.id } });

  const user = await prisma.user.findUnique({ where: { id: existingRecord.userId } });
  if (!user) return error(res, 'USER_NOT_FOUND', 'User not found', 401);

  const accessToken = signAccessToken(user);
  const newPlain = generateRefreshTokenValue();
  const newHash = await hashToken(newPlain);
  const newFingerprint = fingerprintForToken(newPlain);
  const refreshTokenDays = parseInt(process.env.REFRESH_TOKEN_DAYS || '30', 10);
  const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

  const newRefresh = await createRefreshTokenRecord({ userId: user.id, token: newHash, tokenFingerprint: newFingerprint, expiresAt });

  const safeUser = { id: user.id, email: user.email, role: user.role, userType: user.userType, firstName: user.firstName, lastName: user.lastName, schoolId: user.schoolId };

  return success(res, { user: safeUser, tokens: { accessToken, refreshToken: newPlain, refreshTokenId: newRefresh.id } }, 200);
}

// POST /api/auth/refresh (keeps original name)
router.post('/refresh', refreshLimiter, refreshValidator, async (req, res) => {
  try {
    const { refreshTokenId, refreshToken } = req.body;
    if (refreshTokenId) {
      const existing = await prisma.refreshToken.findUnique({ where: { id: refreshTokenId } });
      return await rotateRefreshTokenAndRespond(res, existing, refreshToken);
    }

    // Fallback: try to find by plain token
    if (refreshToken) {
      const existing = await findRefreshTokenRecordByPlain(refreshToken);
      return await rotateRefreshTokenAndRespond(res, existing, refreshToken);
    }

    return error(res, 'INVALID_REQUEST', 'Missing refresh token', 400);
  } catch (err) {
    logServerError('refresh error', err);
    return error(res, 'SERVER_ERROR', 'Server error', 500);
  }
});

// POST /api/auth/refresh-token (compatibility alias used by frontends)
router.post('/refresh-token', refreshLimiter, refreshValidator, async (req, res) => {
  try {
    const { refreshTokenId, refreshToken } = req.body;
    if (refreshTokenId) {
      const existing = await prisma.refreshToken.findUnique({ where: { id: refreshTokenId } });
      return await rotateRefreshTokenAndRespond(res, existing, refreshToken);
    }

    if (refreshToken) {
      const existing = await findRefreshTokenRecordByPlain(refreshToken);
      return await rotateRefreshTokenAndRespond(res, existing, refreshToken);
    }

    return error(res, 'INVALID_REQUEST', 'Missing refresh token', 400);
  } catch (err) {
    logServerError('refresh-token error', err);
    return error(res, 'SERVER_ERROR', 'Server error', 500);
  }
});

// POST /api/auth/logout
router.post('/logout', logoutLimiter, logoutValidator, async (req, res) => {
  try {
    const { refreshTokenId, refreshToken } = req.body;
    let existing = null;
    if (refreshTokenId) {
      existing = await prisma.refreshToken.findUnique({ where: { id: refreshTokenId } });
    } else if (refreshToken) {
      // find by comparing hashes (only consider non-expired tokens)
      const candidates = await prisma.refreshToken.findMany({ where: { expiresAt: { gt: new Date() } } });
      for (const c of candidates) {
        try {
          const ok = await bcrypt.compare(refreshToken, c.token || '');
          if (ok) {
            existing = c;
            break;
          }
        } catch (e) {}
      }
    }

    if (!existing) return error(res, 'INVALID_REFRESH', 'Refresh token not found', 404);

    // revoke by deleting
    await prisma.refreshToken.delete({ where: { id: existing.id } });

    return success(res, { message: 'Logged out' }, 200);
  } catch (err) {
    logServerError('logout error', err);
    return error(res, 'SERVER_ERROR', 'Server error', 500);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const safeUser = { id: user.id, email: user.email, role: user.role, userType: user.userType, firstName: user.firstName, lastName: user.lastName, schoolId: user.schoolId };
    return success(res, { user: safeUser }, 200);
  } catch (err) {
    logServerError('me error', err);
    return error(res, 'SERVER_ERROR', 'Server error', 500);
  }
});

module.exports = router;

// Phase 3: Add refresh token blacklisting on suspicious activity and device tracking.
