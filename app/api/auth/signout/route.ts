import { NextResponse } from 'next/server';
import { removeTokenCookie } from '@/app/utils/jwt';

export async function POST() {
  try {
    // Remove the token cookie
    removeTokenCookie();

    return NextResponse.json(
      { message: 'Successfully signed out' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 