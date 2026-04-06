import { query, queryOne } from '@/lib/db/db';
import { SUPER_ADMIN_ROLE } from '@/lib/constants/roles';

/** Other accounts lose super admin (become admin). */
export async function demoteOtherSuperAdmins(keepUserId: number): Promise<void> {
  await query(
    `UPDATE users SET role = 'admin', updated_at = NOW()
     WHERE role = $1 AND id <> $2`,
    [SUPER_ADMIN_ROLE, keepUserId]
  );
}

export async function countSuperAdmins(): Promise<number> {
  const row = await queryOne<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM users WHERE role = $1`,
    [SUPER_ADMIN_ROLE]
  );
  return parseInt(row?.n ?? '0', 10);
}

/** Block demotion when this user is the only super admin. */
export async function assertNotOnlySuperAdmin(userId: number): Promise<void> {
  const row = await queryOne<{ role: string }>(
    `SELECT role FROM users WHERE id = $1`,
    [userId]
  );
  if (row?.role !== SUPER_ADMIN_ROLE) return;
  const n = await countSuperAdmins();
  if (n <= 1) {
    throw new Error('LAST_SUPER_ADMIN');
  }
}
