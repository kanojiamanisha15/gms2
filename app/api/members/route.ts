import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission } from '@/lib/services/authorization';
import { insertNotification } from '@/lib/db/notifications';
import { generateMemberId } from '@/lib/utils/member-id';
import { normalizePhoneToIndia } from '@/lib/helpers';
import type { ICreateMemberData, IMemberData, IMemberRow } from '@/types';

const SORT_FIELDS = {
  memberId: 'member_id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  membershipType: 'membership_type',
  joinDate: 'join_date',
  expiryDate: 'expiry_date',
  status: 'status',
  paymentStatus: 'payment_status',
  paymentAmount: 'payment_amount',
} as const;

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
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

/** GET /api/members - Return paginated list of members (requires auth). Query: page, limit, search */
export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERS_READ);
  if ('error' in authz) return authz.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const sortByRaw = searchParams.get('sortBy') ?? 'joinDate';
    const sortOrderRaw = searchParams.get('sortOrder') ?? 'desc';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '10', 10);
    const sortBy = (sortByRaw in SORT_FIELDS ? sortByRaw : 'joinDate') as keyof typeof SORT_FIELDS;
    const sortOrder = sortOrderRaw.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100);
    const offset = (pageNum - 1) * limitNum;

    const sqlParams: (string | number)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (search?.trim()) {
      conditions.push(
        `(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR member_id ILIKE $${paramIndex})`
      );
      sqlParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereSql = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    const orderBySql = `${SORT_FIELDS[sortBy]} ${sortOrder}, id DESC`;

    const countRows = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM members${whereSql}`,
      sqlParams
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);
    const totalPages = Math.ceil(total / limitNum);

    const membersSql = `
      SELECT id, member_id, name, email, phone, membership_type,
             join_date, expiry_date, status, payment_status, payment_amount,
             created_at, updated_at
      FROM members
      ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const memberRows = await query<IMemberRow>(membersSql, [...sqlParams, limitNum, offset]);
    const members = memberRows.map(mapMemberRowToResponse);

    return NextResponse.json({
      success: true,
      data: {
        members,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

/** POST /api/members - Create a new member (requires auth). */
export async function POST(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.MEMBERS_ADD);
  if ('error' in authz) return authz.error;

  try {
    const body = (await request.json()) as ICreateMemberData;

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const membershipType = typeof body.membershipType === 'string' ? body.membershipType.trim() : '';
    const phoneRaw = body.phone != null ? String(body.phone).trim() || null : null;
    const phone = normalizePhoneToIndia(phoneRaw);
    const joinDateRaw = body.joinDate ?? new Date().toISOString().split('T')[0];
    const joinDate = String(joinDateRaw).trim();
    const expiryDate = body.expiryDate != null ? (String(body.expiryDate).trim() || null) : null;
    const status = typeof body.status === 'string' ? body.status : '';
    const paymentStatus = typeof body.paymentStatus === 'string' ? body.paymentStatus : '';
    const paymentAmount = Number(body.paymentAmount) ?? 0;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    if (!membershipType) {
      return NextResponse.json(
        { success: false, error: 'Membership type is required' },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone is required' },
        { status: 400 }
      );
    }
    if (!joinDate) {
      return NextResponse.json(
        { success: false, error: 'Join date is required' },
        { status: 400 }
      );
    }
    if (!expiryDate) {
      return NextResponse.json(
        { success: false, error: 'Expiry date is required' },
        { status: 400 }
      );
    }
    const validStatuses = ['active', 'inactive', 'expired'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status is required and must be active, inactive, or expired' },
        { status: 400 }
      );
    }
    const validPaymentStatuses = ['paid', 'unpaid'];
    if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        { success: false, error: 'Payment status is required and must be paid or unpaid' },
        { status: 400 }
      );
    }

    const email = body.email != null ? String(body.email).trim() || null : null;

    // Next sequential number for same join_date month/year
    const countRows = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM members
       WHERE TO_CHAR(join_date, 'YYYY-MM') = TO_CHAR($1::date, 'YYYY-MM')`,
      [joinDate]
    );
    const sequentialNumber = parseInt(countRows[0]?.count ?? '0', 10) + 1;
    const member_id = generateMemberId(joinDate, sequentialNumber);

    const insertSql = `
      INSERT INTO members (
        member_id, name, email, phone, membership_type,
        join_date, expiry_date, status, payment_status, payment_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10)
      RETURNING id, member_id, name, email, phone, membership_type,
                join_date, expiry_date, status, payment_status, payment_amount,
                created_at, updated_at
    `;
    const row = await queryOne<IMemberRow>(insertSql, [
      member_id,
      name,
      email,
      phone,
      membershipType,
      joinDate,
      expiryDate,
      status,
      paymentStatus,
      paymentAmount,
    ]);

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Failed to create member' },
        { status: 500 }
      );
    }

    await insertNotification(
      'New Member Registration',
      `${name} has registered for a ${membershipType} membership plan.`,
      'success'
    );

    return NextResponse.json({
      success: true,
      data: { member: mapMemberRowToResponse(row) },
    });
  } catch (error) {
    console.error('Add member error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create member' },
      { status: 500 }
    );
  }
}
