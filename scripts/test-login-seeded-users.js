// scripts/test-login-seeded-users.js
// Minimal clean test runner to POST to /auth/login for each seeded user and print a short summary.
// Usage: node scripts/test-login-seeded-users.js

require('dotenv').config();

const fetchImpl = (typeof fetch !== 'undefined')
  ? fetch
  : (() => {
      try {
        const nf = require('node-fetch');
        return nf.default || nf;
      } catch (e) {
        console.error('Global fetch is not available and `node-fetch` is not installed. Use Node 18+ or install node-fetch.');
        process.exit(1);
      }
    })();

const BASE = process.env.TEST_API_BASE || process.env.VITE_API_BASE_URL || process.env.BASE_URL || 'http://localhost:4000/api';

const USERS = [
  { email: 'collins@gmail.com', password: 'elimisha123', userType: 'school_user' },
  { email: 'masuud@gmail.com', password: 'elimisha123', userType: 'school_user' },
  { email: 'leeroy@gmail.com', password: 'elimisha123', userType: 'school_user' },
  { email: 'khalid@gmail.com', password: 'elimisha123', userType: 'school_user' },
  { email: 'sharon@gmail.com', password: 'elimisha123', userType: 'school_user' },
  { email: 'kelvin@gmail.com', password: 'elimisha123', userType: 'school_user' },
  { email: 'adan@gmail.com', password: 'elimisha123', userType: 'admin_user' },
  { email: 'aisha@gmail.com', password: 'elimisha123', userType: 'admin_user' },
  { email: 'nasra@gmail.com', password: 'elimisha123', userType: 'admin_user' },
  { email: 'joseph@gmail.com', password: 'elimisha123', userType: 'admin_user' },
  { email: 'john@gmail.com', password: 'elimisha123', userType: 'admin_user' },
];

async function attemptLogin(u) {
  const res = await fetchImpl(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(u),
  });
  const text = await res.text();
  try { return { status: res.status, ok: res.ok, body: JSON.parse(text) }; } catch { return { status: res.status, ok: res.ok, body: text }; }
}

(async () => {
  console.log(`Testing ${USERS.length} seeded users against ${BASE}/auth/login`);
  for (const u of USERS) {
    process.stdout.write(`- ${u.email} (${u.userType}) -> `);
    try {
      const r = await attemptLogin(u);
      console.log(`HTTP ${r.status} ok=${r.ok}`);
      if (r.body && typeof r.body === 'object') {
        const usr = r.body.data && r.body.data.user ? r.body.data.user : null;
        const tokens = r.body.data && r.body.data.tokens ? r.body.data.tokens : null;
        console.log('  user:', usr ? `${usr.email} role=${usr.role} userType=${usr.userType}` : 'none');
        console.log('  tokens:', tokens ? `access=${Boolean(tokens.accessToken)} refreshId=${tokens.refreshTokenId ? tokens.refreshTokenId : 'n/a'}` : 'none');
      } else {
        console.log('  body:', r.body);
      }
    } catch (err) {
      console.log('ERROR:', err && err.message ? err.message : String(err));
    }
  }
})();

