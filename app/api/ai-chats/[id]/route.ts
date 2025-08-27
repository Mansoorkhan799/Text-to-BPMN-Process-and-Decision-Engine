import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AiChat from '@/models/AiChat';
import { getTokenFromRequest, verifyToken } from '@/app/utils/jwt';
import User from '@/models/User';

// GET /api/ai-chats/[id] - Get a specific chat with full messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const chat = await AiChat.findOne({
      _id: params.id,
      userId: user._id
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(chat);

  } catch (error) {
    console.error('Error fetching AI chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/ai-chats/[id] - Update a specific chat
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { title, messages, category, tags, isArchived } = body;

    // Find and update the chat
    const updatedChat = await AiChat.findOneAndUpdate(
      {
        _id: params.id,
        userId: user._id
      },
      {
        $set: {
          ...(title && { title }),
          ...(messages && { messages }),
          ...(category && { category }),
          ...(tags && { tags }),
          ...(typeof isArchived === 'boolean' && { isArchived }),
          lastModified: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(updatedChat);

  } catch (error) {
    console.error('Error updating AI chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/ai-chats/[id] - Delete a specific chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find and delete the chat
    const deletedChat = await AiChat.findOneAndDelete({
      _id: params.id,
      userId: user._id
    });

    if (!deletedChat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Chat deleted successfully' });

  } catch (error) {
    console.error('Error deleting AI chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
