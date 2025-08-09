import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import BpmnFileTree from '../../../models/BpmnFileTree';
import BpmnFile from '../../../models/BpmnFile';
import User from '../../../models/User';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Missing userId or userRole' }, { status: 400 });
    }
    
    // Get all BPMN files for this user from the database
    const files = await BpmnFile.find({ userId });
    console.log(`Found ${files.length} BPMN files for user:`, userId);
    
    // Convert files to file tree structure (flat structure without folders)
    const treeData = await Promise.all(files.map(async file => {
      // Get the createdBy value from advancedDetails, or fetch user info if not available
      let createdByValue = file.userId; // Default to userId
      
      if (file.advancedDetails?.createdBy) {
        // Use the createdBy value from advancedDetails if available
        createdByValue = file.advancedDetails.createdBy;
      } else {
        // Fetch user's name from database as fallback
        try {
          const user = await User.findById(file.userId);
          if (user) {
            createdByValue = user.name || user.email || file.userId;
          }
        } catch (error) {
          console.error('Error fetching user info:', error);
          // Fallback to userId if user fetch fails
        }
      }
      
      return {
        id: file.fileId || file._id,
        name: `${file.name}.bpmn`,
        type: 'file' as const,
        path: `${file.name}.bpmn`,
        projectData: {
          id: file.fileId || file._id,
          name: file.name,
          lastEdited: file.updatedAt?.toISOString() || new Date().toISOString(),
          createdBy: createdByValue,
          role: userRole,
          processMetadata: file.processMetadata || {
            processName: '',
            description: '',
            processOwner: '',
            processManager: '',
          }
        }
      };
    }));
    
    console.log('Generated file tree from database files:', treeData.length, 'items');
    return NextResponse.json({ treeData });
  } catch (error) {
    console.error('Error in GET /api/bpmn-filetree:', error);
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
    
    console.log('Processing file tree update for user:', userId, 'with', treeData.length, 'items');
    
    // Process files to ensure they exist in the database
    for (const fileNode of treeData) {
      if (fileNode.type === 'file' && fileNode.projectData) {
        const projectData = fileNode.projectData;
        
        // Check if file already exists
        let existingFile = await BpmnFile.findOne({ fileId: fileNode.id });
        
        if (existingFile) {
          // Update existing file
          existingFile.name = projectData.name;
          existingFile.processMetadata = projectData.processMetadata || {
            processName: '',
            description: '',
            processOwner: '',
            processManager: '',
          };
          existingFile.updatedAt = new Date();
          await existingFile.save();
          console.log('Updated existing file:', fileNode.id);
        } else {
          // Create new file
          await BpmnFile.create({
            fileId: fileNode.id,
            userId: userId,
            name: projectData.name,
            type: 'xml',
            content: projectData.xml || '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions>...</bpmn:definitions>',
            processMetadata: projectData.processMetadata || {
              processName: '',
              description: '',
              processOwner: '',
              processManager: '',
            }
          });
          console.log('Created new file:', fileNode.id);
        }
      }
    }
    
    console.log('File tree processed successfully for user:', userId);
    return NextResponse.json({ success: true, message: 'File tree updated successfully' });
  } catch (error) {
    console.error('Error in POST /api/bpmn-filetree:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 