/** Role keys stored in `users.role` (single global super admin enforced in DB + API). */
export const ROLE_KEYS = ['user', 'manager', 'admin', 'super_admin'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

/** Human-readable labels for UI (select trigger, tables, etc.). */
export const ROLE_LABELS: Record<RoleKey, string> = {
  user: 'User',
  manager: 'Manager',
  admin: 'Admin',
  super_admin: 'Super admin',
};

export const SUPER_ADMIN_ROLE = 'super_admin' as const;

export function isSuperAdminRole(role: string): boolean {
  return role === SUPER_ADMIN_ROLE;
}
