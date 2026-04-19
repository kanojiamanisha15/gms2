/** API Constants */

export const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  USERS: '/api/users',
  MEMBERS: '/api/members',
  MEMBERS_EXPORT: '/api/members/export',
  MEMBERS_IMPORT: '/api/members/import',
  TRAINERS_EXPORT: '/api/trainers/export',
  TRAINERS_IMPORT: '/api/trainers/import',
  MEMBERSHIP_PLANS_EXPORT: '/api/membership-plans/export',
  MEMBERSHIP_PLANS_IMPORT: '/api/membership-plans/import',
  EXPENSES_EXPORT: '/api/expenses/export',
  EXPENSES_IMPORT: '/api/expenses/import',
  MEMBERS_EXPIRING: '/api/members/expiring',
  GYMS: '/api/gyms',
  TRAINERS: '/api/trainers',
  MEMBERSHIP_PLANS: '/api/membership-plans',
  EXPENSES: '/api/expenses',
  BANKS: '/api/banks',
  DASHBOARD_OVERVIEW: '/api/dashboard/overview',
  NOTIFICATIONS: '/api/notifications',
  NOTIFICATIONS_READ_ALL: '/api/notifications/read-all',
  DASHBOARD_FINANCIAL_CHART: '/api/dashboard/financial-chart',
  ADMIN_USERS: '/api/admin/users',
} as const;
