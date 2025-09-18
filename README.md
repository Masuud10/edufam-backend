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
