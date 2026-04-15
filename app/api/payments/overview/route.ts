import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission, resolveRequestedGymScope } from '@/lib/services/authorization';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.PAYMENTS_READ);
  if ('error' in authz) return authz.error;

  try {
    const { searchParams } = new URL(request.url);
    const scope = resolveRequestedGymScope(authz, searchParams.get('gymId'));
    if (scope.error) return scope.error;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const months: { year: number; month: number; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: MONTH_LABELS[d.getMonth()],
      });
    }

    const startBound = months[0];
    const endBound = months[months.length - 1];
    const rangeStart = new Date(startBound.year, startBound.month, 1)
      .toISOString()
      .split('T')[0];
    const rangeEnd = new Date(endBound.year, endBound.month + 1, 0)
      .toISOString()
      .split('T')[0];

    // Received: SUM(payment_amount) where payment_status='paid', grouped by month
    const receivedRows = await query<{ y: number; m: number; total: string }>(
      `SELECT EXTRACT(YEAR FROM join_date)::int as y,
              EXTRACT(MONTH FROM join_date)::int - 1 as m,
              COALESCE(SUM(payment_amount::numeric), 0) as total
       FROM members
       WHERE payment_status = 'paid'
         AND join_date >= $1::date AND join_date <= $2::date
         AND ($3::int IS NULL OR gym_id = $3)
       GROUP BY EXTRACT(YEAR FROM join_date), EXTRACT(MONTH FROM join_date)`,
      [rangeStart, rangeEnd, scope.gymId]
    );
    const receivedByMonth = new Map(
      receivedRows.map((r) => [`${r.y}-${r.m}`, parseFloat(r.total)])
    );

    // Due: SUM(payment_amount) where payment_status='unpaid', grouped by month
    const dueRows = await query<{ y: number; m: number; total: string }>(
      `SELECT EXTRACT(YEAR FROM join_date)::int as y,
              EXTRACT(MONTH FROM join_date)::int - 1 as m,
              COALESCE(SUM(payment_amount::numeric), 0) as total
       FROM members
       WHERE payment_status = 'unpaid'
         AND join_date >= $1::date AND join_date <= $2::date
         AND ($3::int IS NULL OR gym_id = $3)
       GROUP BY EXTRACT(YEAR FROM join_date), EXTRACT(MONTH FROM join_date)`,
      [rangeStart, rangeEnd, scope.gymId]
    );
    const dueByMonth = new Map(
      dueRows.map((r) => [`${r.y}-${r.m}`, parseFloat(r.total)])
    );

    const result = months.map(({ year, month, label }) => {
      const key = `${year}-${month}`;
      const received = Math.round((receivedByMonth.get(key) ?? 0) * 100) / 100;
      const due = Math.round((dueByMonth.get(key) ?? 0) * 100) / 100;
      return { month: label, received, due };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Payments overview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments overview' },
      { status: 500 }
    );
  }
}
