import { NextResponse } from 'next/server';
import { checkConnection } from '@/lib/db/db';

/**
 * GET /api/health
 * Used by Neon, Vercel, and other platforms to verify the app and DB are reachable.
 */
export async function GET() {
  try {
    const ok = await checkConnection();
    if (!ok) {
      return NextResponse.json(
        { status: 'unhealthy', database: 'disconnected' },
        { status: 503 }
      );
    }
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
    });
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', database: 'error' },
      { status: 503 }
    );
  }
}
