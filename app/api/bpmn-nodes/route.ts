import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BpmnNode from '@/models/BpmnNode';
import User from '@/models/User';
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
  advancedDetails?: {
    versionNo: string;
    processStatus: string;
    classification: string;
    dateOfCreation: Date;
    dateOfReview?: Date;
    effectiveDate?: Date;
    modificationDate: Date;
    modifiedBy: string;
    changeDescription: string;
    createdBy: string;
  };
  // Add the three table data structures
  signOffData?: {
    responsibility: string;
    date: string;
    name: string;
    designation: string;
    signature: string;
  };
  historyData?: {
    versionNo: string;
    date: string;
    statusRemarks: string;
    author: string;
  };
  triggerData?: {
    triggers: string;
    inputs: string;
    outputs: string;
  };
  selectedStandards?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// GET: Fetch the complete tree for a user or a specific node
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const nodeId = searchParams.get('nodeId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // If nodeId is provided, return the specific node
    if (nodeId) {
      const node = await BpmnNode.findOne({ id: nodeId, userId });
      if (!node) {
        return NextResponse.json({ error: 'Node not found' }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: true, 
        node: {
          id: node.id,
          name: node.name,
          type: node.type,
          parentId: node.parentId,
          children: node.children || [],
          content: node.content,
          processMetadata: node.processMetadata,
          advancedDetails: node.advancedDetails,
          signOffData: node.signOffData,
          historyData: node.historyData,
          triggerData: node.triggerData,
          selectedStandards: node.selectedStandards || [],
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        }
      });
    }

    // Otherwise, fetch all nodes for the user and build the tree
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
          advancedDetails: node.type === 'file' ? node.advancedDetails : undefined,
          signOffData: node.type === 'file' ? node.signOffData : undefined,
          historyData: node.type === 'file' ? node.historyData : undefined,
          triggerData: node.type === 'file' ? node.triggerData : undefined,
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
    const { userId, type, name, parentId, content, processMetadata, advancedDetails, signOffData, historyData, triggerData } = body;
    
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

          // Get user information for createdBy field and creation date
      let createdByValue = userId; // Default to userId
      let creationDate = ''; // Will be set only if provided
      
      if (type === 'file') {
        if (advancedDetails?.createdBy) {
          // Use the createdBy value from the request if provided
          createdByValue = advancedDetails.createdBy;
        } else {
          // Fetch user's name from database
          try {
            const user = await User.findById(userId);
            if (user) {
              createdByValue = user.name || user.email || userId;
            }
          } catch (error) {
            console.error('Error fetching user info:', error);
            // Fallback to userId if user fetch fails
          }
        }
        
        // Use the creation date from the request if provided
        if (advancedDetails?.dateOfCreation) {
          creationDate = advancedDetails.dateOfCreation;
        }
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
              advancedDetails: type === 'file' ? (advancedDetails || {
          versionNo: '1.0.0',
          processStatus: '',
          classification: '',
          dateOfCreation: creationDate || '',
          dateOfReview: '',
          effectiveDate: '',
          modificationDate: '',
          modifiedBy: '',
          changeDescription: '',
          createdBy: createdByValue || '',
        }) : undefined,
      signOffData: type === 'file' ? (signOffData || {
        responsibility: '',
        date: '',
        name: '',
        designation: '',
        signature: ''
      }) : undefined,
      historyData: type === 'file' ? (historyData || {
        versionNo: '',
        date: '',
        statusRemarks: '',
        author: ''
      }) : undefined,
      triggerData: type === 'file' ? (triggerData || {
        triggers: '',
        inputs: '',
        outputs: ''
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
        processMetadata: newNode.processMetadata,
        advancedDetails: newNode.advancedDetails,
        signOffData: newNode.signOffData,
        historyData: newNode.historyData,
        triggerData: newNode.triggerData,
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
    const { nodeId, userId, name, content, parentId, processMetadata, advancedDetails, signOffData, historyData, triggerData, selectedStandards } = body;
    
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
    if (signOffData !== undefined) updateData.signOffData = signOffData;
    if (historyData !== undefined) updateData.historyData = historyData;
    if (triggerData !== undefined) updateData.triggerData = triggerData;
    if (selectedStandards !== undefined) updateData.selectedStandards = selectedStandards;
    
    if (advancedDetails !== undefined) {
      // Increment version number when advanced details are updated
      const currentVersion = currentNode.advancedDetails?.versionNo || '1.0.0';
      const versionParts = currentVersion.split('.');
      const major = parseInt(versionParts[0]) || 1;
      const minor = parseInt(versionParts[1]) || 0;
      const patch = parseInt(versionParts[2]) || 0;
      
      updateData.advancedDetails = {
        ...advancedDetails,
        versionNo: `${major}.${minor}.${patch + 1}`,
        modificationDate: new Date(),
      };
    }

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
        advancedDetails: updatedNode.advancedDetails,
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