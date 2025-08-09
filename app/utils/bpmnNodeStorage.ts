import { BpmnProject } from './projectStorage';

export interface BpmnNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parentId: string | null;
  children: BpmnNode[];
  content?: string;
  processMetadata?: {
    processName: string;
    description: string;
    processOwner: string;
    processManager: string;
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
  advancedDetails?: {
    versionNo: string;
    processStatus: string;
    classification: string;
    dateOfCreation: string;
    dateOfReview: string;
    effectiveDate: string;
    modificationDate: string;
    modifiedBy: string;
    changeDescription: string;
    createdBy: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNodeRequest {
  userId: string;
  type: 'folder' | 'file';
  name: string;
  parentId?: string;
  content?: string;
  processMetadata?: {
    processName: string;
    description: string;
    processOwner: string;
    processManager: string;
  };
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
  advancedDetails?: {
    versionNo: string;
    processStatus: string;
    classification: string;
    dateOfCreation: string;
    dateOfReview: string;
    effectiveDate: string;
    modificationDate: string;
    modifiedBy: string;
    changeDescription: string;
    createdBy: string;
  };
}

export interface UpdateNodeRequest {
  nodeId: string;
  userId: string;
  name?: string;
  content?: string;
  parentId?: string | null;
  processMetadata?: {
    processName: string;
    description: string;
    processOwner: string;
    processManager: string;
  };
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
  advancedDetails?: {
    versionNo: string;
    processStatus: string;
    classification: string;
    dateOfCreation: string;
    dateOfReview: string;
    effectiveDate: string;
    modificationDate: string;
    modifiedBy: string;
    changeDescription: string;
    createdBy: string;
  };
}

// Fetch the complete tree for a user
export async function getBpmnTreeFromAPI(userId: string): Promise<BpmnNode[]> {
  try {
    const response = await fetch(`/api/bpmn-nodes?userId=${encodeURIComponent(userId)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch BPMN tree');
    }
    
    return data.tree || [];
  } catch (error) {
    console.error('Error fetching BPMN tree:', error);
    throw error;
  }
}

// Create a new node (folder or file)
export async function createBpmnNode(request: CreateNodeRequest): Promise<BpmnNode> {
  try {
    const response = await fetch('/api/bpmn-nodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create BPMN node');
    }
    
    return data.node;
  } catch (error) {
    console.error('Error creating BPMN node:', error);
    throw error;
  }
}

// Update a node
export async function updateBpmnNode(request: UpdateNodeRequest): Promise<BpmnNode> {
  try {
    const response = await fetch('/api/bpmn-nodes', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to update BPMN node');
    }
    
    return data.node;
  } catch (error) {
    console.error('Error updating BPMN node:', error);
    throw error;
  }
}

// Delete a node (recursively for folders)
export async function deleteBpmnNode(nodeId: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/bpmn-nodes?nodeId=${encodeURIComponent(nodeId)}&userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete BPMN node');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting BPMN node:', error);
    throw error;
  }
}

// Get a specific node by ID
export async function getBpmnNodeById(nodeId: string, userId: string): Promise<BpmnNode | null> {
  try {
    const tree = await getBpmnTreeFromAPI(userId);
    
    // Recursive function to find node by ID
    const findNodeById = (nodes: BpmnNode[], targetId: string): BpmnNode | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return node;
        }
        if (node.children.length > 0) {
          const found = findNodeById(node.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findNodeById(tree, nodeId);
  } catch (error) {
    console.error('Error getting BPMN node by ID:', error);
    throw error;
  }
}

// Convert BpmnNode to BpmnProject format (for compatibility)
export function convertNodeToProject(node: BpmnNode): BpmnProject {
  return {
    id: node.id,
    name: node.name,
    lastEdited: node.updatedAt ? new Date(node.updatedAt).toISOString() : new Date().toISOString(),
    content: node.content || '',
    createdBy: node.advancedDetails?.createdBy || '',
    processMetadata: node.processMetadata || {
      processName: '',
      description: '',
      processOwner: '',
      processManager: '',
    },
    signOffData: node.signOffData || {
      responsibility: '',
      date: '',
      name: '',
      designation: '',
      signature: ''
    },
    historyData: node.historyData || {
      versionNo: '',
      date: '',
      statusRemarks: '',
      author: ''
    },
    triggerData: node.triggerData || {
      triggers: '',
      inputs: '',
      outputs: ''
    },
    advancedDetails: (node as any).advancedDetails || {
      versionNo: '1.0.0',
      processStatus: '',
      classification: '',
      dateOfCreation: (node as any).advancedDetails?.dateOfCreation || '',
      dateOfReview: '',
      effectiveDate: '',
      modificationDate: (node as any).advancedDetails?.modificationDate || '',
      modifiedBy: (node as any).advancedDetails?.modifiedBy || '',
      changeDescription: '',
      createdBy: (node as any).advancedDetails?.createdBy || '',
    }
  };
}

// Convert BpmnProject to BpmnNode format
export function convertProjectToNode(project: BpmnProject, parentId?: string): Partial<BpmnNode> {
  return {
    id: project.id,
    name: project.name,
    type: 'file' as const,
    parentId: parentId || null,
    children: [],
    content: project.content,
    processMetadata: project.processMetadata,
    signOffData: project.signOffData,
    historyData: project.historyData,
    triggerData: project.triggerData,
    advancedDetails: project.advancedDetails,
  };
} 