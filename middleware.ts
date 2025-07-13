import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Define role-based route access
const ROLE_ACCESS = {
  admin: ['/admin', '/users', '/settings'],
  supervisor: ['/supervisor', '/reports'],
  user: ['/dashboard', '/profile']
};

// Function to decode JWT token
function decodeToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    return null;
  }
}

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

  // Redirect to signin if no token and not on auth page
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // Redirect to home if already authenticated and trying to access auth pages
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Role-based access control
  if (token && !isAuthPage) {
    const decodedToken = decodeToken(token) as { role?: string } | null;
    const userRole = decodedToken?.role || 'user';
    
    // Check if trying to access admin routes
    if (request.nextUrl.pathname.startsWith('/admin') && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Check if trying to access supervisor routes
    if (request.nextUrl.pathname.startsWith('/supervisor') && 
        userRole !== 'supervisor' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Redirect non-admin users trying to access users page
    if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.get('view') === 'users' && 
        userRole !== 'admin' && userRole !== 'supervisor') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 