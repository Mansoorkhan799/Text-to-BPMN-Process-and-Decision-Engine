import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/utils/jwt';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
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
    const { 
      text, 
      voiceId = 'alloy' // Default OpenAI voice
    } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Text content is required' 
      }, { status: 400 });
    }

    // Limit text length to prevent abuse
    const maxLength = 1000;
    if (text.length > maxLength) {
      return NextResponse.json({ 
        error: `Text too long. Maximum length is ${maxLength} characters.` 
      }, { status: 400 });
    }

    // Use OpenAI TTS
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.trim(),
        voice: voiceId,
        response_format: 'mp3',
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI TTS API error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to generate speech' 
      }, { status: 500 });
    }

    // Convert audio response to base64 for frontend
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
    const metadata = {
      provider: 'openai',
      voice: voiceId,
      textLength: text.length,
      audioFormat: 'audio/mp3',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      audioUrl,
      metadata
    });

  } catch (error) {
    console.error('Error in TTS API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
