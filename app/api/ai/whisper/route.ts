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

    // Check if request has form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ 
        error: 'Audio file is required' 
      }, { status: 400 });
    }

    // Validate file type
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only audio files are allowed.' 
      }, { status: 400 });
    }

    // Check file size (max 25MB for Whisper API)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 25MB.' 
      }, { status: 400 });
    }

    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    // Convert audio file to buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Create form data for OpenAI API
    const openAIFormData = new FormData();
    openAIFormData.append('file', new Blob([audioBuffer], { type: audioFile.type }), 'audio.webm');
    openAIFormData.append('model', 'whisper-1');
    openAIFormData.append('response_format', 'json');

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: openAIFormData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI Whisper API error:', errorData);
      return NextResponse.json({ 
        error: 'Failed to transcribe audio' 
      }, { status: 500 });
    }

    const data = await response.json();
    const transcription = data.text || '';

    // Clean and process transcription
    const cleanedTranscription = transcription
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s.,!?-]/g, ''); // Remove special characters except basic punctuation

    return NextResponse.json({
      success: true,
      transcription: cleanedTranscription,
      metadata: {
        originalFileSize: audioFile.size,
        originalFileType: audioFile.type,
        transcriptionLength: cleanedTranscription.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in Whisper API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}


