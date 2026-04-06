import { PERMISSIONS } from '@/lib/constants/permissions';
import { isSuperAdminRole } from '@/lib/constants/roles';
import {
  hasAnyPermissionForUser,
  hasPermissionForUser,
  type AuthzUser,
} from '@/hooks/use-permissions';

export function userCanViewUsersPage(user?: AuthzUser): boolean {
  return hasAnyPermissionForUser(user, [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_ADD,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_MANAGE_PERMISSIONS,
    PERMISSIONS.SYSTEM_MANAGE_ROLES,
  ]);
}

export function userCanViewDashboard(user?: AuthzUser): boolean {
  return (
    hasPermissionForUser(user, PERMISSIONS.DASHBOARD_READ) ||
    hasPermissionForUser(user, PERMISSIONS.DASHBOARD_FINANCIAL) ||
    hasPermissionForUser(user, PERMISSIONS.EXPIRING_MEMBERS_VIEW)
  );
}

export function userCanViewMembers(user?: AuthzUser): boolean {
  return hasPermissionForUser(user, PERMISSIONS.MEMBERS_READ);
}

export function userCanViewGyms(user?: AuthzUser): boolean {
  return hasPermissionForUser(user, PERMISSIONS.GYMS_READ);
}

export function userCanViewTrainers(user?: AuthzUser): boolean {
  return hasPermissionForUser(user, PERMISSIONS.TRAINERS_READ);
}

export function userCanViewMembershipPlans(user?: AuthzUser): boolean {
  return hasPermissionForUser(user, PERMISSIONS.MEMBERSHIP_PLANS_READ);
}

export function userCanViewPayments(user?: AuthzUser): boolean {
  return hasPermissionForUser(user, PERMISSIONS.PAYMENTS_READ);
}

export function userCanViewNotifications(user?: AuthzUser): boolean {
  return hasPermissionForUser(user, PERMISSIONS.NOTIFICATIONS_READ);
}

export function userCanViewMyAccount(user?: AuthzUser): boolean {
  return hasPermissionForUser(user, PERMISSIONS.MY_ACCOUNT_VIEW);
}

function isPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function canAccessEntityFormPath(
  pathname: string,
  addBasePath: string,
  addPermission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
  updatePermission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
  user: AuthzUser
): boolean | null {
  if (pathname === addBasePath) {
    return hasPermissionForUser(user, addPermission);
  }
  if (pathname.startsWith(`${addBasePath}/`)) {
    return hasPermissionForUser(user, updatePermission);
  }
  return null;
}

/**
 * Whether the user may open this pathname (direct URL or navigation).
 * Must stay aligned with `AppSidebar` nav visibility.
 */
export function canAccessPathname(pathname: string, user: AuthzUser): boolean {
  if (!user) return false;
  if (isSuperAdminRole(user.role ?? '')) return true;

  const membersFormAccess = canAccessEntityFormPath(
    pathname,
    '/members/add-member',
    PERMISSIONS.MEMBERS_ADD,
    PERMISSIONS.MEMBERS_UPDATE,
    user
  );
  if (membersFormAccess !== null) return membersFormAccess;

  const trainersFormAccess = canAccessEntityFormPath(
    pathname,
    '/trainers-staff/add-trainer',
    PERMISSIONS.TRAINERS_ADD,
    PERMISSIONS.TRAINERS_UPDATE,
    user
  );
  if (trainersFormAccess !== null) return trainersFormAccess;

  const plansFormAccess = canAccessEntityFormPath(
    pathname,
    '/membership-plans/add-plan',
    PERMISSIONS.MEMBERSHIP_PLANS_ADD,
    PERMISSIONS.MEMBERSHIP_PLANS_UPDATE,
    user
  );
  if (plansFormAccess !== null) return plansFormAccess;

  const usersFormAccess = canAccessEntityFormPath(
    pathname,
    '/users/add-user',
    PERMISSIONS.USERS_ADD,
    PERMISSIONS.USERS_UPDATE,
    user
  );
  if (usersFormAccess !== null) return usersFormAccess;

  if (isPath(pathname, '/membership-plans')) {
    return userCanViewMembershipPlans(user);
  }
  if (isPath(pathname, '/users')) {
    return userCanViewUsersPage(user);
  }
  if (isPath(pathname, '/members')) {
    return userCanViewMembers(user);
  }
  if (isPath(pathname, '/gyms')) {
    return userCanViewGyms(user);
  }
  if (isPath(pathname, '/trainers-staff')) {
    return userCanViewTrainers(user);
  }
  if (isPath(pathname, '/payments')) {
    return userCanViewPayments(user);
  }
  if (isPath(pathname, '/dashboard')) {
    return userCanViewDashboard(user);
  }
  if (isPath(pathname, '/notifications')) {
    return userCanViewNotifications(user);
  }
  if (isPath(pathname, '/attendance')) {
    return userCanViewMembers(user);
  }
  if (isPath(pathname, '/account')) {
    return userCanViewMyAccount(user);
  }

  return true;
}

export function getFirstAccessibleHref(user: AuthzUser): string {
  if (!user) return '/request-permissions';
  if (userCanViewDashboard(user)) return '/dashboard';
  if (userCanViewUsersPage(user)) return '/users';
  if (userCanViewMembers(user)) return '/members';
  if (userCanViewGyms(user)) return '/gyms';
  if (userCanViewTrainers(user)) return '/trainers-staff';
  if (userCanViewMembershipPlans(user)) return '/membership-plans';
  if (userCanViewPayments(user)) return '/payments';
  if (userCanViewNotifications(user)) return '/notifications';
  if (userCanViewMyAccount(user)) return '/account';
  return '/request-permissions';
}
