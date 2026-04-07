import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db/db';
import { ALL_PERMISSION_KEYS } from '@/lib/constants/permissions';
import { getEffectivePermissionKeys, requireSession } from '@/lib/services/authorization';

/** GET /api/auth/me - Return current user from auth cookie */
export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if ('error' in session) {
    return session.error;
  }

  const user = await queryOne<{
    id: number;
    email: string;
    name: string;
    role?: string;
    created_at: Date;
    gymId?: number;
  }>(
    'SELECT id, email, name, role, gym_id, created_at FROM users WHERE id = $1',
    [session.userId]
  );

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
  }

  const { isSuperAdmin, keys } = await getEffectivePermissionKeys(session.userId);
  const permissions = isSuperAdmin ? [...ALL_PERMISSION_KEYS] : Array.from(keys);

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gymId: user.gymId,
        permissions,
        created_at:
          user.created_at instanceof Date
            ? user.created_at.toISOString()
            : String(user.created_at),
      },
    },
  });
}
