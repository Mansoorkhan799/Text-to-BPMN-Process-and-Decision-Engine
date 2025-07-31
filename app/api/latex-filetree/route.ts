import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import LatexFileTree from '../../../models/LatexFileTree';
import LatexFile from '../../../models/LatexFile';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Missing userId or userRole' }, { status: 400 });
    }
    
    // Get all LaTeX files for this user from the database
    const files = await LatexFile.find({ userId });
    console.log(`Found ${files.length} LaTeX files for user:`, userId);
    
    // Convert files to file tree structure (flat structure without folders)
    const treeData = files.map(file => ({
      id: file.fileId || file._id,
      name: `${file.name}.${file.type}`,
      type: 'file' as const,
      path: `${file.name}.${file.type}`,
      projectData: {
        id: file.fileId || file._id,
        name: file.name,
        lastEdited: file.updatedAt?.toISOString() || new Date().toISOString(),
        createdBy: file.userId,
        role: userRole,
        content: file.content,
        documentMetadata: file.documentMetadata || {
          title: '',
          author: '',
          description: '',
          tags: [],
        }
      }
    }));
    
    console.log('Generated file tree from database files:', treeData.length, 'items');
    return NextResponse.json({ treeData });
  } catch (error) {
    console.error('Error in GET /api/latex-filetree:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, userRole, treeData } = body;
    if (!userId || !userRole || !treeData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    console.log('Processing LaTeX file tree update for user:', userId, 'with', treeData.length, 'items');
    
    // Process files to ensure they exist in the database
    for (const fileNode of treeData) {
      if (fileNode.type === 'file' && fileNode.projectData) {
        const projectData = fileNode.projectData;
        
        // Check if file already exists
        let existingFile = await LatexFile.findOne({ fileId: fileNode.id });
        
        if (existingFile) {
          // Update existing file
          existingFile.name = projectData.name;
          existingFile.content = projectData.content || existingFile.content;
          existingFile.documentMetadata = projectData.documentMetadata || {
            title: '',
            author: '',
            description: '',
            tags: [],
          };
          existingFile.updatedAt = new Date();
          await existingFile.save();
          console.log('Updated existing LaTeX file:', fileNode.id);
        } else {
          // Create new file
          await LatexFile.create({
            fileId: fileNode.id,
            userId: userId,
            name: projectData.name,
            type: 'tex',
            content: projectData.content || '\\documentclass{article}\n\\begin{document}\n\n\\end{document}',
            documentMetadata: projectData.documentMetadata || {
              title: '',
              author: '',
              description: '',
              tags: [],
            }
          });
          console.log('Created new LaTeX file:', fileNode.id);
        }
      }
    }
    
    console.log('LaTeX file tree processed successfully for user:', userId);
    return NextResponse.json({ success: true, message: 'File tree updated successfully' });
  } catch (error) {
    console.error('Error in POST /api/latex-filetree:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 