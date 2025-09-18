# Edufam Backend - Phase 1 (Foundation)

This repository contains a minimal, production-lean Node.js + Express + Prisma scaffold for Edufam Phase 1.

Local run steps (exact):

1. Copy environment file and edit values:

```bash
cp .env.example .env
# Edit .env: set DATABASE_URL and secrets
```

2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Run migrations (creates DB schema):

```bash
npx prisma migrate dev --name init
```

5. Seed initial admin user:

```bash
npm run seed:admin
```

6. Start development server:

```bash
npm run dev
```

Railway / Production notes:

- During deploy run:

```bash
npx prisma migrate deploy && npx prisma generate
```

- Set environment variables on Railway as listed below.

Phase 2 TODOs (high level): implement auth, RBAC, request validation, controllers, DTOs, logging, metrics, and CI.

## Auth API (Phase 2)

All responses follow the JSON envelope:

- Success: `{ ok: true, data: ... }`
- Error: `{ ok: false, error: { code: "<SHORT_CODE>", message: "Human readable", details?: { ... } } }`

Environment variables required for auth features:

- `JWT_SECRET`
- `ACCESS_TOKEN_EXP` (e.g. `15m`)
- `REFRESH_TOKEN_DAYS` (int)
- `BCRYPT_SALT_ROUNDS` (int)
- `ALLOWED_ORIGINS` (comma separated)

API Endpoints:

1. POST /api/auth/login

- Headers: `Content-Type: application/json`, `Accept: application/json`
- Body: `{ "email": "...", "password": "..." }`
- Success 200: `{ ok:true, data: { user, tokens: { accessToken, refreshToken, refreshTokenId } } }`

Example:

```bash
curl -X POST http://localhost:4000/api/auth/login \
	-H "Content-Type: application/json" \
	-d '{"email":"admin@edufam.org","password":"SuperSecurePassword123!" }'
```

2. POST /api/auth/refresh

- Body: `{ "refreshTokenId": "<UUID>", "refreshToken": "<token-value>" }`
- Rotates refresh token. Success 200 returns new tokens.

Example:

```bash
curl -X POST http://localhost:4000/api/auth/refresh \
	-H "Content-Type: application/json" \
	-d '{"refreshTokenId":"<UUID>","refreshToken":"<token-value>"}'
```

3. POST /api/auth/logout

- Body: `{ "refreshTokenId": "<UUID>" }`
- Revokes the refresh token and ends the session.

Example:

```bash
curl -X POST http://localhost:4000/api/auth/logout \
	-H "Content-Type: application/json" \
	-d '{"refreshTokenId":"<UUID>"}'
```

4. GET /api/auth/me

- Headers: `Authorization: Bearer <ACCESS_TOKEN>`
- Returns current user (safe fields only).

Example:

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:4000/api/auth/me
```

RBAC guidance

- `/api/school/*`: require `authenticate` and `requireUserType('school_user')`.
- `/api/mobile/*`: require `authenticate` and roles limited to parents/teachers as applicable.
- `/api/admin/*`: require `authenticate` and `requireUserType('admin_user')`.

Phase 3 notes: consider permission caches, refresh token device tracking, and access token revocation lists.
