import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/signin?error=no_code', request.url));
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      return NextResponse.redirect(new URL('/signin?error=token_exchange_failed', request.url));
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error('Failed to get user info:', userData);
      return NextResponse.redirect(new URL('/signin?error=user_info_failed', request.url));
    }
    
    // Connect to MongoDB
    await connectDB();
    console.log('MongoDB connected in Google callback route');
    
    // Check if user exists
    let user = await User.findOne({ email: userData.email });
    
    if (!user) {
      // Create a new user
      user = await User.create({
        name: userData.name,
        email: userData.email,
        // For Google auth users, we set a random password they can't use
        // They'll always sign in with Google
        password: Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10),
        googleId: userData.id,
        picture: userData.picture,
        authType: 'google'
      });
      console.log('✓ New Google user created in MongoDB:', user._id);
    } else {
      // Update existing user with Google data if needed
      user.googleId = userData.id;
      user.picture = userData.picture || user.picture;
      user.authType = 'google'; // Set or update the auth type
      await user.save();
      console.log('✓ Existing user updated with Google data:', user._id);
    }

    // Create JWT token with MongoDB user ID
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name,
        authType: 'google'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create the response with redirect
    const response = NextResponse.redirect(new URL('/', request.url));

    // Set the token in cookies with the response
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(new URL(`/signin?error=callback_error&details=${encodeURIComponent(error.message)}`, request.url));
  }
} 