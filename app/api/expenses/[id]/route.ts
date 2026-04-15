import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission, resolveRequestedGymScope, resolveGymScope } from '@/lib/services/authorization';
import { insertNotification } from '@/lib/db/notifications';
import type { IUpdateExpenseData, IExpenseData, IExpenseRow } from '@/types';

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

/** GET /api/expenses/[id] - Get a single expense by id (requires auth). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.EXPENSES_UPDATE);
  if ('error' in authz) return authz.error;

  try {
    const scope = resolveGymScope(authz, null);
    if (scope.error) return scope.error;
    const { id } = await params;
    const expenseId = parseInt(id, 10);

    if (!id || isNaN(expenseId)) {
      return NextResponse.json(
        { success: false, error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    const row = await queryOne<IExpenseRow>(
      `SELECT id, category, description, amount, date, status, vendor,
              gym_id, created_at, updated_at
       FROM expenses
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [expenseId, scope.gymId]
    );

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { expense: mapExpenseRowToResponse(row) },
    });
  } catch (error) {
    console.error('Get expense by ID error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expense' },
      { status: 500 }
    );
  }
}

/** PUT /api/expenses/[id] - Update an expense by id (requires auth). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.EXPENSES_UPDATE);
  if ('error' in authz) return authz.error;

  try {
    const baseScope = resolveGymScope(authz, null);
    if (baseScope.error) return baseScope.error;
    const { id } = await params;
    const expenseId = parseInt(id, 10);

    if (!id || isNaN(expenseId)) {
      return NextResponse.json(
        { success: false, error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as IUpdateExpenseData;

    const category = body.category != null ? String(body.category).trim() : undefined;
    const description = body.description != null ? (String(body.description).trim() || null) : undefined;
    const amount = body.amount != null ? Number(body.amount) : undefined;
    const date = body.date != null ? String(body.date).trim() : undefined;
    const status = body.status;
    const vendor = body.vendor != null ? (String(body.vendor).trim() || null) : undefined;
    const writeScope = resolveRequestedGymScope(authz, body.gymId, { allowUndefined: true });
    if (writeScope.error) return writeScope.error;
    const gymId = writeScope.gymId;

    const validStatuses = ['paid', 'pending', 'overdue'];
    if (status != null && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be paid, pending, or overdue' },
        { status: 400 }
      );
    }
    if (amount != null && amount < 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than or equal to 0' },
        { status: 400 }
      );
    }

    const existing = await queryOne<IExpenseRow>(
      `SELECT id, category, description, amount, date, status, vendor, gym_id
       FROM expenses
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [expenseId, baseScope.gymId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    if (authz.isSuperAdmin) {
      const effectiveGymId = gymId !== undefined ? gymId : existing.gym_id;
      if (effectiveGymId == null) {
        return NextResponse.json(
          { success: false, error: 'Gym is required for super admin' },
          { status: 400 }
        );
      }
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      values.push(amount);
      paramIndex++;
    }
    if (date !== undefined) {
      updates.push(`date = $${paramIndex}::date`);
      values.push(date);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (vendor !== undefined) {
      updates.push(`vendor = $${paramIndex}`);
      values.push(vendor);
      paramIndex++;
    }
    if (gymId !== undefined) {
      updates.push(`gym_id = $${paramIndex}`);
      values.push(gymId);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: true,
        data: { expense: mapExpenseRowToResponse(existing) },
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(expenseId);

    const updateSql = `
      UPDATE expenses
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, category, description, amount, date, status, vendor,
                gym_id, created_at, updated_at
    `;
    const row = await queryOne<IExpenseRow>(updateSql, values);

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Failed to update expense' },
        { status: 500 }
      );
    }

    const desc = row.description || row.category;
    await insertNotification(
      'Expense Updated',
      `${desc} (Rs.${parseFloat(row.amount ?? '0').toFixed(2)}) has been updated.`,
      'info'
    );

    return NextResponse.json({
      success: true,
      data: { expense: mapExpenseRowToResponse(row) },
    });
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

/** DELETE /api/expenses/[id] - Delete an expense by id (requires auth). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.EXPENSES_DELETE);
  if ('error' in authz) return authz.error;

  try {
    const scope = resolveGymScope(authz, null);
    if (scope.error) return scope.error;
    const { id } = await params;
    const expenseId = parseInt(id, 10);

    if (!id || isNaN(expenseId)) {
      return NextResponse.json(
        { success: false, error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    const existing = await queryOne<IExpenseRow>(
      `SELECT id, category, description, amount FROM expenses
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [expenseId, scope.gymId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    await query(
      `DELETE FROM expenses
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [expenseId, scope.gymId]
    );

    const desc = existing.description || existing.category;
    await insertNotification(
      'Expense Deleted',
      `${desc} (Rs.${parseFloat(existing.amount ?? '0').toFixed(2)}) has been removed.`,
      'info'
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Expense deleted successfully' },
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
