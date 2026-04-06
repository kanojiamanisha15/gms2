/** API client: Auth-specific functions using the centralized API utility */

import { postRequest, getRequest } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { LoginCredentials, AuthResponse } from '@/types/auth';

// Re-export types for convenience
export type { LoginCredentials, AuthResponse };

/** Login user*/
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const response = await postRequest<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return response;
  } catch (error: unknown) {
    // Return API error response so caller can display the message
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/** Register new user*/
/** Get current authenticated user (cookie sent automatically) */
export async function getCurrentUser(): Promise<{
  success: boolean;
  data?: {
    user: {
      id: number;
      email: string;
      name: string;
      role?: string;
      permissions?: string[];
      created_at: string;
    };
  };
  error?: string;
}> {
  const response = await getRequest<{
    success: boolean;
    data?: {
      user: {
        id: number;
        email: string;
        name: string;
        role?: string;
        permissions?: string[];
        created_at: string;
      };
    };
    error?: string;
  }>(API_ENDPOINTS.AUTH.ME);

  return response;
}

/** Logout user (API clears auth cookie) */
export async function logout(): Promise<void> {
  try {
    await postRequest<{ success: boolean }>(API_ENDPOINTS.AUTH.LOGOUT, {});
  } catch (error) {
    console.error('Logout error:', error);
  }
}
