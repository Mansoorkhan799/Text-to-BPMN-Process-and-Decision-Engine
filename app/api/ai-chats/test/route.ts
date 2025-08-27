import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AiChat from '@/models/AiChat';

// GET /api/ai-chats/test - Test endpoint for auto-save functionality
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get a sample chat to test with
    const sampleChat = await AiChat.findOne().sort({ createdAt: -1 });
    
    if (!sampleChat) {
      return NextResponse.json({ 
        message: 'No chats found to test with',
        status: 'no-data'
      });
    }

    return NextResponse.json({ 
      message: 'Auto-save test endpoint working',
      sampleChatId: sampleChat._id,
      sampleChatTitle: sampleChat.title,
      messageCount: sampleChat.messages.length,
      status: 'success'
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', status: 'error' },
      { status: 500 }
    );
  }
}

// POST /api/ai-chats/test - Test creating and updating chats
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { action, chatId, message } = body;

    if (action === 'test-save') {
      // Test saving a message to an existing chat
      const chat = await AiChat.findById(chatId);
      if (!chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }

      const testMessage = {
        id: Date.now().toString(),
        type: 'assistant' as const,
        content: message || 'Test auto-save message',
        timestamp: new Date()
      };

      chat.messages.push(testMessage);
      chat.lastModified = new Date();
      await chat.save();

      return NextResponse.json({ 
        message: 'Test message saved successfully',
        newMessageCount: chat.messages.length,
        status: 'success'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', status: 'error' },
      { status: 500 }
    );
  }
}
