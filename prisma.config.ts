import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";
import { resolveDatabaseUrl } from "./lib/db/database-url";

loadEnv({ path: join(process.cwd(), ".env") });
loadEnv({ path: join(process.cwd(), ".env.local"), override: true });

const databaseUrl = resolveDatabaseUrl();
if (!databaseUrl) {
  throw new Error(
    "Set DATABASE_URL in .env, or DB_HOST + DB_NAME + DB_USER + DB_PASSWORD (see lib/db/database-url.ts)."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});