// src/utils/response.js
// Centralized JSON response helpers used across the API
function success(res, data = {}, status = 200) {
  return res.status(status).json({ ok: true, data });
}

function error(res, code = 'SERVER_ERROR', message = 'Server error', status = 500, details = null) {
  const payload = { ok: false, error: { code, message } };
  if (details) payload.error.details = details;
  return res.status(status).json(payload);
}

module.exports = { success, error };

// Phase 3: Consider adding more structured error classes and logging integrations.
