// prisma/seed.ts
import { seedDefaultUser } from '@/lib/db/seeds/default-user';

async function main() {
  await seedDefaultUser();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});