/**
 * Seed default admin user.
 * Usage: npm run db:seed:default-user
 * Loads .env.local for DEFAULT_USER_* variables.
 */

import { join } from 'path';
import { config } from 'dotenv';
import { query, queryOne } from '@/lib/db/db';
import { hashPassword } from '@/lib/services/auth';

config({ path: join(process.cwd(), '.env.local') });

function getDefaultUser() {
  return {
    email: process.env.DEFAULT_USER_EMAIL || 'superadmin@gmail.com',
    password: process.env.DEFAULT_USER_PASSWORD || 'SuperAdmin@123',
    name: process.env.DEFAULT_USER_NAME || 'Super Admin',
    role: process.env.DEFAULT_USER_ROLE || 'super_admin',
  };
}

export async function seedDefaultUser() {
  const defaultUser = getDefaultUser();
  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM users WHERE email = $1',
    [defaultUser.email.toLowerCase().trim()]
  );
  if (existing) {
    console.log('Default user already exists, skipping seed.');
    return;
  }
  const hashedPassword = await hashPassword(defaultUser.password);
  await query(
    `INSERT INTO users (name, email, password, role, permissions, created_at, updated_at)
     VALUES ($1, $2, $3, $4, '{}'::text[], NOW(), NOW())`,
    [
      defaultUser.name.trim(),
      defaultUser.email.toLowerCase().trim(),
      hashedPassword,
      defaultUser.role,
    ]
  );
  console.log(
    `✓ Default user created: email=${defaultUser.email}, role=${defaultUser.role}`
  );
}

async function run() {
  try {
    console.log('Seeding default user...');
    await seedDefaultUser();
    console.log('Seed completed.');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}
