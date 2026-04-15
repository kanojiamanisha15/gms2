import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission, resolveRequestedGymScope, resolveGymScope } from '@/lib/services/authorization';
import { insertNotification } from '@/lib/db/notifications';
import { normalizePhoneToIndia } from '@/lib/helpers';
import type { IUpdateTrainerData, ITrainerData, ITrainerRow } from '@/types';

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

/** GET /api/trainers/[id] - Get a single trainer by numeric id (requires auth). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.TRAINERS_UPDATE);
  if ('error' in authz) return authz.error;

  try {
    const scope = resolveGymScope(authz, null);
    if (scope.error) return scope.error;
    const { id } = await params;
    const trainerId = parseInt(id, 10);

    if (!id || isNaN(trainerId)) {
      return NextResponse.json(
        { success: false, error: 'Trainer ID is required' },
        { status: 400 }
      );
    }

    const row = await queryOne<ITrainerRow>(
      `SELECT id, name, email, phone, role, hire_date, status,
              gym_id, created_at, updated_at
       FROM trainers
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [trainerId, scope.gymId]
    );

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Trainer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { trainer: mapTrainerRowToResponse(row) },
    });
  } catch (error) {
    console.error('Get trainer by ID error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trainer' },
      { status: 500 }
    );
  }
}

/** PUT /api/trainers/[id] - Update a trainer by id (requires auth). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.TRAINERS_UPDATE);
  if ('error' in authz) return authz.error;

  try {
    const baseScope = resolveGymScope(authz, null);
    if (baseScope.error) return baseScope.error;
    const { id } = await params;
    const trainerId = parseInt(id, 10);

    if (!id || isNaN(trainerId)) {
      return NextResponse.json(
        { success: false, error: 'Trainer ID is required' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as IUpdateTrainerData;

    const name = body.name != null ? String(body.name).trim() : undefined;
    const email = body.email !== undefined
      ? (body.email != null && String(body.email).trim() ? String(body.email).trim() : null)
      : undefined;
    const phoneRaw = body.phone != null ? (String(body.phone).trim() || null) : undefined;
    const phone = phoneRaw != null ? normalizePhoneToIndia(phoneRaw) ?? undefined : undefined;
    const role = body.role;
    const hireDate = body.hireDate != null ? String(body.hireDate).trim() : undefined;
    const status = body.status;
    const writeScope = resolveRequestedGymScope(authz, body.gymId, { allowUndefined: true });
    if (writeScope.error) return writeScope.error;
    const gymId = writeScope.gymId;

    const validRoles = ['Trainer', 'Staff'];
    if (role != null && !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Role must be Trainer or Staff' },
        { status: 400 }
      );
    }
    const validStatuses = ['active', 'inactive'];
    if (status != null && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be active or inactive' },
        { status: 400 }
      );
    }

    const existing = await queryOne<ITrainerRow>(
      `SELECT id, name, email, phone, role, hire_date, status, gym_id
       FROM trainers
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [trainerId, baseScope.gymId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Trainer not found' },
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
    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone);
      paramIndex++;
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }
    if (hireDate !== undefined) {
      updates.push(`hire_date = $${paramIndex}::date`);
      values.push(hireDate);
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
        data: { trainer: mapTrainerRowToResponse(existing) },
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(trainerId);

    const updateSql = `
      UPDATE trainers
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, phone, role, hire_date, status,
                gym_id, created_at, updated_at
    `;
    const row = await queryOne<ITrainerRow>(updateSql, values);

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Failed to update trainer' },
        { status: 500 }
      );
    }

    await insertNotification(
      'Trainer Updated',
      `${row.name}'s record has been updated.`,
      'info'
    );

    return NextResponse.json({
      success: true,
      data: { trainer: mapTrainerRowToResponse(row) },
    });
  } catch (error) {
    console.error('Update trainer error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update trainer' },
      { status: 500 }
    );
  }
}

/** DELETE /api/trainers/[id] - Delete a trainer by id (requires auth). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.TRAINERS_DELETE);
  if ('error' in authz) return authz.error;

  try {
    const scope = resolveGymScope(authz, null);
    if (scope.error) return scope.error;
    const { id } = await params;
    const trainerId = parseInt(id, 10);

    if (!id || isNaN(trainerId)) {
      return NextResponse.json(
        { success: false, error: 'Trainer ID is required' },
        { status: 400 }
      );
    }

    const existing = await queryOne<ITrainerRow>(
      `SELECT id, name, role FROM trainers
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [trainerId, scope.gymId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Trainer not found' },
        { status: 404 }
      );
    }

    await query(
      `DELETE FROM trainers
       WHERE id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [trainerId, scope.gymId]
    );

    await insertNotification(
      'Trainer Deleted',
      `${existing.name} has been removed from the system.`,
      'info'
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Trainer deleted successfully' },
    });
  } catch (error) {
    console.error('Delete trainer error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete trainer' },
      { status: 500 }
    );
  }
}
