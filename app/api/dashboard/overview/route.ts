import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission, resolveRequestedGymScope } from '@/lib/services/authorization';

type TimePeriod = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

function getPeriodDateRange(
  period: TimePeriod,
  refDate: Date
): { start: string; end: string } {
  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0-11

  let startMonth: number;
  let endMonth: number;
  let startYear = year;
  let endYear = year;

  switch (period) {
    case 'monthly':
      startMonth = month;
      endMonth = month;
      break;
    case 'quarterly':
      startMonth = Math.floor(month / 3) * 3; // 0,3,6,9
      endMonth = startMonth + 2;
      break;
    case 'half-yearly':
      startMonth = month < 6 ? 0 : 6;
      endMonth = month < 6 ? 5 : 11;
      break;
    case 'yearly':
      startMonth = 0;
      endMonth = 11;
      break;
    default:
      startMonth = month;
      endMonth = month;
  }

  const start = new Date(startYear, startMonth, 1);
  const end = new Date(endYear, endMonth + 1, 0); // last day of endMonth

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function getPreviousPeriodRange(
  period: TimePeriod,
  refDate: Date
): { start: string; end: string } {
  switch (period) {
    case 'monthly': {
      const prev = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
      return getPeriodDateRange('monthly', prev);
    }
    case 'quarterly': {
      const month = refDate.getMonth();
      const quarterStartMonth = Math.floor(month / 3) * 3;
      const prev = new Date(refDate.getFullYear(), quarterStartMonth - 1, 1);
      return getPeriodDateRange('quarterly', prev);
    }
    case 'half-yearly': {
      const month = refDate.getMonth();
      const prev = month < 6
        ? new Date(refDate.getFullYear() - 1, 6, 1)
        : new Date(refDate.getFullYear(), 0, 1);
      return getPeriodDateRange('half-yearly', prev);
    }
    case 'yearly': {
      const prev = new Date(refDate.getFullYear() - 1, refDate.getMonth(), 1);
      return getPeriodDateRange('yearly', prev);
    }
    default:
      return getPeriodDateRange('monthly', refDate);
  }
}

/** GET /api/dashboard/overview - Get overview metrics. Query: period (monthly|quarterly|half-yearly|yearly) */
export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.DASHBOARD_READ);
  if ('error' in authz) return authz.error;

  try {
    const { searchParams } = new URL(request.url);
    const scope = resolveRequestedGymScope(authz, searchParams.get('gymId'));
    if (scope.error) return scope.error;
    const periodParam = searchParams.get('period');
    const period: TimePeriod =
      periodParam === 'quarterly' ||
      periodParam === 'half-yearly' ||
      periodParam === 'yearly'
        ? periodParam
        : 'monthly';

    const now = new Date();
    const { start: currStart, end: currEnd } = getPeriodDateRange(period, now);
    const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(period, now);

    // Revenue: SUM(payment_amount) from members where join_date in period
    const revenueRows = await query<{ total: string }>(
      `SELECT COALESCE(SUM(payment_amount::numeric), 0) as total
       FROM members
       WHERE join_date >= $1::date AND join_date <= $2::date
         AND ($3::int IS NULL OR gym_id = $3)`,
      [currStart, currEnd, scope.gymId]
    );
    const revenue = parseFloat(revenueRows[0]?.total ?? '0');

    const prevRevenueRows = await query<{ total: string }>(
      `SELECT COALESCE(SUM(payment_amount::numeric), 0) as total
       FROM members
       WHERE join_date >= $1::date AND join_date <= $2::date
         AND ($3::int IS NULL OR gym_id = $3)`,
      [prevStart, prevEnd, scope.gymId]
    );
    const prevRevenue = parseFloat(prevRevenueRows[0]?.total ?? '0');

    // New Customers: COUNT of members joined in period
    const customersRows = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM members
       WHERE join_date >= $1::date AND join_date <= $2::date
         AND ($3::int IS NULL OR gym_id = $3)`,
      [currStart, currEnd, scope.gymId]
    );
    const newCustomers = parseInt(customersRows[0]?.count ?? '0', 10);

    const prevCustomersRows = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM members
       WHERE join_date >= $1::date AND join_date <= $2::date
         AND ($3::int IS NULL OR gym_id = $3)`,
      [prevStart, prevEnd, scope.gymId]
    );
    const prevCustomers = parseInt(prevCustomersRows[0]?.count ?? '0', 10);

    // Active Accounts: COUNT of members with status='active'
    const activeRows = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM members
       WHERE status = 'active'
         AND ($1::int IS NULL OR gym_id = $1)`,
      [scope.gymId]
    );
    const activeAccounts = parseInt(activeRows[0]?.count ?? '0', 10);

    // Approx. active at end of previous period (members who hadn't expired by prevEnd)
    const prevActiveRows = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM members
       WHERE join_date <= $1::date
         AND (expiry_date IS NULL OR expiry_date >= $1::date)
         AND ($2::int IS NULL OR gym_id = $2)`,
      [prevEnd, scope.gymId]
    );
    const prevActiveAccounts = parseInt(prevActiveRows[0]?.count ?? '0', 10);

    // Expenses: SUM(amount) from expenses where date in period
    const expensesRows = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount::numeric), 0) as total
       FROM expenses
       WHERE date >= $1::date AND date <= $2::date
         AND ($3::int IS NULL OR gym_id = $3)`,
      [currStart, currEnd, scope.gymId]
    );
    const expenses = parseFloat(expensesRows[0]?.total ?? '0');

    const prevExpensesRows = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount::numeric), 0) as total
       FROM expenses
       WHERE date >= $1::date AND date <= $2::date
         AND ($3::int IS NULL OR gym_id = $3)`,
      [prevStart, prevEnd, scope.gymId]
    );
    const prevExpenses = parseFloat(prevExpensesRows[0]?.total ?? '0');

    // Growth: (revenue - expenses). Display as % of revenue when revenue > 0
    const netRevenue = revenue - expenses;
    const growthRate = revenue > 0 ? (netRevenue / revenue) * 100 : 0;

    const prevNetRevenue = prevRevenue - prevExpenses;
    const prevGrowthRate = prevRevenue > 0 ? (prevNetRevenue / prevRevenue) * 100 : 0;
    const growthChange = prevGrowthRate !== 0
      ? ((growthRate - prevGrowthRate) / Math.abs(prevGrowthRate)) * 100
      : (growthRate !== 0 ? 100 : 0);

    // Percentage changes
    const revenueChange = prevRevenue !== 0
      ? ((revenue - prevRevenue) / prevRevenue) * 100
      : (revenue !== 0 ? 100 : 0);
    const customersChange = prevCustomers !== 0
      ? ((newCustomers - prevCustomers) / prevCustomers) * 100
      : (newCustomers !== 0 ? 100 : 0);
    const accountsChange = prevActiveAccounts !== 0
      ? ((activeAccounts - prevActiveAccounts) / prevActiveAccounts) * 100
      : (activeAccounts !== 0 ? 100 : 0);

    return NextResponse.json({
      success: true,
      data: {
        revenue,
        newCustomers,
        activeAccounts,
        growthRate,
        revenueChange,
        customersChange,
        accountsChange,
        growthChange,
      },
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch overview' },
      { status: 500 }
    );
  }
}
