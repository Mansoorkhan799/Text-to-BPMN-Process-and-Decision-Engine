import { NextResponse } from 'next/server';
import { getTokenFromCookies, verifyToken } from '@/app/utils/jwt';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const token = getTokenFromCookies();
    
    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        phoneNumber: payload.phoneNumber || '',
        address: payload.address || '',
        state: payload.state || '',
        country: payload.country || '',
        zipCode: payload.zipCode || '',
        profilePicture: payload.profilePicture || ''
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 