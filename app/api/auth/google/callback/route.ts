import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Connect to MongoDB - keep verbose logging for authentication
    await connectDB(false); // Explicitly set to not silent
    console.log('MongoDB connected in Google callback route');

    // First check if user exists by googleId
    let user = await User.findOne({ googleId: userData.id });

    // If not found by googleId, check by email
    if (!user) {
      // Check if an account with this email already exists
      const existingEmailUser = await User.findOne({ email: userData.email });

      if (existingEmailUser) {
        // Link existing account with Google
        existingEmailUser.googleId = userData.id;
        existingEmailUser.picture = userData.picture || existingEmailUser.picture;
        
        // If they don't have a profilePicture, use the Google picture
        if (!existingEmailUser.profilePicture && userData.picture) {
          existingEmailUser.profilePicture = userData.picture;
        }

        // If they already have an authType, add Google as another method
        // but don't change their existing role
        if (existingEmailUser.authType && existingEmailUser.authType !== 'google') {
          console.log(`User ${existingEmailUser.email} has linked Google account to existing ${existingEmailUser.authType} account`);
        }

        existingEmailUser.authType = 'google';
        await existingEmailUser.save();
        console.log('✓ Linked Google account to existing user:', existingEmailUser._id);
        user = existingEmailUser;
      } else {
        // Create new user with Google account
        user = await User.create({
          name: userData.name,
          email: userData.email,
          password: Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10),
          googleId: userData.id,
          picture: userData.picture,
          profilePicture: userData.picture, // Set profilePicture to Google picture for new users
          role: 'user', // Default role for new users
          authType: 'google'
        });
        console.log('✓ New Google user created in MongoDB:', user._id);
      }
    } else {
      // User found by Google ID - update their profile if needed
      user.name = userData.name || user.name;
      user.picture = userData.picture || user.picture;
      
      // Update profilePicture if Google picture is newer or user doesn't have one
      if (userData.picture && (!user.profilePicture || userData.picture !== user.picture)) {
        user.profilePicture = userData.picture;
      }
      
      await user.save();
      console.log('✓ Existing Google user updated:', user._id);
    }

    // Create JWT token with all relevant user data
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role, // Include the user's role from the database
        phoneNumber: user.phoneNumber || '',
        address: user.address || '',
        state: user.state || '',
        country: user.country || '',
        zipCode: user.zipCode || '',
        profilePicture: user.profilePicture || user.picture || '', // Include profile picture or Google picture
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
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(new URL(`/signin?error=callback_error&details=${encodeURIComponent(error.message)}`, request.url));
  }
} 