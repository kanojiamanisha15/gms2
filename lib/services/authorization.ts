import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db/db';
import type { PermissionKey } from '@/lib/constants/permissions';
import { ALL_PERMISSION_KEYS } from '@/lib/constants/permissions';
import { requireAuth, type AuthResult } from '@/lib/services/auth';
import { isSuperAdminRole } from '@/lib/constants/roles';
import type { TokenPayload } from '@/types/auth';

export type AuthzResult =
  | { error: NextResponse }
  | { payload: TokenPayload; userId: number; isSuperAdmin: boolean };

type UserAuthRow = {
  id: number;
  role: string;
  permissions: string[];
  gym_id: number | null;
};

async function getUserAuthRow(userId: number): Promise<UserAuthRow | null> {
  return queryOne<UserAuthRow>(
    `SELECT id, role, permissions, gym_id FROM users WHERE id = $1`,
    [userId]
  );
}

/**
 * Authenticated user with valid JWT and existing DB row.
 */
export async function requireSession(request: NextRequest): Promise<AuthzResult> {
  const auth: AuthResult = requireAuth(request);
  if (auth.error) {
    return { error: auth.error };
  }
  const { payload } = auth;
  const user = await getUserAuthRow(payload.userId);
  if (!user) {
    return {
      error: NextResponse.json({ success: false, error: 'User not found' }, { status: 401 }),
    };
  }

  // DB is the source of truth for mutable authz fields like role/gym assignment.
  const effectivePayload: TokenPayload = {
    ...payload,
    role: user.role,
    gymId: user.gym_id ?? undefined,
  };

  return {
    payload: effectivePayload,
    userId: payload.userId,
    isSuperAdmin: isSuperAdminRole(user.role),
  };
}

/**
 * Effective permission keys for a user: direct `users.permissions` grants.
 */
export async function getEffectivePermissionKeys(userId: number): Promise<{
  isSuperAdmin: boolean;
  keys: Set<string>;
}> {
  const user = await getUserAuthRow(userId);
  if (!user) {
    return { isSuperAdmin: false, keys: new Set() };
  }
  if (isSuperAdminRole(user.role)) {
    return { isSuperAdmin: true, keys: new Set(ALL_PERMISSION_KEYS) };
  }

  const keys = new Set<string>(user.permissions ?? []);

  return { isSuperAdmin: false, keys };
}

export async function userHasPermission(
  userId: number,
  permission: PermissionKey
): Promise<boolean> {
  const { isSuperAdmin, keys } = await getEffectivePermissionKeys(userId);
  if (isSuperAdmin) {
    return true;
  }
  return keys.has(permission);
}

/**
 * Require valid session and a single permission (or super admin role).
 */
export async function requirePermission(
  request: NextRequest,
  permission: PermissionKey
): Promise<AuthzResult> {
  const session = await requireSession(request);
  if ('error' in session) {
    return session;
  }
  const { payload, userId, isSuperAdmin } = session;

  if (isSuperAdmin) {
    return { payload, userId, isSuperAdmin: true };
  }

  const { keys } = await getEffectivePermissionKeys(userId);
  if (!keys.has(permission)) {
    return {
      error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { payload, userId, isSuperAdmin: false };
}

/**
 * Require valid session and any of the given permissions (or super admin role).
 */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: readonly PermissionKey[]
): Promise<AuthzResult> {
  const session = await requireSession(request);
  if ('error' in session) {
    return session;
  }
  const { payload, userId, isSuperAdmin } = session;

  if (isSuperAdmin) {
    return { payload, userId, isSuperAdmin: true };
  }

  const { keys } = await getEffectivePermissionKeys(userId);
  const allowed = permissions.some((p) => keys.has(p));
  if (!allowed) {
    return {
      error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { payload, userId, isSuperAdmin: false };
}

/** Only users with role `super_admin` (exactly one row allowed in DB). */
export async function requireSuperAdmin(request: NextRequest): Promise<AuthzResult> {
  const session = await requireSession(request);
  if ('error' in session) {
    return session;
  }
  if (!session.isSuperAdmin) {
    return {
      error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
    };
  }
  return session;
}

export function parseGymIdParam(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
}

export function resolveGymScope(
  authz: { isSuperAdmin: boolean; payload: TokenPayload },
  requestedGymId: number | null
): { gymId: number | null; error?: NextResponse } {
  if (authz.isSuperAdmin) {
    return { gymId: requestedGymId };
  }

  const userGymId = authz.payload.gymId ?? null;
  if (userGymId == null) {
    return {
      gymId: null,
      error: NextResponse.json(
        { success: false, error: 'User is not assigned to any gym' },
        { status: 403 }
      ),
    };
  }

  if (requestedGymId != null && requestedGymId !== userGymId) {
    return {
      gymId: null,
      error: NextResponse.json(
        { success: false, error: 'Forbidden for requested gym' },
        { status: 403 }
      ),
    };
  }

  return { gymId: userGymId };
}

export function resolveRequestedGymScope(
  authz: { isSuperAdmin: boolean; payload: TokenPayload },
  rawGymId: unknown,
  options?: { allowUndefined?: boolean }
): { gymId: number | null | undefined; error?: NextResponse } {
  if (options?.allowUndefined && rawGymId === undefined) {
    return { gymId: undefined };
  }

  const requestedGymId = parseGymIdParam(rawGymId == null ? null : String(rawGymId));
  if (Number.isNaN(requestedGymId)) {
    return {
      gymId: undefined,
      error: NextResponse.json({ success: false, error: 'Invalid gymId' }, { status: 400 }),
    };
  }

  const scope = resolveGymScope(authz, requestedGymId);
  if (scope.error) {
    return { gymId: undefined, error: scope.error };
  }

  return { gymId: scope.gymId };
}
