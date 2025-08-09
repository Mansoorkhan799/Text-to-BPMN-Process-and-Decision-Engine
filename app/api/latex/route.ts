import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import LatexFile from '../../../models/LatexFile';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    const listAll = searchParams.get('listAll');
    
    // If listAll is requested, return all files
    if (listAll === 'true') {
      const files = await LatexFile.find({});
      console.log(`Found ${files.length} LaTeX files in MongoDB Atlas`);
      return NextResponse.json({ 
        files: files.map(f => ({ 
          id: f.fileId || f._id, 
          name: f.name, 
          documentMetadata: f.documentMetadata || {
            title: '',
            author: '',
            description: '',
            tags: [],
          }
        })) 
      });
    }
    
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }
    
    // Try to find by fileId first, then by _id
    let file = await LatexFile.findOne({ fileId: fileId });
    if (!file) {
      file = await LatexFile.findById(fileId);
    }
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    console.log('Retrieved LaTeX file from MongoDB Atlas:', file.fileId || file._id, file.name);
    return NextResponse.json(file);
  } catch (error) {
    console.error('Error in GET /api/latex:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, type, content, fileId, documentMetadata } = body;
    
    console.log('Creating new LaTeX file:', { userId, name, type });
    
    if (!userId || !name || !type || !content) {
      console.log('Missing required fields:', { userId: !!userId, name: !!name, type: !!type, content: !!content });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    await connectDB();
    
    // Create new file with generated fileId
    const newFileId = fileId || `latex-file-${Date.now()}`;
    
    const file = await LatexFile.create({ 
      fileId: newFileId,
      userId, 
      name, 
      type, 
      content,
      documentMetadata: {
        title: name,
        author: (documentMetadata && documentMetadata.author) ? documentMetadata.author : '',
        description: (documentMetadata && documentMetadata.description) ? documentMetadata.description : '',
        tags: (documentMetadata && documentMetadata.tags) ? documentMetadata.tags : [],
      }
    });
    
    console.log('Created new LaTeX file:', file.fileId);
    return NextResponse.json(file);
  } catch (error) {
    console.error('Error in POST /api/latex:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileId, content, name, documentMetadata } = body;
    
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }
    
    await connectDB();
    
    // Find and update the file
    let file = await LatexFile.findOne({ fileId: fileId });
    if (!file) {
      file = await LatexFile.findById(fileId);
    }
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Update the file
    if (content !== undefined) file.content = content;
    if (name !== undefined) file.name = name;
    if (documentMetadata !== undefined) file.documentMetadata = documentMetadata;
    file.updatedAt = new Date();
    
    await file.save();
    
    console.log('Updated LaTeX file in MongoDB Atlas:', file.fileId);
    return NextResponse.json(file);
  } catch (error) {
    console.error('Error in PUT /api/latex:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');
    
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }
    
    await connectDB();
    
    // Try to find by fileId first, then by _id
    let file = await LatexFile.findOne({ fileId: fileId });
    if (!file) {
      file = await LatexFile.findById(fileId);
    }
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    await LatexFile.deleteOne({ _id: file._id });
    
    console.log('Deleted LaTeX file from MongoDB Atlas:', fileId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/latex:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 