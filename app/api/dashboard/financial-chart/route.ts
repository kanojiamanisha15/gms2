import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission } from '@/lib/services/authorization';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** GET /api/dashboard/financial-chart - Get revenue, expenses, profit for last 12 months */
export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.DASHBOARD_FINANCIAL);
  if ('error' in authz) return authz.error;

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // Build list of (year, month) for last 12 months, oldest first
    const months: { year: number; month: number; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      months.push({
        year: y,
        month: m,
        label: MONTH_LABELS[m],
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

    // Revenue by month: SUM(payment_amount) from members grouped by year, month
    const revenueRows = await query<{ y: number; m: number; total: string }>(
      `SELECT EXTRACT(YEAR FROM join_date)::int as y,
              EXTRACT(MONTH FROM join_date)::int - 1 as m,
              COALESCE(SUM(payment_amount::numeric), 0) as total
       FROM members
       WHERE join_date >= $1::date AND join_date <= $2::date
       GROUP BY EXTRACT(YEAR FROM join_date), EXTRACT(MONTH FROM join_date)`,
      [rangeStart, rangeEnd]
    );
    const revenueByMonth = new Map(
      revenueRows.map((r) => [`${r.y}-${r.m}`, parseFloat(r.total)])
    );

    // Expenses by month: SUM(amount) from expenses grouped by year, month
    const expensesRows = await query<{ y: number; m: number; total: string }>(
      `SELECT EXTRACT(YEAR FROM date)::int as y,
              EXTRACT(MONTH FROM date)::int - 1 as m,
              COALESCE(SUM(amount::numeric), 0) as total
       FROM expenses
       WHERE date >= $1::date AND date <= $2::date
       GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)`,
      [rangeStart, rangeEnd]
    );
    const expensesByMonth = new Map(
      expensesRows.map((r) => [`${r.y}-${r.m}`, parseFloat(r.total)])
    );

    const result = months.map(({ year, month, label }) => {
      const key = `${year}-${month}`;
      const revenue = Math.round((revenueByMonth.get(key) ?? 0) * 100) / 100;
      const expenses = Math.round((expensesByMonth.get(key) ?? 0) * 100) / 100;
      const profit = Math.round((revenue - expenses) * 100) / 100;
      return { month: label, revenue, expenses, profit };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Financial chart error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}
