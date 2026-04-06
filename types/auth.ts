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
    };
  };
  error?: string;
}

export interface TokenPayload {
  userId: number;
  email: string;
  role?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  permissions?: string[];
  created_at: string;
  updated_at: string;
}
