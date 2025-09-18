// src/middleware/auth.js
require('dotenv').config();
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { error } = require('../utils/response');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return error(res, 'MISSING_TOKEN', 'Missing access token', 401);

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return error(res, 'INVALID_TOKEN', 'Invalid or expired access token', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id:true, email:true, role:true, userType:true, isActive:true, firstName:true, lastName:true, schoolId:true }
    });

    if (!user || !user.isActive) return error(res, 'USER_NOT_FOUND', 'User not found or inactive', 401);

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (err) {
    console.error('authenticate error', err);
    return error(res, 'SERVER_ERROR', 'Server error', 500);
  }
}

function requireUserType(requiredType) {
  return function (req, res, next) {
    if (!req.user) return error(res, 'NOT_AUTHENTICATED', 'Not authenticated', 401);
    if (req.user.userType !== requiredType) return error(res, 'INSUFFICIENT_TYPE', 'Insufficient user type', 403);
    next();
  };
}

function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) return error(res, 'NOT_AUTHENTICATED', 'Not authenticated', 401);
    if (!allowedRoles.includes(req.user.role)) return error(res, 'INSUFFICIENT_ROLE', 'Insufficient role', 403);
    next();
  };
}

module.exports = { authenticate, requireUserType, requireRole };

// Phase 3: implement permission-based resource checks and caching of permissions for performance.
// src/middleware/auth.js
// Placeholder authentication and RBAC middleware for Edufam Phase 1
// Phase 2: implement token verification, session checks, and role enforcement
require('dotenv').config();

function authenticate(req, res, next) {
  // Placeholder: check Authorization header, validate token, attach user to req
  // Phase 2: implement JWT verification and session lookup
  return next();
}

function requireUserType(userType) {
  return function (req, res, next) {
    // Placeholder: check req.user.userType === userType
    return next();
  };
}

function requireRole(...roles) {
  return function (req, res, next) {
    // Placeholder: check req.user.role is among roles
    return next();
  };
}

module.exports = {
  authenticate,
  requireUserType,
  requireRole,
};
