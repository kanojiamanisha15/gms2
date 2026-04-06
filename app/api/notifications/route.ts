import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission } from '@/lib/services/authorization';
import { insertNotification } from '@/lib/db/notifications';

export type NotificationRow = {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: Date;
};

function mapRowToNotification(row: NotificationRow) {
  return {
    id: String(row.id),
    title: row.title,
    message: row.message,
    type: row.type as 'info' | 'success' | 'warning' | 'error',
    read: !!row.read,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

/** Ensure overdue notifications exist - creates them if not already present in last 24h */
async function ensureOverdueNotifications() {
  const today = new Date().toISOString().split('T')[0];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Payment overdue: members with payment_status='unpaid' and expiry_date < today
  const overduePayments = await query<{ name: string; member_id: string; payment_amount: string }>(
    `SELECT name, member_id, payment_amount
     FROM members
     WHERE payment_status = 'unpaid' AND expiry_date IS NOT NULL AND expiry_date < $1::date`,
    [today]
  );
  const recentPaymentNotifs = await query<{ message: string }>(
    `SELECT message FROM notifications WHERE title = 'Payment Overdue' AND created_at >= $1::timestamptz`,
    [since]
  );
  const recentPaymentMessages = new Set(recentPaymentNotifs.map((r) => r.message));
  for (const m of overduePayments) {
    const amount = parseFloat(m.payment_amount ?? '0');
    const msg = `Payment of Rs.${amount.toFixed(2)} from ${m.name} (${m.member_id}) is overdue.`;
    if (!recentPaymentMessages.has(msg)) {
      await insertNotification('Payment Overdue', msg, 'error');
      recentPaymentMessages.add(msg);
    }
  }

  // Expenses overdue: status='overdue' OR (date < today AND status='pending')
  const overdueExpenses = await query<{ id: number; description: string | null; amount: string; date: string }>(
    `SELECT id, description, amount, date
     FROM expenses
     WHERE status = 'overdue' OR (date < $1::date AND status = 'pending')`,
    [today]
  );
  const recentExpenseNotifs = await query<{ message: string }>(
    `SELECT message FROM notifications WHERE title = 'Expense Overdue' AND created_at >= $1::timestamptz`,
    [since]
  );
  const recentExpenseMessages = new Set(recentExpenseNotifs.map((r) => r.message));
  for (const e of overdueExpenses) {
    const amount = parseFloat(e.amount ?? '0');
    const desc = e.description || 'Unspecified expense';
    const msg = `${desc} (Rs.${amount.toFixed(2)}) was due on ${e.date}.`;
    if (!recentExpenseMessages.has(msg)) {
      await insertNotification('Expense Overdue', msg, 'warning');
      recentExpenseMessages.add(msg);
    }
  }
}

/** GET /api/notifications - List notifications (creates overdue ones first) */
export async function GET(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.NOTIFICATIONS_READ);
  if ('error' in authz) return authz.error;

  try {
    await ensureOverdueNotifications();

    const rows = await query<NotificationRow>(
      `SELECT id, title, message, type, read, created_at
       FROM notifications
       ORDER BY created_at DESC
       LIMIT 200`
    );

    const notifications = rows.map(mapRowToNotification);

    return NextResponse.json({
      success: true,
      data: { notifications },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
  