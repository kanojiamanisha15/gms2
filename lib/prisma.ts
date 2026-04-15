import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { resolveDatabaseUrl } from "@/lib/db/database-url";

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  throw new Error("Set DATABASE_URL or DB_HOST, DB_NAME, DB_USER, DB_PASSWORD for Prisma.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };