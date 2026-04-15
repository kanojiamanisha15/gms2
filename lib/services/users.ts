import { deleteRequest, getRequest, patchRequest, postRequest } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants/api';

export type AppUserRow = {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  gymId: number | null;
  gymName: string | null;
  created_at: string;
  updated_at: string;
};

export type UpdateAdminUserBody = {
  name?: string;
  email?: string;
  role?: string;
  password?: string;
  permissions?: string[];
  gymId?: number | null;
};

export type CreateAdminUserBody = {
  name: string;
  email: string;
  password: string;
  role: string;
  gymId?: number | null;
};

type UsersListResponse = {
  success: boolean;
  data?: { users: AppUserRow[] };
  error?: string;
};

type UserOneResponse = {
  success: boolean;
  data?: { user: AppUserRow };
  error?: string;
};

type PatchUserResponse = {
  success: boolean;
  data?: { user: AppUserRow };
  error?: string;
};

type CreateUserResponse = {
  success: boolean;
  data?: { user: AppUserRow };
  error?: string;
};

type DeleteUserResponse = {
  success: boolean;
  error?: string;
};

function adminUserPath(id: number | string) {
  return `${API_ENDPOINTS.ADMIN_USERS}/${id}`;
}

/** POST /api/admin/users */
export async function doCreateAdminUser(body: CreateAdminUserBody): Promise<AppUserRow> {
  const response = await postRequest<CreateUserResponse>(API_ENDPOINTS.ADMIN_USERS, body);
  if (!response?.success || !response.data?.user) {
    throw new Error(
      (response as { error?: string })?.error || 'Failed to create user'
    );
  }
  return response.data.user;
}

/** GET /api/admin/users */
export async function doGetUsers(params?: {
  sortBy?: 'id' | 'name' | 'email' | 'gym' | 'role' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}): Promise<AppUserRow[]> {
  const response = await getRequest<UsersListResponse>(API_ENDPOINTS.ADMIN_USERS, {
    sortBy: params?.sortBy,
    sortOrder: params?.sortOrder,
  });
  if (!response?.success || !response.data?.users) {
    throw new Error(response?.error || 'Failed to load users');
  }
  return response.data.users;
}

/** GET /api/admin/users/[id] */
export async function doGetAdminUser(id: number | string): Promise<AppUserRow> {
  const response = await getRequest<UserOneResponse>(adminUserPath(id));
  if (!response?.success || !response.data?.user) {
    throw new Error(response?.error || 'Failed to load user');
  }
  return response.data.user;
}

/** PATCH /api/admin/users/[id] */
export async function doPatchAdminUser(
  id: number | string,
  body: UpdateAdminUserBody
): Promise<AppUserRow> {
  const response = await patchRequest<PatchUserResponse>(adminUserPath(id), body);
  if (!response?.success) {
    throw new Error(
      (response as { error?: string })?.error || 'Failed to update user'
    );
  }
  if (!response.data?.user) {
    throw new Error('Failed to update user');
  }
  return response.data.user;
}

/** DELETE /api/admin/users/[id] */
export async function doDeleteAdminUser(id: number | string): Promise<void> {
  const response = await deleteRequest<DeleteUserResponse>(adminUserPath(id));
  if (response && typeof response === 'object' && 'success' in response && !response.success) {
    throw new Error((response as { error?: string }).error || 'Failed to delete user');
  }
}

