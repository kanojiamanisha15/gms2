# Deploying GMS on Neon DB

This project is set up to run against [Neon](https://neon.tech) (serverless PostgreSQL). Follow these steps to deploy.

## 1. Create a Neon project

1. Sign in at [console.neon.tech](https://console.neon.tech).
2. Create a new project and choose a region close to your app.
3. Copy the **connection string** from the dashboard (Connection details). Prefer the **pooled** connection (host contains `-pooler`) for serverless runtimes (Vercel, etc.).

## 2. Set environment variables

Create `.env.local` (local) or configure env in your hosting platform (e.g. Vercel → Settings → Environment Variables).

**Required:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon connection string (e.g. `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`) |
| `JWT_SECRET` | Long random string for signing JWTs (e.g. `openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Full app URL (e.g. `https://your-app.vercel.app`) |

See `.env.example` for optional vars (default user seed, local DB overrides).

## 3. Run migrations on Neon

After `DATABASE_URL` points to your Neon database:

```bash
npx prisma migrate deploy
```

Or use the npm script:

```bash
npm run db:migrate:deploy
```

This applies all migrations in `prisma/migrations` and creates/updates tables.

## 4. (Optional) Seed default admin user

```bash
npm run db:seed:default-user
```

Override with env: `DEFAULT_USER_EMAIL`, `DEFAULT_USER_PASSWORD`, `DEFAULT_USER_NAME`, `DEFAULT_USER_ROLE`.

## 5. Build and run

- **Local:** `npm run dev`
- **Production:** `npm run build && npm run start`

On install, `postinstall` runs `prisma generate` so the Prisma client is up to date.

## Health check

- **GET /api/health** – Returns `{ status: "healthy", database: "connected" }` when the app and Neon connection are OK. Use this for platform health checks (Vercel, Neon, etc.).

## Notes

- The app uses **one** connection source in production: `DATABASE_URL`. The raw `pg` pool (`lib/db/db.ts`) and Prisma (`lib/db.ts`) both use it when set.
- Neon requires SSL; the app enables it when `DATABASE_URL` is set.
- For local development without Neon, leave `DATABASE_URL` unset and use `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (see `.env.example`).
