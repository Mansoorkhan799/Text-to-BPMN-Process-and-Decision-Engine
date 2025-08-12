import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    console.log('Sign in attempt for email:', email);

    if (!email || !password) {
      console.log('Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB - keep verbose logging for authentication
    await connectDB(false); // Explicitly set to not silent
    console.log('MongoDB connected in signin route');

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found in MongoDB:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    console.log('User found in MongoDB:', user._id);

    // Compare passwords
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    console.log('Password validated successfully');

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phoneNumber: user.phoneNumber || '',
        address: user.address || '',
        state: user.state || '',
        country: user.country || '',
        zipCode: user.zipCode || '',
        profilePicture: user.profilePicture || ''
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );
    console.log('JWT token created');

    // Set the token in cookies
    const response = NextResponse.json(
      {
        message: 'Successfully signed in',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber || '',
          address: user.address || '',
          state: user.state || '',
          country: user.country || '',
          zipCode: user.zipCode || '',
          profilePicture: user.profilePicture || ''
        }
      },
      { status: 200 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 1 day
    });
    console.log('✓ User signed in successfully:', email);

    return response;
  } catch (error: any) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 