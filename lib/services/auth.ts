import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import type { TokenPayload } from '@/types/auth';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

// Re-export for convenience
export type { TokenPayload };

/** Hash a password using bcrypt*/
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/** Compare a password with a hash*/
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Generate a JWT token*/
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
}

/** Verify a JWT token*/
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export type AuthResult =
  | { error: NextResponse; payload?: never }
  | { payload: TokenPayload; error?: never };

/** Require authentication for API routes. Returns error response or payload. */
export function requireAuth(request: NextRequest): AuthResult {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, error: 'No token found' },
        { status: 401 }
      )
    };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    };
  }

  return { payload };
}
