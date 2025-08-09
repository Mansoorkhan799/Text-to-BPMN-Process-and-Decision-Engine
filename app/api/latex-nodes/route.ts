import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LatexNode from '@/models/LatexNode';
import { v4 as uuidv4 } from 'uuid';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parentId: string | null;
  children: TreeNode[];
  content?: string;
  documentMetadata?: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// GET: Fetch the complete tree for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Fetch all nodes for the user
    const nodes = await LatexNode.find({ userId }).sort({ createdAt: 1 });
    
    // Build the tree structure
    const buildTree = (parentId: string | null = null): TreeNode[] => {
      return nodes
        .filter(node => node.parentId === parentId)
        .map(node => ({
          id: node.id,
          name: node.name,
          type: node.type,
          parentId: node.parentId,
          children: node.type === 'folder' ? buildTree(node.id) : [],
          content: node.type === 'file' ? node.content : undefined,
          documentMetadata: node.type === 'file' ? node.documentMetadata : undefined,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        }));
    };

    const tree = buildTree();
    
    return NextResponse.json({ success: true, tree });
  } catch (error) {
    console.error('Error fetching LaTeX tree:', error);
    return NextResponse.json({ error: 'Failed to fetch LaTeX tree' }, { status: 500 });
  }
}

// POST: Create a new node (folder or file)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, type, name, parentId, content, documentMetadata } = body;
    
    if (!userId || !type || !name) {
      return NextResponse.json({ error: 'userId, type, and name are required' }, { status: 400 });
    }
    
    if (!['folder', 'file'].includes(type)) {
      return NextResponse.json({ error: 'type must be folder or file' }, { status: 400 });
    }

    const nodeId = uuidv4();
    
    // If it's a file, ensure content is provided
    if (type === 'file' && !content) {
      return NextResponse.json({ error: 'content is required for files' }, { status: 400 });
    }

    // If parentId is provided, verify it exists and is a folder
    if (parentId) {
      const parent = await LatexNode.findOne({ id: parentId, userId });
      if (!parent) {
        return NextResponse.json({ error: 'Parent node not found' }, { status: 404 });
      }
      if (parent.type !== 'folder') {
        return NextResponse.json({ error: 'Parent must be a folder' }, { status: 400 });
      }
      
      // Add this node to parent's children
      await LatexNode.updateOne(
        { id: parentId },
        { $push: { children: nodeId } }
      );
    }

    const newNode = new LatexNode({
      id: nodeId,
      userId,
      type,
      name,
      parentId: parentId || null,
      children: type === 'folder' ? [] : undefined,
      content: type === 'file' ? content : undefined,
      documentMetadata: type === 'file' ? ({
        title: (documentMetadata && documentMetadata.title) ? documentMetadata.title : name,
        author: (documentMetadata && documentMetadata.author) ? documentMetadata.author : '',
        description: (documentMetadata && documentMetadata.description) ? documentMetadata.description : '',
        tags: (documentMetadata && documentMetadata.tags) ? documentMetadata.tags : [],
      }) : undefined,
    });

    await newNode.save();
    
    return NextResponse.json({ 
      success: true, 
      node: {
        id: newNode.id,
        name: newNode.name,
        type: newNode.type,
        parentId: newNode.parentId,
        children: newNode.children || [],
        content: newNode.content,
        documentMetadata: newNode.documentMetadata,
        createdAt: newNode.createdAt,
        updatedAt: newNode.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error creating LaTeX node:', error);
    return NextResponse.json({ error: 'Failed to create LaTeX node' }, { status: 500 });
  }
}

// PUT: Update a node
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { nodeId, name, content, documentMetadata, parentId } = body;
    
    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
    }

    const node = await LatexNode.findOne({ id: nodeId });
    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Handle parentId change (move operation)
    if (parentId !== undefined && parentId !== node.parentId) {
      // Remove from old parent's children array
      if (node.parentId) {
        await LatexNode.updateOne(
          { id: node.parentId },
          { $pull: { children: nodeId } }
        );
      }

      // Add to new parent's children array
      if (parentId) {
        const newParent = await LatexNode.findOne({ id: parentId });
        if (!newParent) {
          return NextResponse.json({ error: 'New parent not found' }, { status: 404 });
        }
        if (newParent.type !== 'folder') {
          return NextResponse.json({ error: 'New parent must be a folder' }, { status: 400 });
        }
        await LatexNode.updateOne(
          { id: parentId },
          { $push: { children: nodeId } }
        );
      }

      node.parentId = parentId;
    }

    // Update other fields
    if (name !== undefined) node.name = name;
    if (content !== undefined && node.type === 'file') node.content = content;
    if (documentMetadata !== undefined && node.type === 'file') node.documentMetadata = documentMetadata;
    node.updatedAt = new Date();

    await node.save();
    
    return NextResponse.json({ 
      success: true, 
      node: {
        id: node.id,
        name: node.name,
        type: node.type,
        parentId: node.parentId,
        children: node.children || [],
        content: node.content,
        documentMetadata: node.documentMetadata,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error updating LaTeX node:', error);
    return NextResponse.json({ error: 'Failed to update LaTeX node' }, { status: 500 });
  }
}

// DELETE: Delete a node
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    
    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
    }

    const node = await LatexNode.findOne({ id: nodeId });
    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Recursively delete all children
    const deleteChildren = async (parentId: string) => {
      const children = await LatexNode.find({ parentId });
      for (const child of children) {
        if (child.type === 'folder') {
          await deleteChildren(child.id);
        }
        await LatexNode.deleteOne({ id: child.id });
      }
    };

    if (node.type === 'folder') {
      await deleteChildren(node.id);
    }

    // Remove from parent's children array
    if (node.parentId) {
      await LatexNode.updateOne(
        { id: node.parentId },
        { $pull: { children: nodeId } }
      );
    }

    await LatexNode.deleteOne({ id: nodeId });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting LaTeX node:', error);
    return NextResponse.json({ error: 'Failed to delete LaTeX node' }, { status: 500 });
  }
} 