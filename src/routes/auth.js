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

async function hashToken(token) {
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
  return bcrypt.hash(token, rounds);
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
    const refreshTokenDays = parseInt(process.env.REFRESH_TOKEN_DAYS || '30', 10);
    const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

    // Prisma RefreshToken model stores token in `token` (we store the hashed token here)
    const refresh = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenHash,
        expiresAt,
      }
    });

    const safeUser = { id: user.id, email: user.email, role: user.role, userType: user.userType, firstName: user.firstName, lastName: user.lastName, schoolId: user.schoolId };

    return success(res, { user: safeUser, tokens: { accessToken, refreshToken: refreshTokenPlain, refreshTokenId: refresh.id } }, 200);
  } catch (err) {
    console.error('login error', err);
    return error(res, 'SERVER_ERROR', 'Server error', 500);
  }
});

// POST /api/auth/refresh
router.post('/refresh', refreshLimiter, refreshValidator, async (req, res) => {
  try {
    const { refreshTokenId, refreshToken } = req.body;
    const existing = await prisma.refreshToken.findUnique({ where: { id: refreshTokenId } });
    if (!existing) return error(res, 'INVALID_REFRESH', 'Refresh token not found', 401);
    if (existing.expiresAt && existing.expiresAt <= new Date()) return error(res, 'REFRESH_EXPIRED', 'Refresh token expired', 401);

    const matches = await bcrypt.compare(refreshToken, existing.token || '');
    if (!matches) {
      // revoke/delete this token to be safe
      await prisma.refreshToken.delete({ where: { id: refreshTokenId } }).catch(() => {});
      return error(res, 'INVALID_REFRESH', 'Refresh token invalid', 401);
    }

    // rotation: delete old token and issue a new one
    await prisma.refreshToken.delete({ where: { id: refreshTokenId } });

  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
    if (!user) return error(res, 'USER_NOT_FOUND', 'User not found', 401);

    const accessToken = signAccessToken(user);
    const newPlain = generateRefreshTokenValue();
    const newHash = await hashToken(newPlain);
    const refreshTokenDays = parseInt(process.env.REFRESH_TOKEN_DAYS || '30', 10);
    const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);

  const newRefresh = await prisma.refreshToken.create({ data: { userId: user.id, token: newHash, expiresAt } });

    const safeUser = { id: user.id, email: user.email, role: user.role, userType: user.userType, firstName: user.firstName, lastName: user.lastName, schoolId: user.schoolId };

    return success(res, { user: safeUser, tokens: { accessToken, refreshToken: newPlain, refreshTokenId: newRefresh.id } }, 200);
  } catch (err) {
    console.error('refresh error', err);
    return error(res, 'SERVER_ERROR', 'Server error', 500);
  }
});

// POST /api/auth/logout
router.post('/logout', logoutLimiter, logoutValidator, async (req, res) => {
  try {
    const { refreshTokenId } = req.body;
    const existing = await prisma.refreshToken.findUnique({ where: { id: refreshTokenId } });
    if (!existing) return error(res, 'INVALID_REFRESH', 'Refresh token not found', 404);

    // revoke by deleting
    await prisma.refreshToken.delete({ where: { id: refreshTokenId } });

    return success(res, { message: 'Logged out' }, 200);
  } catch (err) {
    console.error('logout error', err);
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
    console.error('me error', err);
    return error(res, 'SERVER_ERROR', 'Server error', 500);
  }
});

module.exports = router;

// Phase 3: Add refresh token blacklisting on suspicious activity and device tracking.
