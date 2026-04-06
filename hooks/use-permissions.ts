"use client";

import { useCallback } from "react";
import { useCurrentUser } from "@/hooks/use-auth";
import { isSuperAdminRole } from "@/lib/constants/roles";
import type { PermissionKey } from "@/lib/constants/permissions";

export type AuthzUser = {
  role?: string;
  permissions?: string[];
} | null | undefined;

export function hasPermissionForUser(
  user: AuthzUser,
  permission: PermissionKey
): boolean {
  if (!user) return false;
  if (isSuperAdminRole(user.role ?? "")) return true;
  return (user.permissions ?? []).includes(permission);
}

export function hasAnyPermissionForUser(
  user: AuthzUser,
  permissions: readonly PermissionKey[]
): boolean {
  if (!user) return false;
  if (isSuperAdminRole(user.role ?? "")) return true;
  const userPerms = user.permissions ?? [];
  return permissions.some((p) => userPerms.includes(p));
}

export function usePermissions() {
  const { data: currentUser } = useCurrentUser();

  const hasPermission = useCallback(
    (permission: PermissionKey) => hasPermissionForUser(currentUser, permission),
    [currentUser]
  );

  const hasAnyPermission = useCallback(
    (permissions: readonly PermissionKey[]) =>
      hasAnyPermissionForUser(currentUser, permissions),
    [currentUser]
  );

  return {
    currentUser,
    isSuperAdmin: isSuperAdminRole(currentUser?.role ?? ""),
    hasPermission,
    hasAnyPermission,
  };
}
