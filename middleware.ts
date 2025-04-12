import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow all API routes to pass through
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check for protected routes
  const token = request.cookies.get('token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/signin') || 
                    request.nextUrl.pathname.startsWith('/signup') ||
                    request.nextUrl.pathname.startsWith('/forgot-password') ||
                    request.nextUrl.pathname.startsWith('/reset-password');
  const isGoogleCallback = request.nextUrl.pathname.startsWith('/api/auth/google/callback');

  // Allow Google callback to proceed
  if (isGoogleCallback) {
    return NextResponse.next();
  }

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 