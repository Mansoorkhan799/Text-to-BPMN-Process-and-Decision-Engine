import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { getTokenFromCookies, verifyToken } from '@/app/utils/jwt';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(request: NextRequest) {
  try {
    // Verify user is authenticated
    const token = getTokenFromCookies();
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { name, phoneNumber, address, state, country, zipCode, profilePicture } = await request.json();

    // Connect to MongoDB
    await connectDB();

    // Find and update user
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user details
    user.name = name || user.name;
    user.phoneNumber = phoneNumber !== undefined ? phoneNumber : user.phoneNumber;
    user.address = address !== undefined ? address : user.address;
    user.state = state !== undefined ? state : user.state;
    user.country = country !== undefined ? country : user.country;
    user.zipCode = zipCode !== undefined ? zipCode : user.zipCode;
    
    // Update profile picture if provided
    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture;
    }
    
    await user.save();

    // Create a new JWT with updated user information
    const newToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phoneNumber: user.phoneNumber,
        address: user.address,
        state: user.state,
        country: user.country,
        zipCode: user.zipCode,
        profilePicture: user.profilePicture
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    // Create the response
    const response = NextResponse.json(
      { 
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber,
          address: user.address,
          state: user.state,
          country: user.country,
          zipCode: user.zipCode,
          profilePicture: user.profilePicture
        }
      },
      { status: 200 }
    );

    // Set the updated token in cookies
    response.cookies.set('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/'
    });

    return response;
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 