import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission, resolveRequestedGymScope, resolveGymScope } from '@/lib/services/authorization';
import { insertNotification } from '@/lib/db/notifications';
import { normalizePhoneToIndia } from '@/lib/helpers';
import type { ITrainerData, ITrainerRow } from '@/types';

const SORT_FIELDS = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  role: 'role',
  hireDate: 'hire_date',
  status: 'status',
  gymId: 'gym_id',
} as const;

function mapTrainerRowToResponse(row: ITrainerRow): ITrainerData {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    hireDate: row.hire_date,
    status: row.status,
    gymId: row.gym_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

/** GET /api/trainers - Return paginated list of trainers (requires auth). Query: page, limit, search */
export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.TRAINERS_READ);
  if ('error' in authz) return authz.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const scope = resolveRequestedGymScope(authz, searchParams.get('gymId'));
    if (scope.error) return scope.error;
    const sortByRaw = searchParams.get('sortBy') ?? 'hireDate';
    const sortOrderRaw = searchParams.get('sortOrder') ?? 'desc';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '10', 10);
    const sortBy = (sortByRaw in SORT_FIELDS ? sortByRaw : 'hireDate') as keyof typeof SORT_FIELDS;
    const sortOrder = sortOrderRaw.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100);
    const offset = (pageNum - 1) * limitNum;

    const sqlParams: (string | number)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (search?.trim()) {
      conditions.push(
        `(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`
      );
      sqlParams.push(`%${search.trim()}%`);
      paramIndex++;
    }
    if (scope.gymId != null) {
      conditions.push(`gym_id = $${paramIndex}`);
      sqlParams.push(scope.gymId);
      paramIndex++;
    }

    const whereSql = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    const orderBySql = `${SORT_FIELDS[sortBy]} ${sortOrder}, id DESC`;

    const countRows = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM trainers${whereSql}`,
      sqlParams
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);
    const totalPages = Math.ceil(total / limitNum);

    const trainersSql = `
      SELECT id, name, email, phone, role, hire_date, status,
             gym_id, created_at, updated_at
      FROM trainers
      ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const trainerRows = await query<ITrainerRow>(trainersSql, [...sqlParams, limitNum, offset]);
    const trainers = trainerRows.map(mapTrainerRowToResponse);

    return NextResponse.json({
      success: true,
      data: {
        trainers,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get trainers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trainers' },
      { status: 500 }
    );
  }
}

/** POST /api/trainers - Create a new trainer (requires auth). */
export async function POST(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.TRAINERS_ADD);
  if ('error' in authz) return authz.error;

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string | null;
      role?: string;
      hireDate?: string;
      status?: string;
      gymId?: number | null;
    };

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = body.email != null ? (String(body.email).trim() || null) : null;
    const phoneRaw = body.phone != null ? (String(body.phone).trim() || null) : null;
    const phone = normalizePhoneToIndia(phoneRaw);
    const roleRaw = body.role ?? 'Trainer';
    const role = roleRaw === 'Staff' ? 'Staff' : 'Trainer';
    const hireDateRaw = body.hireDate ?? new Date().toISOString().split('T')[0];
    const hireDate = String(hireDateRaw).trim();
    const status = body.status === 'inactive' ? 'inactive' : 'active';
    const scope = resolveRequestedGymScope(authz, body.gymId);
    if (scope.error) return scope.error;
    const gymId = scope.gymId;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone is required' },
        { status: 400 }
      );
    }
    if (!hireDate) {
      return NextResponse.json(
        { success: false, error: 'Hire date is required' },
        { status: 400 }
      );
    }
    if (authz.isSuperAdmin && gymId == null) {
      return NextResponse.json(
        { success: false, error: 'Gym is required for super admin' },
        { status: 400 }
      );
    }

    const insertSql = `
      INSERT INTO trainers (name, email, phone, role, hire_date, status, gym_id)
      VALUES ($1, $2, $3, $4, $5::date, $6, $7)
      RETURNING id, name, email, phone, role, hire_date, status, gym_id,
                created_at, updated_at
    `;
    const trainerRow = await queryOne<ITrainerRow>(insertSql, [
      name,
      email ?? '',
      phone,
      role,
      hireDate,
      status,
      gymId,
    ]);

    if (!trainerRow) {
      return NextResponse.json(
        { success: false, error: 'Failed to create trainer' },
        { status: 500 }
      );
    }

    await insertNotification(
      'New Trainer Added',
      `${name} has been added as a new ${role.toLowerCase()}.`,
      'info'
    );

    return NextResponse.json({
      success: true,
      data: { trainer: mapTrainerRowToResponse(trainerRow) },
    });
  } catch (error) {
    console.error('Add trainer error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create trainer';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
