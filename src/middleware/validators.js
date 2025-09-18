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
  body('refreshTokenId').isUUID().withMessage('Invalid refreshTokenId'),
  body('refreshToken').isString().withMessage('refreshToken required'),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'VALIDATION_ERROR', 'Validation failed', 422, { errors: errs.array() });
    next();
  }
];

const logoutValidator = [
  body('refreshTokenId').isUUID().withMessage('Invalid refreshTokenId'),
  (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return error(res, 'VALIDATION_ERROR', 'Validation failed', 422, { errors: errs.array() });
    next();
  }
];

module.exports = { loginValidator, refreshValidator, logoutValidator };

// Phase 3: add validators for registration, password reset, and other auth flows.
