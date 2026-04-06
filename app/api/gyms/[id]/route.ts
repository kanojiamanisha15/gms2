import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission } from '@/lib/services/authorization';
import type { IUpdateGymData, IGymData, IGymRow } from '@/types';

const DUPLICATE_GYM_MESSAGE =
  'A gym with this name and address already exists';

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

function parseGymPk(id: string): number | null {
  const n = parseInt(id, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

/** GET /api/gyms/[id] — id is numeric primary key `gym_id`. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.GYMS_UPDATE);
  if ('error' in authz) return authz.error;

  try {
    const { id } = await params;
    const gymPk = id ? parseGymPk(id) : null;
    if (gymPk == null) {
      return NextResponse.json({ success: false, error: 'Gym ID is required' }, { status: 400 });
    }

    const row = await queryOne<IGymRow>(
      `SELECT gym_id, gym_name, address, created_at, updated_at
       FROM gyms WHERE gym_id = $1`,
      [gymPk]
    );

    if (!row) {
      return NextResponse.json({ success: false, error: 'Gym not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { gym: mapGymRowToResponse(row) } });
  } catch (error) {
    console.error('Get gym error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch gym' },
      { status: 500 }
    );
  }
}

/** PUT /api/gyms/[id] */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.GYMS_UPDATE);
  if ('error' in authz) return authz.error;

  try {
    const { id } = await params;
    const gymPk = id ? parseGymPk(id) : null;
    if (gymPk == null) {
      return NextResponse.json({ success: false, error: 'Gym ID is required' }, { status: 400 });
    }

    const body = (await request.json()) as IUpdateGymData;
    const gymName = body.gymName != null ? String(body.gymName).trim() : undefined;
    const address = body.address != null ? String(body.address).trim() : undefined;

    const existing = await queryOne<IGymRow>(
      `SELECT gym_id, gym_name, address, created_at, updated_at FROM gyms WHERE gym_id = $1`,
      [gymPk]
    );

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Gym not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (gymName !== undefined) {
      if (!gymName) {
        return NextResponse.json({ success: false, error: 'Gym name cannot be empty' }, { status: 400 });
      }
      updates.push(`gym_name = $${paramIndex}`);
      values.push(gymName);
      paramIndex++;
    }
    if (address !== undefined) {
      if (!address) {
        return NextResponse.json({ success: false, error: 'Address cannot be empty' }, { status: 400 });
      }
      updates.push(`address = $${paramIndex}`);
      values.push(address);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, data: { gym: mapGymRowToResponse(existing) } });
    }

    const nextGymName = gymName !== undefined ? gymName : existing.gym_name;
    const nextAddress = address !== undefined ? address : existing.address;

    const duplicate = await queryOne<{ gym_id: number }>(
      `SELECT gym_id FROM gyms WHERE gym_name = $1 AND address = $2 AND gym_id <> $3 LIMIT 1`,
      [nextGymName, nextAddress, gymPk]
    );
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: DUPLICATE_GYM_MESSAGE },
        { status: 409 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(gymPk);

    const row = await queryOne<IGymRow>(
      `UPDATE gyms SET ${updates.join(', ')} WHERE gym_id = $${paramIndex}
       RETURNING gym_id, gym_name, address, created_at, updated_at`,
      values
    );

    if (!row) {
      return NextResponse.json({ success: false, error: 'Failed to update gym' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { gym: mapGymRowToResponse(row) } });
  } catch (error) {
    console.error('Update gym error:', error);
    if (isPgUniqueViolation(error)) {
      return NextResponse.json(
        { success: false, error: DUPLICATE_GYM_MESSAGE },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update gym' },
      { status: 500 }
    );
  }
}

/** DELETE /api/gyms/[id] */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.GYMS_DELETE);
  if ('error' in authz) return authz.error;

  try {
    const { id } = await params;
    const gymPk = id ? parseGymPk(id) : null;
    if (gymPk == null) {
      return NextResponse.json({ success: false, error: 'Gym ID is required' }, { status: 400 });
    }

    const existing = await queryOne<{ gym_id: number }>(
      `SELECT gym_id FROM gyms WHERE gym_id = $1`,
      [gymPk]
    );

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Gym not found' }, { status: 404 });
    }

    await query(`DELETE FROM gyms WHERE gym_id = $1`, [gymPk]);

    return NextResponse.json({ success: true, data: { message: 'Gym deleted successfully' } });
  } catch (error) {
    console.error('Delete gym error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete gym' },
      { status: 500 }
    );
  }
}
