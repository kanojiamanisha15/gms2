import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission, resolveRequestedGymScope, resolveGymScope } from '@/lib/services/authorization';
import { insertNotification } from '@/lib/db/notifications';
import type { IUpdateMembershipPlanData, IMembershipPlanData, IMembershipPlanRow } from '@/types';

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

/** GET /api/membership-plans/[id] - Get a single plan by id (requires auth). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERSHIP_PLANS_UPDATE);
  if ('error' in authz) return authz.error;

  try {
    const scope = resolveGymScope(authz, null);
    if (scope.error) return scope.error;
    const { id } = await params;
    const planId = parseInt(id, 10);

    if (!id || isNaN(planId)) {
      return NextResponse.json(
        { success: false, error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const row = await queryOne<IMembershipPlanRow>(
      `SELECT id, name, price, duration_days, features, status,
              gym_id, created_at, updated_at
       FROM membership_plans
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [planId, scope.gymId]
    );

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { plan: mapPlanRowToResponse(row) },
    });
  } catch (error) {
    console.error('Get membership plan by ID error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch membership plan' },
      { status: 500 }
    );
  }
}

/** PUT /api/membership-plans/[id] - Update a plan by id (requires auth). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERSHIP_PLANS_UPDATE);
  if ('error' in authz) return authz.error;

  try {
    const baseScope = resolveGymScope(authz, null);
    if (baseScope.error) return baseScope.error;
    const { id } = await params;
    const planId = parseInt(id, 10);

    if (!id || isNaN(planId)) {
      return NextResponse.json(
        { success: false, error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as IUpdateMembershipPlanData;

    const name = body.name != null ? String(body.name).trim() : undefined;
    const price = body.price != null ? Number(body.price) : undefined;
    const duration = body.duration != null ? String(body.duration).trim() : undefined;
    const features = body.features !== undefined
      ? (body.features != null && String(body.features).trim() ? String(body.features).trim() : null)
      : undefined;
    const status = body.status;
    const writeScope = resolveRequestedGymScope(authz, body.gymId, { allowUndefined: true });
    if (writeScope.error) return writeScope.error;
    const gymId = writeScope.gymId;

    const validStatuses = ['active', 'inactive'];
    if (status != null && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be active or inactive' },
        { status: 400 }
      );
    }
    if (price != null && price < 0) {
      return NextResponse.json(
        { success: false, error: 'Price must be greater than or equal to 0' },
        { status: 400 }
      );
    }

    const existing = await queryOne<IMembershipPlanRow>(
      `SELECT id, name, price, duration_days, features, status, gym_id
       FROM membership_plans
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [planId, baseScope.gymId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      values.push(price);
      paramIndex++;
    }
    if (duration !== undefined) {
      updates.push(`duration_days = $${paramIndex}`);
      values.push(duration);
      paramIndex++;
    }
    if (features !== undefined) {
      updates.push(`features = $${paramIndex}`);
      values.push(features);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
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
        data: { plan: mapPlanRowToResponse(existing) },
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(planId);

    const updateSql = `
      UPDATE membership_plans
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, price, duration_days, features, status,
                gym_id, created_at, updated_at
    `;
    const row = await queryOne<IMembershipPlanRow>(updateSql, values);

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Failed to update membership plan' },
        { status: 500 }
      );
    }

    await insertNotification(
      'Membership Plan Updated',
      `Membership plan "${row.name}" has been updated.`,
      'info'
    );

    return NextResponse.json({
      success: true,
      data: { plan: mapPlanRowToResponse(row) },
    });
  } catch (error) {
    console.error('Update membership plan error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update membership plan' },
      { status: 500 }
    );
  }
}

/** DELETE /api/membership-plans/[id] - Delete a plan by id (requires auth). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERSHIP_PLANS_DELETE);
  if ('error' in authz) return authz.error;

  try {
    const scope = resolveGymScope(authz, null);
    if (scope.error) return scope.error;
    const { id } = await params;
    const planId = parseInt(id, 10);

    if (!id || isNaN(planId)) {
      return NextResponse.json(
        { success: false, error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const existing = await queryOne<IMembershipPlanRow>(
      `SELECT id, name FROM membership_plans
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [planId, scope.gymId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    await query(
      `DELETE FROM membership_plans
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [planId, scope.gymId]
    );

    await insertNotification(
      'Membership Plan Deleted',
      `Membership plan "${existing.name}" has been removed.`,
      'info'
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Membership plan deleted successfully' },
    });
  } catch (error) {
    console.error('Delete membership plan error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete membership plan' },
      { status: 500 }
    );
  }
}
