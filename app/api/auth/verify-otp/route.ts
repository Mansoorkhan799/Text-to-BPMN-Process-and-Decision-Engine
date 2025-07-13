import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/app/utils/email';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { email, otp, name, password, role } = await request.json();
    console.log('Received verification request:', { email, otp }); // Debug log

    if (!email || !otp) {
      console.log('Missing email or OTP'); // Debug log
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = verifyOTP(email, otp);
    console.log('OTP verification result:', isValid); // Debug log

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Connect to MongoDB - keep verbose logging for authentication
    await connectDB(false); // Explicitly set to not silent
    console.log('MongoDB connected in verify-otp route');

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in MongoDB
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      authType: 'email'
    });

    console.log('✓ User created in MongoDB:', user._id);

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create the response
    const response = NextResponse.json(
      {
        message: 'OTP verified successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      },
      { status: 200 }
    );

    // Set the token in cookies
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 