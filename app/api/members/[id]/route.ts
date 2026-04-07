import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission, resolveRequestedGymScope, resolveGymScope } from '@/lib/services/authorization';
import { insertNotification } from '@/lib/db/notifications';
import { normalizePhoneToIndia } from '@/lib/helpers';
import type { IUpdateMemberData, IMemberData, IMemberRow } from '@/types';

function mapMemberRowToResponse(row: IMemberRow): IMemberData {
  return {
    id: row.id,
    memberId: row.member_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    membershipType: row.membership_type,
    joinDate: row.join_date,
    expiryDate: row.expiry_date,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentAmount: parseFloat(row.payment_amount ?? '0'),
    gymId: row.gym_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

/** GET /api/members/[id] - Get a single member by member_id (requires auth). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERS_UPDATE);
  if ('error' in authz) return authz.error;

  try {
    const scope = resolveGymScope(authz, null);
    if (scope.error) return scope.error;
    const { id } = await params;
    const memberId = id;

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const row = await queryOne<IMemberRow>(
      `SELECT id, member_id, name, email, phone, membership_type,
              join_date, expiry_date, status, payment_status, payment_amount, gym_id,
              created_at, updated_at
       FROM members
       WHERE member_id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [memberId, scope.gymId]
    );

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { member: mapMemberRowToResponse(row) },
    });
  } catch (error) {
    console.error('Get member by ID error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch member' },
      { status: 500 }
    );
  }
}

/** PUT /api/members/[id] - Update a member by member_id (requires auth). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERS_UPDATE);
  if ('error' in authz) return authz.error;

  try {
    const baseScope = resolveGymScope(authz, null);
    if (baseScope.error) return baseScope.error;
    const { id } = await params;
    const memberId = id;

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as IUpdateMemberData;

    const name = body.name != null ? String(body.name).trim() : undefined;
    const email = body.email != null ? (String(body.email).trim() || null) : undefined;
    const phoneRaw = body.phone != null ? (String(body.phone).trim() || null) : undefined;
    const phone = phoneRaw != null ? normalizePhoneToIndia(phoneRaw) ?? undefined : undefined;
    const membershipType = body.membershipType != null ? String(body.membershipType).trim() : undefined;
    const joinDate = body.joinDate != null ? String(body.joinDate).trim() : undefined;
    const expiryDate = body.expiryDate != null ? (String(body.expiryDate).trim() || null) : undefined;
    const status = body.status;
    const paymentStatus = body.paymentStatus;
    const paymentAmount = body.paymentAmount != null ? Number(body.paymentAmount) : undefined;
    const writeScope = resolveRequestedGymScope(authz, body.gymId, { allowUndefined: true });
    if (writeScope.error) return writeScope.error;
    const gymId = writeScope.gymId;

    const validStatuses = ['active', 'inactive', 'expired'];
    if (status != null && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be active, inactive, or expired' },
        { status: 400 }
      );
    }
    const validPaymentStatuses = ['paid', 'unpaid'];
    if (paymentStatus != null && !validPaymentStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        { success: false, error: 'Payment status must be paid or unpaid' },
        { status: 400 }
      );
    }

    const existing = await queryOne<IMemberRow>(
      `SELECT id, member_id, name, email, phone, membership_type,
              join_date, expiry_date, status, payment_status, payment_amount, gym_id
       FROM members
       WHERE member_id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [memberId, baseScope.gymId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
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
    if (membershipType !== undefined) {
      updates.push(`membership_type = $${paramIndex}`);
      values.push(membershipType);
      paramIndex++;
    }
    if (joinDate !== undefined) {
      updates.push(`join_date = $${paramIndex}::date`);
      values.push(joinDate);
      paramIndex++;
    }
    if (expiryDate !== undefined) {
      updates.push(`expiry_date = $${paramIndex}::date`);
      values.push(expiryDate);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (paymentStatus !== undefined) {
      updates.push(`payment_status = $${paramIndex}`);
      values.push(paymentStatus);
      paramIndex++;
    }
    if (paymentAmount !== undefined) {
      updates.push(`payment_amount = $${paramIndex}`);
      values.push(paymentAmount);
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
        data: { member: mapMemberRowToResponse(existing) },
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(memberId);

    const updateSql = `
      UPDATE members
      SET ${updates.join(', ')}
      WHERE member_id = $${paramIndex}
      RETURNING id, member_id, name, email, phone, membership_type,
                join_date, expiry_date, status, payment_status, payment_amount, gym_id,
                created_at, updated_at
    `;
    const row = await queryOne<IMemberRow>(updateSql, values);

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Failed to update member' },
        { status: 500 }
      );
    }

    if (paymentStatus === 'paid' && existing.payment_status !== 'paid') {
      const amount = parseFloat(String(row.payment_amount ?? '0'));
      await insertNotification(
        'Payment Received',
        `Payment of Rs.${amount.toFixed(2)} received from ${row.name}.`,
        'success'
      );
    } else if (paymentStatus !== 'paid' || name !== undefined) {
      await insertNotification(
        'Member Updated',
        `${row.name}'s member record has been updated.`,
        'info'
      );
    }

    return NextResponse.json({
      success: true,
      data: { member: mapMemberRowToResponse(row) },
    });
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

/** DELETE /api/members/[id] - Delete a member by member_id (requires auth). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERS_DELETE);
  if ('error' in authz) return authz.error;

  try {
    const scope = resolveGymScope(authz, null);
    if (scope.error) return scope.error;
    const { id } = await params;
    const memberId = id;

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const existing = await queryOne<IMemberRow>(
      `SELECT id, member_id, name FROM members
       WHERE member_id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [memberId, scope.gymId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    const memberName = existing.name ?? 'Member';
    await query(
      `DELETE FROM members
       WHERE member_id = $1
         AND ($2::int IS NULL OR gym_id = $2)`,
      [memberId, scope.gymId]
    );

    await insertNotification(
      'Member Deleted',
      `${memberName} (${memberId}) has been removed from the system.`,
      'info'
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Member deleted successfully' },
    });
  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete member' },
      { status: 500 }
    );
  }
}
