import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { requirePermission } from '@/lib/services/authorization';

/** PUT /api/notifications/read-all - Mark all notifications as read */
export async function PUT(request: NextRequest) {
  const authz = await requirePermission(request, PERMISSIONS.NOTIFICATIONS_MARK_ALL_AS_READ);
  if ('error' in authz) return authz.error;

  try {
    await query(`UPDATE notifications SET read = true WHERE read = false`);
    return NextResponse.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark all as read' },
      { status: 500 }
    );
  }
}
