import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getTokenFromCookies, verifyToken } from '@/app/utils/jwt';

export async function POST(request: NextRequest) {
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

    // Connect to MongoDB
    await connectDB();

    // Find user
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('profilePicture') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profile-pictures');
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `profile_${user._id}_${timestamp}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate public URL
    const publicUrl = `/uploads/profile-pictures/${fileName}`;

    // Update user profile picture in database
    user.profilePicture = publicUrl;
    await user.save();

    // Create a new JWT with updated user information
    const jwt = require('jsonwebtoken');
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
        message: 'Profile picture updated successfully',
        profilePicture: publicUrl,
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
    console.error('Profile picture upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Connect to MongoDB
    await connectDB();

    // Find user
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove profile picture
    user.profilePicture = undefined;
    await user.save();

    // Create a new JWT with updated user information
    const jwt = require('jsonwebtoken');
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
        message: 'Profile picture removed successfully',
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
    console.error('Profile picture removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
