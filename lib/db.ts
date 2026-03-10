import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let prismaInstance: PrismaClient | null = null;

/** Lazy-initialized Prisma client. Uses DATABASE_URL (required for Neon). Safe to import at build time. */
function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set. Set it in .env or your deployment environment (e.g. Neon).");
    }
    const adapter = new PrismaPg({ connectionString });
    prismaInstance = new PrismaClient({ adapter });
  }
  return prismaInstance;
}

export default new Proxy({} as PrismaClient, {
  get(_, prop) {
    return getPrisma()[prop as keyof PrismaClient];
  },
});