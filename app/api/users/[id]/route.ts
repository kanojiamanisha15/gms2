import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db/db';
import { PERMISSIONS } from '@/lib/constants/permissions';
import { comparePassword, hashPassword } from '@/lib/services/auth';
import { requirePermission, requireSession } from '@/lib/services/authorization';

type UserRow = {
  id: number;
  email: string;
  name: string;
  role: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapUserToResponse(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role ?? undefined,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

/** PUT /api/users/[id] - Update user (requires auth, own record only) */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await requirePermission(request, PERMISSIONS.MY_ACCOUNT_UPDATE);
  if ('error' in authz) {
    return authz.error;
  }
  const session = await requireSession(request);
  if ('error' in session) {
    return session.error;
  }
  const { payload } = session;

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);

    if (!id || isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Users can only update their own record
    if (payload.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      role?: string;
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    const currentPassword =
      body.currentPassword != null ? String(body.currentPassword).trim() : undefined;
    const newPassword =
      body.newPassword != null ? String(body.newPassword).trim() : undefined;
    const confirmPassword =
      body.confirmPassword != null ? String(body.confirmPassword).trim() : undefined;
    const name =
      body.name != null ? String(body.name).trim() : undefined;
    const email =
      body.email != null ? String(body.email).trim() : undefined;

    // Require current password to verify identity before any update
    if (!currentPassword || !currentPassword.length) {
      return NextResponse.json(
        { success: false, error: 'Current password is required to update your account' },
        { status: 400 }
      );
    }

    // Fetch user with password hash to verify
    const userWithPassword = await queryOne<{ id: number; password: string }>(
      'SELECT id, password FROM users WHERE id = $1',
      [userId]
    );

    if (!userWithPassword) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const isPasswordValid = await comparePassword(
      currentPassword,
      userWithPassword.password
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    if (name !== undefined && !name) {
      return NextResponse.json(
        { success: false, error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    if (email !== undefined) {
      if (!email) {
        return NextResponse.json(
          { success: false, error: 'Email cannot be empty' },
          { status: 400 }
        );
      }
      // Check email uniqueness (excluding current user)
      const existingEmail = await queryOne<{ id: number }>(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    // If changing password: newPassword and confirmPassword must both be provided and match
    const wantsPasswordChange =
      (newPassword !== undefined && newPassword.length > 0) ||
      (confirmPassword !== undefined && confirmPassword.length > 0);

    if (wantsPasswordChange) {
      if (!newPassword || !confirmPassword) {
        return NextResponse.json(
          { success: false, error: 'Both new password and confirm password are required to change password' },
          { status: 400 }
        );
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, error: 'New password and confirm password do not match' },
          { status: 400 }
        );
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters' },
          { status: 400 }
        );
      }
    }

    const existing = await queryOne<UserRow>(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];
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
    if (wantsPasswordChange && newPassword) {
      const hashedPassword = await hashPassword(newPassword);
      updates.push(`password = $${paramIndex}`);
      values.push(hashedPassword);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: true,
        data: mapUserToResponse(existing),
      });
    }

    updates.push('updated_at = NOW()');
    values.push(userId);

    const updateSql = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, role, created_at, updated_at
    `;
    const row = await queryOne<UserRow>(updateSql, values);

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mapUserToResponse(row),
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
