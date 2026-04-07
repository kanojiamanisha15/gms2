import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission, resolveRequestedGymScope } from '@/lib/services/authorization';
import { insertNotification } from '@/lib/db/notifications';
import type { ICreateExpenseData, IExpenseData, IExpenseRow } from '@/types';

const SORT_FIELDS = {
  category: 'category',
  description: 'description',
  vendor: 'vendor',
  amount: 'amount',
  date: 'date',
  status: 'status',
  gymId: 'gym_id',
} as const;

function mapExpenseRowToResponse(row: IExpenseRow): IExpenseData {
  return {
    id: row.id,
    category: row.category,
    description: row.description,
    amount: parseFloat(row.amount ?? '0'),
    date: row.date,
    status: row.status as IExpenseData['status'],
    vendor: row.vendor,
    gymId: row.gym_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

/** GET /api/expenses - Return paginated list of expenses (requires auth). Query: page, limit, search, startDate, endDate */
export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.EXPENSES_READ);
  if ('error' in authz) return authz.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const scope = resolveRequestedGymScope(authz, searchParams.get('gymId'));
    if (scope.error) return scope.error;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortByRaw = searchParams.get('sortBy') ?? 'date';
    const sortOrderRaw = searchParams.get('sortOrder') ?? 'desc';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '10', 10);
    const sortBy = (sortByRaw in SORT_FIELDS ? sortByRaw : 'date') as keyof typeof SORT_FIELDS;
    const sortOrder = sortOrderRaw.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100);
    const offset = (pageNum - 1) * limitNum;

    const sqlParams: (string | number)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (search?.trim()) {
      conditions.push(
        `(category ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR vendor ILIKE $${paramIndex})`
      );
      sqlParams.push(`%${search.trim()}%`);
      paramIndex++;
    }
    if (startDate?.trim()) {
      conditions.push(`date >= $${paramIndex}::date`);
      sqlParams.push(startDate.trim());
      paramIndex++;
    }
    if (endDate?.trim()) {
      conditions.push(`date <= $${paramIndex}::date`);
      sqlParams.push(endDate.trim());
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
      `SELECT COUNT(*) as total FROM expenses${whereSql}`,
      sqlParams
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);
    const totalPages = Math.ceil(total / limitNum);

    const expensesSql = `
      SELECT id, category, description, amount, date, status, vendor,
             gym_id, created_at, updated_at
      FROM expenses
      ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const expenseRows = await query<IExpenseRow>(expensesSql, [...sqlParams, limitNum, offset]);
    const expenses = expenseRows.map(mapExpenseRowToResponse);

    return NextResponse.json({
      success: true,
      data: {
        expenses,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

/** POST /api/expenses - Create a new expense (requires auth). */
export async function POST(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.EXPENSES_ADD);
  if ('error' in authz) return authz.error;

  try {
    const body = (await request.json()) as ICreateExpenseData;

    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const description = body.description != null ? String(body.description).trim() || null : null;
    const amount = Number(body.amount) ?? 0;
    const date = typeof body.date === 'string' ? body.date.trim() : '';
    const status = typeof body.status === 'string' ? body.status : 'pending';
    const vendor = body.vendor != null ? (String(body.vendor).trim() || null) : null;
    const scope = resolveRequestedGymScope(authz, body.gymId);
    if (scope.error) return scope.error;
    const gymId = scope.gymId;

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category is required' },
        { status: 400 }
      );
    }
    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      );
    }
    const validStatuses = ['paid', 'pending', 'overdue'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be paid, pending, or overdue' },
        { status: 400 }
      );
    }
    if (amount < 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than or equal to 0' },
        { status: 400 }
      );
    }

    const insertSql = `
      INSERT INTO expenses (category, description, amount, date, status, vendor, gym_id)
      VALUES ($1, $2, $3, $4::date, $5, $6, $7)
      RETURNING id, category, description, amount, date, status, vendor, gym_id,
                created_at, updated_at
    `;
    const row = await queryOne<IExpenseRow>(insertSql, [
      category,
      description,
      amount,
      date,
      status,
      vendor,
      gymId,
    ]);

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Failed to create expense' },
        { status: 500 }
      );
    }

    const desc = description || category;
    await insertNotification(
      'Expense Added',
      `${desc} (Rs.${amount.toFixed(2)}) has been recorded.`,
      'info'
    );

    return NextResponse.json({
      success: true,
      data: { expense: mapExpenseRowToResponse(row) },
    });
  } catch (error) {
    console.error('Add expense error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
