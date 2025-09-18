// src/utils/response.js
// Centralized JSON response helpers used across the API
function success(res, data = {}, status = 200, message = '') {
  // Preserve previous positional usage: success(res, data, status)
  return res.status(status).json({ success: true, message: message || '', data });
}

function error(res, code = 'SERVER_ERROR', message = 'Server error', status = 500, details = null) {
  const payload = { success: false, message };
  const data = { code };
  if (details) data.details = details;
  payload.data = data;
  return res.status(status).json(payload);
}

module.exports = { success, error };

// Phase 3: Consider adding more structured error classes and logging integrations.
