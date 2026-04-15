import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission } from '@/lib/services/authorization';
import type { ICreateGymData, IGymData, IGymRow } from '@/types';

const DUPLICATE_GYM_MESSAGE =
  'A gym with this name and address already exists';
const SORT_FIELDS = {
  gymId: 'gym_id',
  gymName: 'gym_name',
  address: 'address',
} as const;

function isPgUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '23505'
  );
}

function mapGymRowToResponse(row: IGymRow): IGymData {
  return {
    gymId: row.gym_id,
    gymName: row.gym_name,
    address: row.address,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

/** GET /api/gyms */
export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.GYMS_READ);
  if ('error' in authz) return authz.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const sortByRaw = searchParams.get('sortBy') ?? 'gymId';
    const sortOrderRaw = searchParams.get('sortOrder') ?? 'asc';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '10', 10);
    const sortBy = (sortByRaw in SORT_FIELDS ? sortByRaw : 'gymId') as keyof typeof SORT_FIELDS;
    const sortOrder = sortOrderRaw.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100);
    const offset = (pageNum - 1) * limitNum;

    const sqlParams: (string | number)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (search?.trim()) {
      conditions.push(
        `(gym_name ILIKE $${paramIndex} OR address ILIKE $${paramIndex} OR gym_id::text ILIKE $${paramIndex})`
      );
      sqlParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereSql = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    const orderBySql = `${SORT_FIELDS[sortBy]} ${sortOrder}, gym_id ASC`;

    const countRows = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM gyms${whereSql}`,
      sqlParams
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);
    const totalPages = Math.ceil(total / limitNum);

    const gymsSql = `
      SELECT gym_id, gym_name, address, created_at, updated_at
      FROM gyms
      ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const rows = await query<IGymRow>(gymsSql, [...sqlParams, limitNum, offset]);

    return NextResponse.json({
      success: true,
      data: {
        gyms: rows.map(mapGymRowToResponse),
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get gyms error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gyms' },
      { status: 500 }
    );
  }
}

/** POST /api/gyms */
export async function POST(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.GYMS_ADD);
  if ('error' in authz) return authz.error;

  try {
    const body = (await request.json()) as ICreateGymData;
    const gymName = typeof body.gymName === 'string' ? body.gymName.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';

    if (!gymName) {
      return NextResponse.json({ success: false, error: 'Gym name is required' }, { status: 400 });
    }
    if (!address) {
      return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 });
    }

    const duplicate = await queryOne<{ gym_id: number }>(
      `SELECT gym_id FROM gyms WHERE gym_name = $1 AND address = $2 LIMIT 1`,
      [gymName, address]
    );
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: DUPLICATE_GYM_MESSAGE },
        { status: 409 }
      );
    }

    const row = await queryOne<IGymRow>(
      `INSERT INTO gyms (gym_name, address)
       VALUES ($1, $2)
       RETURNING gym_id, gym_name, address, created_at, updated_at`,
      [gymName, address]
    );

    if (!row) {
      return NextResponse.json({ success: false, error: 'Failed to create gym' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { gym: mapGymRowToResponse(row) },
    });
  } catch (error) {
    console.error('Create gym error:', error);
    if (isPgUniqueViolation(error)) {
      return NextResponse.json(
        { success: false, error: DUPLICATE_GYM_MESSAGE },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create gym' },
      { status: 500 }
    );
  }
}
