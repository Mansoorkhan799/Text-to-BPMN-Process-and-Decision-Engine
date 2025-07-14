import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, storeOTP, sendOTPEmail } from '@/app/utils/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP
    storeOTP(email, otp);

    // Send OTP email
    const sent = await sendOTPEmail(email, otp);

    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send OTP' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'OTP sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 