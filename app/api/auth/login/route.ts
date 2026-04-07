import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db/db';
import { comparePassword, generateToken } from '@/lib/services/auth';

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await queryOne<{
      id: number;
      email: string;
      password: string;
      name: string;
      role?: string;
      gym_id?: number;
    }>(
      'SELECT id, email, password, name, role, gym_id  FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      gymId: user.gym_id,
    });

    // Create response with token in JSON
    const response = NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          gymId: user.gym_id,
        },
      },
    });

    // Set HTTP-only cookie for middleware access
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to authenticate user' },
      { status: 500 }
    );
  }
}
