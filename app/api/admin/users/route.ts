import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requireAnyPermission, requirePermission } from '@/lib/services/authorization';
import { hashPassword } from '@/lib/services/auth';

const CREATABLE_ROLES = ['user', 'manager', 'admin'] as const;
const SORT_FIELDS = {
  id: 'u.id',
  name: 'u.name',
  email: 'u.email',
  gym: 'COALESCE(g.gym_name, \'\')',
  role: 'u.role',
  created_at: 'u.created_at',
} as const;

function isCreatableRole(r: string): r is (typeof CREATABLE_ROLES)[number] {
  return (CREATABLE_ROLES as readonly string[]).includes(r);
}

/** GET /api/admin/users — list users (requires users.read/users.manage_permissions/system.manage_roles, or super admin). */
export async function GET(request: NextRequest) {
  const authz = await requireAnyPermission(request, [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_MANAGE_PERMISSIONS,
    PERMISSIONS.SYSTEM_MANAGE_ROLES,
  ]);
  if ('error' in authz) {
    return authz.error;
  }

  try {
    const sortByRaw = request.nextUrl.searchParams.get('sortBy') ?? 'id';
    const sortOrderRaw = request.nextUrl.searchParams.get('sortOrder') ?? 'asc';
    const sortBy = (sortByRaw in SORT_FIELDS ? sortByRaw : 'id') as keyof typeof SORT_FIELDS;
    const sortOrder = sortOrderRaw.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const orderByClause = `${SORT_FIELDS[sortBy]} ${sortOrder}, u.id ASC`;

    const rows = await query<{
      id: number;
      email: string;
      name: string;
      role: string;
      permissions: string[];
      gym_id: number | null;
      gym_name: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT u.id, u.email, u.name, u.role, u.permissions, u.gym_id, g.gym_name,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN gyms g ON u.gym_id = g.gym_id
       ORDER BY ${orderByClause}`
    );

    return NextResponse.json({
      success: true,
      data: {
        users: rows.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          permissions: Array.isArray(u.permissions) ? u.permissions : [],
          gymId: u.gym_id,
          gymName: u.gym_name,
          created_at:
            u.created_at instanceof Date ? u.created_at.toISOString() : String(u.created_at),
          updated_at:
            u.updated_at instanceof Date ? u.updated_at.toISOString() : String(u.updated_at),
        })),
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list users' },
      { status: 500 }
    );
  }
}

/** POST /api/admin/users — create user (requires users.add or system.manage_roles; role changes need system.manage_roles). */
export async function POST(request: NextRequest) {
  const authz = await requireAnyPermission(request, [
    PERMISSIONS.USERS_ADD,
    PERMISSIONS.SYSTEM_MANAGE_ROLES,
  ]);
  if ('error' in authz) {
    return authz.error;
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      gymId?: number | string | null;
    };

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    let role = typeof body.role === 'string' ? body.role.trim().toLowerCase() : 'user';

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (role !== 'user') {
      const roleAuth = await requirePermission(request, PERMISSIONS.SYSTEM_MANAGE_ROLES);
      if ('error' in roleAuth) {
        return roleAuth.error;
      }
    }

    if (!isCreatableRole(role)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid role. Allowed: ${CREATABLE_ROLES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    let gymFk: number | null = null;
    if (body.gymId !== undefined && body.gymId !== null && String(body.gymId).trim() !== '') {
      const n =
        typeof body.gymId === 'number'
          ? body.gymId
          : parseInt(String(body.gymId).trim(), 10);
      if (!Number.isFinite(n) || n < 1) {
        return NextResponse.json({ success: false, error: 'Invalid gym selected' }, { status: 400 });
      }
      const gymRow = await queryOne<{ gym_id: number }>(
        `SELECT gym_id FROM gyms WHERE gym_id = $1`,
        [n]
      );
      if (!gymRow) {
        return NextResponse.json({ success: false, error: 'Invalid gym selected' }, { status: 400 });
      }
      gymFk = gymRow.gym_id;
    }

    const dup = await queryOne<{ id: number }>(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );
    if (dup) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const hashed = await hashPassword(password);
    const inserted = await queryOne<{ id: number }>(
      `INSERT INTO users (name, email, password, role, gym_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [name, email, hashed, role, gymFk]
    );

    if (!inserted) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const row = await queryOne<{
      id: number;
      email: string;
      name: string;
      role: string;
      permissions: string[];
      gym_id: number | null;
      gym_name: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT u.id, u.email, u.name, u.role, u.permissions, u.gym_id, g.gym_name,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN gyms g ON u.gym_id = g.gym_id
       WHERE u.id = $1`,
      [inserted.id]
    );

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: row.id,
            email: row.email,
            name: row.name,
            role: row.role,
            permissions: Array.isArray(row.permissions) ? row.permissions : [],
            gymId: row.gym_id,
            gymName: row.gym_name,
            created_at:
              row.created_at instanceof Date
                ? row.created_at.toISOString()
                : String(row.created_at),
            updated_at:
              row.updated_at instanceof Date
                ? row.updated_at.toISOString()
                : String(row.updated_at),
          },
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      );
    }
    console.error('Create admin user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
