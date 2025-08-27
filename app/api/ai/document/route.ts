import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/app/utils/jwt';
import User from '@/models/User';

function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,!?;:()[\]{}"'`~@#$%^&*+=<>/\\|]/g, '')
    .trim()
    .substring(0, 8000);
}

function removeIrrelevantSections(text: string): string {
  const lines = text.split('\n');
  const relevantLines = lines.filter(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.length === 0) return false;
    if (/^\d+$/.test(trimmedLine)) return false;
    if (/^[=\-_*]{3,}$/.test(trimmedLine)) return false;
    if (trimmedLine.length < 3) return false;
    return true;
  });
  return relevantLines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await User.findOne({ email: payload.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const documentFile = formData.get('document') as File;

    if (!documentFile) {
      return NextResponse.json({ error: 'Document file is required' }, { status: 400 });
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!allowedTypes.includes(documentFile.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only PDF and DOCX files are supported.' 
      }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (documentFile.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    let extractedText = '';

    try {
      if (documentFile.type === 'application/pdf') {
        const arrayBuffer = await documentFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const textDecoder = new TextDecoder('utf-8');
        const pdfContent = textDecoder.decode(uint8Array);
        
        const textMatch = pdfContent.match(/\(([^)]+)\)/g);
        if (textMatch) {
          extractedText = textMatch
            .map(match => match.replace(/[()]/g, ''))
            .join(' ');
        } else {
          extractedText = pdfContent
            .replace(/[^\x20-\x7E\n\r\t]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        }

      } else if (documentFile.type.includes('wordprocessingml.document') || 
                 documentFile.type === 'application/msword') {
        const arrayBuffer = await documentFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const textDecoder = new TextDecoder('utf-8');
        const docxContent = textDecoder.decode(uint8Array);
        
        const textMatch = docxContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        if (textMatch) {
          extractedText = textMatch
            .map(match => match.replace(/<[^>]*>/g, ''))
            .join(' ');
        } else {
          extractedText = docxContent
            .replace(/[^\x20-\x7E\n\r\t]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        }
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Could not extract text from the document' 
        }, { status: 400 });
      }

      let cleanedText = cleanExtractedText(extractedText);
      cleanedText = removeIrrelevantSections(cleanedText);

      if (cleanedText.length > 4000) {
        cleanedText = cleanedText.substring(0, 4000) + '...';
      }

      return NextResponse.json({
        success: true,
        extractedText: cleanedText,
        metadata: {
          originalFileName: documentFile.name,
          originalFileSize: documentFile.size,
          originalFileType: documentFile.type,
          extractedTextLength: cleanedText.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (extractionError) {
      console.error('Error extracting text from document:', extractionError);
      return NextResponse.json({ 
        error: 'Failed to extract text from document' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in document processing API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
