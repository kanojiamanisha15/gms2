import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission, resolveRequestedGymScope } from '@/lib/services/authorization';
import { insertNotification } from '@/lib/db/notifications';
import type { IMembershipPlanData, IMembershipPlanRow } from '@/types';

const SORT_FIELDS = {
  name: 'name',
  price: 'price',
  duration: 'duration_days',
  features: 'features',
  status: 'status',
  gymId: 'gym_id',
} as const;

function mapPlanRowToResponse(row: IMembershipPlanRow): IMembershipPlanData {
  return {
    id: row.id,
    name: row.name,
    price: parseFloat(row.price ?? '0'),
    duration: row.duration_days,
    features: row.features,
    status: row.status,
    gymId: row.gym_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

/** GET /api/membership-plans - Return paginated list of plans (requires auth). Query: page, limit, search */
export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERSHIP_PLANS_READ);
  if ('error' in authz) return authz.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const scope = resolveRequestedGymScope(authz, searchParams.get('gymId'));
    if (scope.error) return scope.error;
    const sortByRaw = searchParams.get('sortBy') ?? 'name';
    const sortOrderRaw = searchParams.get('sortOrder') ?? 'asc';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '10', 10);
    const sortBy = (sortByRaw in SORT_FIELDS ? sortByRaw : 'name') as keyof typeof SORT_FIELDS;
    const sortOrder = sortOrderRaw.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100);
    const offset = (pageNum - 1) * limitNum;

    const sqlParams: (string | number)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (search?.trim()) {
      conditions.push(
        `(name ILIKE $${paramIndex} OR features ILIKE $${paramIndex})`
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
    const orderBySql = `${SORT_FIELDS[sortBy]} ${sortOrder}, id ASC`;

    const countRows = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM membership_plans${whereSql}`,
      sqlParams
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);
    const totalPages = Math.ceil(total / limitNum);

    const plansSql = `
      SELECT id, name, price, duration_days, features, status,
             gym_id, created_at, updated_at
      FROM membership_plans
      ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const planRows = await query<IMembershipPlanRow>(plansSql, [...sqlParams, limitNum, offset]);
    const plans = planRows.map(mapPlanRowToResponse);

    return NextResponse.json({
      success: true,
      data: {
        plans,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get membership plans error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch membership plans' },
      { status: 500 }
    );
  }
}

/** POST /api/membership-plans - Create a new plan (requires auth). */
export async function POST(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERSHIP_PLANS_ADD);
  if ('error' in authz) return authz.error;

  try {
    const body = (await request.json()) as {
      name?: string;
      price?: number;
      duration?: string;
      features?: string | null;
      status?: string;
      gymId?: number | null;
    };

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const price = Number(body.price) ?? 0;
    const duration = typeof body.duration === 'string' ? body.duration.trim() : '';
    const features = body.features != null ? (String(body.features).trim() || null) : null;
    const status = body.status === 'inactive' ? 'inactive' : 'active';
    const scope = resolveRequestedGymScope(authz, body.gymId);
    if (scope.error) return scope.error;
    const gymId = scope.gymId;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Plan name is required' },
        { status: 400 }
      );
    }
    if (price < 0) {
      return NextResponse.json(
        { success: false, error: 'Price must be greater than or equal to 0' },
        { status: 400 }
      );
    }
    if (!duration) {
      return NextResponse.json(
        { success: false, error: 'Duration is required' },
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
      INSERT INTO membership_plans (name, price, duration_days, features, status, gym_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, price, duration_days, features, status, gym_id,
                created_at, updated_at
    `;
    const planRow = await queryOne<IMembershipPlanRow>(insertSql, [
      name,
      price,
      duration,
      features,
      status,
      gymId,
    ]);

    if (!planRow) {
      return NextResponse.json(
        { success: false, error: 'Failed to create membership plan' },
        { status: 500 }
      );
    }

    await insertNotification(
      'Membership Plan Created',
      `New membership plan "${name}" (Rs.${price}) has been added.`,
      'info'
    );

    return NextResponse.json({
      success: true,
      data: { plan: mapPlanRowToResponse(planRow) },
    });
  } catch (error) {
    console.error('Add membership plan error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create membership plan';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
