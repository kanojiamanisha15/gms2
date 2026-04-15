import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { ALL_PERMISSION_KEYS, PERMISSIONS } from '@/lib/constants/permissions';
import {
  isSuperAdminRole,
  ROLE_KEYS,
  SUPER_ADMIN_ROLE,
  type RoleKey,
} from '@/lib/constants/roles';
import {
  requireAnyPermission,
  requirePermission,
  requireSuperAdmin,
} from '@/lib/services/authorization';
import {
  demoteOtherSuperAdmins,
} from '@/lib/services/super-admin-role';
import { hashPassword } from '@/lib/services/auth';

type UserRow = {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  created_at: Date;
  updated_at: Date;
  gym_id: number | null;
  gym_name: string | null;
};

function mapUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    gymId: row.gym_id,
    gymName: row.gym_name,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

async function fetchUserWithGym(targetId: number) {
  return queryOne<UserRow>(
    `SELECT u.id, u.email, u.name, u.role, u.permissions, u.created_at, u.updated_at,
            u.gym_id, g.gym_name
     FROM users u
     LEFT JOIN gyms g ON u.gym_id = g.gym_id
     WHERE u.id = $1`,
    [targetId]
  );
}

function isAllowedRoleKey(r: string): r is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(r);
}

/**
 * GET /api/admin/users/[id]
 * Fetch one user (allowed for users.read OR user-permission management OR role management).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireAnyPermission(request, [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_MANAGE_PERMISSIONS,
    PERMISSIONS.SYSTEM_MANAGE_ROLES,
  ]);
  if ('error' in authz) return authz.error;

  try {
    const { id } = await params;
    const targetId = parseInt(id, 10);
    if (!id || isNaN(targetId)) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const row = await fetchUserWithGym(targetId);

    if (!row) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { user: mapUser(row) },
    });
  } catch (error) {
    console.error('Get admin user error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch user' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update name/email/role/password/permissions.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireAnyPermission(request, [
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_MANAGE_PERMISSIONS,
    PERMISSIONS.SYSTEM_MANAGE_ROLES,
  ]);
  if ('error' in authz) return authz.error;

  try {
    const { id } = await params;
    const targetId = parseInt(id, 10);
    if (!id || isNaN(targetId)) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const target = await queryOne<{ id: number; role: string; gym_id: number | null }>(
      `SELECT id, role, gym_id FROM users WHERE id = $1`,
      [targetId]
    );

    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Disallow editing super admin accounts through this endpoint.
    if (isSuperAdminRole(target.role)) {
      return NextResponse.json(
        { success: false, error: 'Super admin accounts cannot be modified from this endpoint' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      role?: string;
      password?: string;
      permissions?: string[];
      gymId?: number | string | null;
    };

    const sets: string[] = [];
    const vals: unknown[] = [];
    let p = 1;

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ success: false, error: 'Name cannot be empty' }, { status: 400 });
      }
      sets.push(`name = $${p++}`);
      vals.push(name);
    }

    if (body.email !== undefined) {
      const email = String(body.email).toLowerCase().trim();
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email cannot be empty' }, { status: 400 });
      }

      const dup = await queryOne<{ id: number }>(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [email, targetId]
      );
      if (dup) {
        return NextResponse.json({ success: false, error: 'Email is already in use' }, { status: 400 });
      }

      sets.push(`email = $${p++}`);
      vals.push(email);
    }

    let nextRole = target.role;
    if (body.role !== undefined) {
      const roleCheck = await requirePermission(request, PERMISSIONS.SYSTEM_MANAGE_ROLES);
      if ('error' in roleCheck) return roleCheck.error;

      const role = typeof body.role === 'string' ? body.role.trim().toLowerCase() : '';
      if (!role || !isAllowedRoleKey(role)) {
        return NextResponse.json(
          { success: false, error: `Invalid role. Allowed: ${ROLE_KEYS.join(', ')}` },
          { status: 400 }
        );
      }

      if (role === SUPER_ADMIN_ROLE) {
        const sup = await requireSuperAdmin(request);
        if ('error' in sup) return sup.error;
        await demoteOtherSuperAdmins(targetId);
      }

      nextRole = role;
      sets.push(`role = $${p++}`);
      vals.push(role);
    }

    if (body.password !== undefined) {
      const password = String(body.password).trim();
      if (password.length > 0) {
        if (password.length < 6) {
          return NextResponse.json(
            { success: false, error: 'Password must be at least 6 characters' },
            { status: 400 }
          );
        }
        sets.push(`password = $${p++}`);
        vals.push(await hashPassword(password));
      }
    }

    if (body.permissions !== undefined) {
      const permissionsCheck = await requirePermission(request, PERMISSIONS.USERS_MANAGE_PERMISSIONS);
      if ('error' in permissionsCheck) return permissionsCheck.error;

      if (!Array.isArray(body.permissions)) {
        return NextResponse.json(
          { success: false, error: 'permissions must be an array' },
          { status: 400 }
        );
      }

      const normalized = Array.from(
        new Set(body.permissions.map((p) => String(p).trim()).filter(Boolean))
      );

      for (const permission of normalized) {
        if (!ALL_PERMISSION_KEYS.includes(permission as (typeof ALL_PERMISSION_KEYS)[number])) {
          return NextResponse.json(
            { success: false, error: `Unknown permission: ${permission}` },
            { status: 400 }
          );
        }
      }

      sets.push(`permissions = $${p++}::text[]`);
      vals.push(normalized);
    }

    let nextGymId: number | null = target.gym_id;
    if (body.gymId !== undefined) {
      if (body.gymId === null || body.gymId === '') {
        nextGymId = null;
        sets.push(`gym_id = NULL`);
      } else {
        const n =
          typeof body.gymId === 'number'
            ? body.gymId
            : parseInt(String(body.gymId).trim(), 10);
        if (!Number.isFinite(n) || n < 1) {
          return NextResponse.json(
            { success: false, error: 'Invalid gym selected' },
            { status: 400 }
          );
        }
        const gymRow = await queryOne<{ gym_id: number }>(
          `SELECT gym_id FROM gyms WHERE gym_id = $1`,
          [n]
        );
        if (!gymRow) {
          return NextResponse.json({ success: false, error: 'Invalid gym selected' }, { status: 400 });
        }
        nextGymId = gymRow.gym_id;
        sets.push(`gym_id = $${p++}`);
        vals.push(gymRow.gym_id);
      }
    }

    if ((nextRole === 'user' || nextRole === 'manager') && nextGymId == null) {
      return NextResponse.json(
        { success: false, error: 'Gym is required for role user or manager' },
        { status: 400 }
      );
    }

    // Nothing to update: return current user state.
    if (sets.length === 0) {
      const row = await fetchUserWithGym(targetId);
      return NextResponse.json({
        success: true,
        data: { user: row ? mapUser(row) : undefined },
      });
    }

    sets.push(`updated_at = NOW()`);
    vals.push(targetId);

    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}
                 RETURNING id`;

    const updatedId = await queryOne<{ id: number }>(sql, vals);
    if (!updatedId) {
      return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
    }

    const updated = await fetchUserWithGym(updatedId.id);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { user: mapUser(updated) },
    });
  } catch (error: unknown) {
    const e = error as { code?: string; constraint?: string; message?: string };
    if (e.code === '23505' && e.constraint === 'users_one_super_admin_role') {
      return NextResponse.json({ success: false, error: 'Another super admin already exists' }, { status: 409 });
    }
    console.error('Patch admin user error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user (cannot delete super admin or yourself).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requireAnyPermission(request, [
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.SYSTEM_MANAGE_ROLES,
  ]);
  if ('error' in authz) return authz.error;

  try {
    const { id } = await params;
    const targetId = parseInt(id, 10);
    if (!id || isNaN(targetId)) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    if (authz.userId === targetId) {
      return NextResponse.json({ success: false, error: 'You cannot delete your own account' }, { status: 400 });
    }

    const target = await queryOne<{ id: number; role: string }>(
      `SELECT id, role FROM users WHERE id = $1`,
      [targetId]
    );
    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    if (isSuperAdminRole(target.role)) {
      return NextResponse.json({ success: false, error: 'Super admin accounts cannot be deleted' }, { status: 403 });
    }

    await query(`DELETE FROM users WHERE id = $1`, [targetId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete admin user error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete user' }, { status: 500 });
  }
}

