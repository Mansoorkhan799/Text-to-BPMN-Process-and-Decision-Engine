import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AiChat from '@/models/AiChat';
import { getTokenFromRequest, verifyToken } from '@/app/utils/jwt';
import User from '@/models/User';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/ai-chats - Get all chats for the authenticated user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get the authenticated user from JWT token
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user ID from token payload
    const user = await User.findOne({ email: payload.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const isArchived = searchParams.get('archived') === 'true';

    // Build query
    const query: any = { 
      userId: user._id,
      isArchived: isArchived
    };

    if (search) {
      query.$text = { $search: search };
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    // Execute query with pagination
    const chats = await AiChat.find(query)
      .sort({ lastModified: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-messages'); // Don't include full messages in list view

    // Get total count for pagination
    const total = await AiChat.countDocuments(query);

    return NextResponse.json({
      chats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching AI chats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/ai-chats - Create a new chat
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Get the authenticated user from JWT token
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user ID from token payload
    const user = await User.findOne({ email: payload.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, messages, category, tags } = body;

    if (!title || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Title and messages are required' },
        { status: 400 }
      );
    }

    // Create new chat
    const newChat = new AiChat({
      userId: user._id,
      title,
      messages,
      category: category || 'General',
      tags: tags || [],
      timestamp: new Date(),
      lastModified: new Date(),
    });

    const savedChat = await newChat.save();

    return NextResponse.json(savedChat, { status: 201 });

  } catch (error) {
    console.error('Error creating AI chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
