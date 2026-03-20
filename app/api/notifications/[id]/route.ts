import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/db';
import { requireAuth } from '@/lib/services/auth';

export type NotificationRow = {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: Date;
};

/** PUT /api/notifications/[id] - Mark notification as read */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const notifId = parseInt(id, 10);
    if (!id || isNaN(notifId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    await query(`UPDATE notifications SET read = true WHERE id = $1`, [notifId]);
    const row = await queryOne<NotificationRow>(
      `SELECT id, title, message, type, read, created_at FROM notifications WHERE id = $1`,
      [notifId]
    );
    if (!row) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        notification: {
          id: String(row.id),
          title: row.title,
          message: row.message,
          type: row.type,
          read: !!row.read,
          createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
        },
      },
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

/** DELETE /api/notifications/[id] - Delete notification */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const notifId = parseInt(id, 10);
    if (!id || isNaN(notifId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const existing = await queryOne<{ id: number; title: string; read: boolean }>(
      `SELECT id, title, read FROM notifications WHERE id = $1`,
      [notifId]
    );
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    // Overdue notifications are auto-generated from current data.
    // If an unread overdue notification is "deleted", dismiss it by marking read
    // so it does not reappear immediately as unread on the next fetch.
    const isOverdueNotification =
      existing.title === 'Payment Overdue' || existing.title === 'Expense Overdue';
    if (isOverdueNotification && !existing.read) {
      await query(`UPDATE notifications SET read = true WHERE id = $1`, [notifId]);
      return NextResponse.json({
        success: true,
        data: { message: 'Notification dismissed' },
      });
    }

    await query(`DELETE FROM notifications WHERE id = $1`, [notifId]);
    return NextResponse.json({
      success: true,
      data: { message: 'Notification deleted' },
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
