import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission } from '@/lib/services/authorization';

export type ExpiringMemberRow = {
  member_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  membership_type: string;
  expiry_date: string;
};

const SORT_FIELDS = {
  name: "name",
  email: "email",
  phone: "phone",
  membershipType: "membership_type",
  expirationDate: "expiry_date",
  daysRemaining: "expiry_date",
} as const;

/** GET /api/members/expiring - Get members whose expiry_date is in the given month/year. Query: month (0-11), year */
export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.EXPIRING_MEMBERS_VIEW);
  if ('error' in authz) return authz.error;

  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const sortByRaw = searchParams.get('sortBy') ?? 'expirationDate';
    const sortOrderRaw = searchParams.get('sortOrder') ?? 'asc';

    const now = new Date();
    const month = monthParam != null ? parseInt(monthParam, 10) : now.getMonth();
    const year = yearParam != null ? parseInt(yearParam, 10) : now.getFullYear();

    if (isNaN(month) || month < 0 || month > 11) {
      return NextResponse.json(
        { success: false, error: 'Invalid month (must be 0-11)' },
        { status: 400 }
      );
    }
    if (isNaN(year) || year < 1900 || year > 2100) {
      return NextResponse.json(
        { success: false, error: 'Invalid year' },
        { status: 400 }
      );
    }
    const sortBy = (sortByRaw in SORT_FIELDS ? sortByRaw : 'expirationDate') as keyof typeof SORT_FIELDS;
    const sortOrder = sortOrderRaw.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const orderBySql = `${SORT_FIELDS[sortBy]} ${sortOrder}, member_id ASC`;

    // SQL months are 1-12
    const sqlMonth = month + 1;

    const rows = await query<ExpiringMemberRow>(
      `SELECT member_id, name, email, phone, membership_type, expiry_date
       FROM members
       WHERE status = 'active'
         AND expiry_date IS NOT NULL
         AND EXTRACT(MONTH FROM expiry_date) = $1
         AND EXTRACT(YEAR FROM expiry_date) = $2
       ORDER BY ${orderBySql}`,
      [sqlMonth, year]
    );

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const members = rows.map((row) => {
      const expiryDate = row.expiry_date as string | Date;
      const expiryDateStr =
        expiryDate instanceof Date
          ? expiryDate.toISOString().split('T')[0]
          : String(expiryDate);
      const expDate = new Date(expiryDateStr);
      const daysRemaining = Math.ceil(
        (expDate.getTime() - todayStart) / (1000 * 60 * 60 * 24)
      );

      return {
        id: row.member_id,
        name: row.name,
        email: row.email ?? '',
        phone: row.phone ?? '',
        membershipType: row.membership_type,
        expirationDate: expiryDateStr,
        daysRemaining,
      };
    });

    return NextResponse.json({
      success: true,
      data: { members },
    });
  } catch (error) {
    console.error('Get expiring members error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expiring members' },
      { status: 500 }
    );
  }
}
