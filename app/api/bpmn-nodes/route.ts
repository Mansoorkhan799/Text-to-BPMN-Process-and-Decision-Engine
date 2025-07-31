import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BpmnNode from '@/models/BpmnNode';
import { v4 as uuidv4 } from 'uuid';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parentId: string | null;
  children: TreeNode[];
  content?: string;
  processMetadata?: {
    processName: string;
    description: string;
    processOwner: string;
    processManager: string;
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
    const nodes = await BpmnNode.find({ userId }).sort({ createdAt: 1 });
    
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
          processMetadata: node.type === 'file' ? node.processMetadata : undefined,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        }));
    };

    const tree = buildTree();
    
    return NextResponse.json({ success: true, tree });
  } catch (error) {
    console.error('Error fetching BPMN tree:', error);
    return NextResponse.json({ error: 'Failed to fetch BPMN tree' }, { status: 500 });
  }
}

// POST: Create a new node (folder or file)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, type, name, parentId, content, processMetadata } = body;
    
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
      const parent = await BpmnNode.findOne({ id: parentId, userId });
      if (!parent) {
        return NextResponse.json({ error: 'Parent node not found' }, { status: 404 });
      }
      if (parent.type !== 'folder') {
        return NextResponse.json({ error: 'Parent must be a folder' }, { status: 400 });
      }
      
      // Add this node to parent's children
      await BpmnNode.updateOne(
        { id: parentId },
        { $push: { children: nodeId } }
      );
    }

    const newNode = new BpmnNode({
      id: nodeId,
      userId,
      type,
      name,
      parentId: parentId || null,
      children: type === 'folder' ? [] : undefined,
      content: type === 'file' ? content : undefined,
      processMetadata: type === 'file' ? processMetadata : undefined,
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
        processMetadata: newNode.processMetadata,
        createdAt: newNode.createdAt,
        updatedAt: newNode.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error creating BPMN node:', error);
    return NextResponse.json({ error: 'Failed to create BPMN node' }, { status: 500 });
  }
}

// PUT: Update a node
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { nodeId, userId, name, content, parentId, processMetadata } = body;
    
    if (!nodeId || !userId) {
      return NextResponse.json({ error: 'nodeId and userId are required' }, { status: 400 });
    }

    // Get the current node to handle parent changes
    const currentNode = await BpmnNode.findOne({ id: nodeId, userId });
    if (!currentNode) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const updateData: any = { updatedAt: new Date() };
    
    if (name !== undefined) updateData.name = name;
    if (content !== undefined) updateData.content = content;
    if (processMetadata !== undefined) updateData.processMetadata = processMetadata;

    // Handle parent change
    if (parentId !== undefined && parentId !== currentNode.parentId) {
      // Remove from old parent's children array
      if (currentNode.parentId) {
        await BpmnNode.updateOne(
          { id: currentNode.parentId },
          { $pull: { children: nodeId } }
        );
      }

      // Add to new parent's children array
      if (parentId) {
        const newParent = await BpmnNode.findOne({ id: parentId, userId });
        if (!newParent) {
          return NextResponse.json({ error: 'New parent not found' }, { status: 404 });
        }
        if (newParent.type !== 'folder') {
          return NextResponse.json({ error: 'Parent must be a folder' }, { status: 400 });
        }
        await BpmnNode.updateOne(
          { id: parentId },
          { $push: { children: nodeId } }
        );
      }

      updateData.parentId = parentId;
    }

    const updatedNode = await BpmnNode.findOneAndUpdate(
      { id: nodeId, userId },
      updateData,
      { new: true }
    );

    if (!updatedNode) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      node: {
        id: updatedNode.id,
        name: updatedNode.name,
        type: updatedNode.type,
        parentId: updatedNode.parentId,
        children: updatedNode.children || [],
        content: updatedNode.content,
        processMetadata: updatedNode.processMetadata,
        createdAt: updatedNode.createdAt,
        updatedAt: updatedNode.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error updating BPMN node:', error);
    return NextResponse.json({ error: 'Failed to update BPMN node' }, { status: 500 });
  }
}

// DELETE: Delete a node (recursively for folders)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const userId = searchParams.get('userId');
    
    if (!nodeId || !userId) {
      return NextResponse.json({ error: 'nodeId and userId are required' }, { status: 400 });
    }

    const node = await BpmnNode.findOne({ id: nodeId, userId });
    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Recursive delete function
    const deleteNodeRecursively = async (nodeIdToDelete: string) => {
      const nodeToDelete = await BpmnNode.findOne({ id: nodeIdToDelete, userId });
      if (!nodeToDelete) return;

      // If it's a folder, delete all children first
      if (nodeToDelete.type === 'folder' && nodeToDelete.children.length > 0) {
        for (const childId of nodeToDelete.children) {
          await deleteNodeRecursively(childId);
        }
      }

      // Remove from parent's children array
      if (nodeToDelete.parentId) {
        await BpmnNode.updateOne(
          { id: nodeToDelete.parentId },
          { $pull: { children: nodeIdToDelete } }
        );
      }

      // Delete the node itself
      await BpmnNode.deleteOne({ id: nodeIdToDelete });
    };

    await deleteNodeRecursively(nodeId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting BPMN node:', error);
    return NextResponse.json({ error: 'Failed to delete BPMN node' }, { status: 500 });
  }
} 