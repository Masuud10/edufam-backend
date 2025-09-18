// src/middleware/validators.js
const { body, validationResult } = require('express-validator');
const { error } = require('../utils/response');

const loginValidator = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 8 }).withMessage('Password too short (min 8)'),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'VALIDATION_ERROR', 'Validation failed', 422, { errors: errs.array() });
    next();
  }
];

const refreshValidator = [
  // Allow either refreshTokenId (UUID) OR refreshToken (string) for compatibility with older frontends
  body('refreshTokenId').optional().isUUID().withMessage('Invalid refreshTokenId'),
  body('refreshToken').optional().isString().withMessage('refreshToken must be a string'),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'VALIDATION_ERROR', 'Validation failed', 422, { errors: errs.array() });
    if (!req.body.refreshTokenId && !req.body.refreshToken) return error(res, 'VALIDATION_ERROR', 'Validation failed', 422, { errors: [{ msg: 'Either refreshTokenId or refreshToken is required' }] });
    next();
  }
];

const logoutValidator = [
  // Allow either refreshTokenId or refreshToken (plain) to support older frontends
  body('refreshTokenId').optional().isUUID().withMessage('Invalid refreshTokenId'),
  body('refreshToken').optional().isString().withMessage('refreshToken must be a string'),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'VALIDATION_ERROR', 'Validation failed', 422, { errors: errs.array() });
    if (!req.body.refreshTokenId && !req.body.refreshToken) return error(res, 'VALIDATION_ERROR', 'Validation failed', 422, { errors: [{ msg: 'Either refreshTokenId or refreshToken is required' }] });
    next();
  }
];

module.exports = { loginValidator, refreshValidator, logoutValidator };

// Phase 3: add validators for registration, password reset, and other auth flows.
