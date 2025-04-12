import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await connectDB();

    // Hash the token from the URL to compare with the stored one
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find the user with the matching email and token
    const user = await User.findOne({
      email,
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() } // Ensure token hasn't expired
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if the new password is the same as the old one
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return NextResponse.json(
        { error: 'New password cannot be the same as your old password' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the user's password and clear reset token fields
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();
    
    return NextResponse.json({ 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting your password' },
      { status: 500 }
    );
  }
} 