import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Routes that don't require authentication */
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  // Allow API and public static assets through
  if (
    pathname.startsWith('/api/') ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|txt|xml|webmanifest)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Public routes: allow unauthenticated; redirect authenticated users to dashboard
  if (isPublicRoute(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // All other routes are protected: require auth
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Configure which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|txt|xml|webmanifest)$).*)',
  ],
};
