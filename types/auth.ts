/** Authentication related types */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    user: {
      id: number;
      email: string;
      name: string;
      role?: string;
      gymId?: number;
    };
  };
  error?: string;
}

export interface TokenPayload {
  userId: number;
  email: string;
  role?: string;
  gymId?: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  permissions?: string[];
  gymId?: number;
  gymName?: string | null;
  created_at: string;
  updated_at: string;
}
