'use client';

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Tree } from 'react-arborist';
import { 
  HiFolder, 
  HiDocument, 
  HiPlus, 
  HiTrash, 
  HiPencil, 
  HiDuplicate,
  HiChevronRight,
  HiChevronDown,
  HiRefresh,
  HiUpload,
  HiDotsVertical,
  HiEye,
  HiFolderAdd,
  HiDocumentAdd,
  HiFolderOpen,
  HiDocumentText,
  HiCloudUpload,
  HiCheck,
  HiX
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { BpmnProject } from '../utils/projectStorage';
import { 
  getBpmnTreeFromAPI, 
  createBpmnNode, 
  updateBpmnNode, 
  deleteBpmnNode, 
  getBpmnNodeById,
  convertNodeToProject,
  BpmnNode,
  CreateNodeRequest
} from '../utils/bpmnNodeStorage';
import { getCurrentDateTimeString, getUserDisplayName } from '../utils/versionUtils';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface FileNode extends BpmnNode {
  projectData?: BpmnProject;
}

interface BpmnFileTreeProps {
  user: User | null;
  onProjectSelect: (project: BpmnProject) => void;
  onNewProject: () => void;
  onFileUpload: (file: File, fileType: 'bpmn' | 'json' | 'excel') => void;
  currentProjectId?: string | null;
  onRefresh?: () => void;
  onCreateFileFromEditor?: (project: BpmnProject) => void;
}

const INITIAL_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="Process Name" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="Lane_1" name="Actor">
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Activity_1</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_1</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_1" name="Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Activity_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Activity_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="120" y="60" width="600" height="180" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_1_di" bpmnElement="Lane_1" isHorizontal="true">
        <dc:Bounds x="150" y="60" width="570" height="180" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="200" y="120" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="200" y="160" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Activity_1">
        <dc:Bounds x="300" y="100" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="450" y="120" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="450" y="160" width="27" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="236" y="138" />
        <di:waypoint x="300" y="138" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="400" y="138" />
        <di:waypoint x="450" y="138" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

const BpmnFileTree: React.FC<BpmnFileTreeProps> = ({
  user,
  onProjectSelect,
  onNewProject,
  onFileUpload,
  currentProjectId,
  onRefresh,
  onCreateFileFromEditor
}) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    node: FileNode | null;
  }>({ show: false, x: 0, y: 0, node: null });
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [treeKey, setTreeKey] = useState(0);

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      const folderInputs = document.querySelectorAll('input[type="file"][webkitdirectory]');
      folderInputs.forEach(input => {
        (input as any).webkitdirectory = true;
        (input as any).directory = true;
      });
    }
  }, []);

  // Load projects and build file tree
  const loadFileTree = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get the hierarchical tree from the new API
      const savedTree = await getBpmnTreeFromAPI(user.id);
      setFileTree(savedTree as FileNode[]);
    } catch (error) {
      console.error('Error loading file tree:', error);
      toast.error('Failed to load file tree');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, node: null });
  };

  // Handle node click
  const handleNodeClick = async (node: FileNode) => {
    if (node.type === 'folder') {
      // Toggle folder expansion
      setExpandedFolders(prev => ({
        ...prev,
        [node.id]: !prev[node.id]
      }));
      return;
    }
    
    try {
      // Get the complete project data from the BPMN nodes API to ensure we have all table data
      const response = await fetch(`/api/bpmn-nodes?nodeId=${node.id}&userId=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.node) {
          // Transform the API response to match our BpmnProject interface
          const completeProject: BpmnProject = {
            id: data.node.id,
            name: data.node.name,
            lastEdited: data.node.updatedAt || new Date().toISOString(),
            content: data.node.content,
            preview: data.node.preview,
            createdBy: data.node.advancedDetails?.createdBy || data.node.userId,
            role: user?.role,
            processMetadata: data.node.processMetadata || {
              processName: '',
              description: '',
              processOwner: '',
              processManager: '',
            },
            signOffData: data.node.signOffData || {
              responsibility: '',
              date: '',
              name: '',
              designation: '',
              signature: ''
            },
            historyData: data.node.historyData || {
              versionNo: '',
              date: '',
              statusRemarks: '',
              author: ''
            },
                        triggerData: data.node.triggerData || {
                triggers: '',
                inputs: '',
                outputs: ''
            },
            advancedDetails: data.node.advancedDetails || {
                versionNo: '1.0.0',
                processStatus: '',
                classification: '',
                dateOfCreation: '',
                dateOfReview: '',
                effectiveDate: '',
                modificationDate: '',
                modifiedBy: '',
                changeDescription: '',
                createdBy: '',
            },
            selectedStandards: data.node.selectedStandards || []
          };
          
          console.log('Loading complete project data from BPMN nodes API:', completeProject);
          onProjectSelect(completeProject);
        } else {
          // Fallback to node data if API fails
          console.warn('Failed to get complete project data, using node data');
          const completeProject = convertNodeToProject(node);
          onProjectSelect(completeProject);
        }
      } else {
        // Fallback to node data if API fails
        console.warn('Failed to get complete project data, using node data');
        const completeProject = convertNodeToProject(node);
        onProjectSelect(completeProject);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      // Fallback to node data if API fails
      const completeProject = convertNodeToProject(node);
      onProjectSelect(completeProject);
    }
  };

  // Create new folder
  const createNewFolder = async (parentId?: string) => {
    if (!user) return;

    const folderName = prompt('Enter folder name:');
    if (!folderName?.trim()) return;

    try {
      const request: CreateNodeRequest = {
        userId: user.id,
        type: 'folder',
        name: folderName,
        parentId: parentId || undefined,
      };

      await createBpmnNode(request);
      await loadFileTree();
      toast.success('Folder created successfully');
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  // Create new BPMN file
  const createNewBpmnFile = async (parentId?: string) => {
    if (!user) return;

    const fileName = prompt('Enter file name:');
    if (!fileName?.trim()) return;

    try {
      const request: CreateNodeRequest = {
        userId: user.id,
        type: 'file',
        name: fileName,
        parentId: parentId || undefined,
        content: INITIAL_DIAGRAM,
        processMetadata: {
          processName: '',
          description: '',
          processOwner: '',
          processManager: '',
        },
        advancedDetails: {
          versionNo: '1.0.0',
          processStatus: '',
          classification: '',
          dateOfCreation: getCurrentDateTimeString(), // Actual creation time
          dateOfReview: '',
          effectiveDate: '',
          modificationDate: getCurrentDateTimeString(), // Initial modification time
          modifiedBy: getUserDisplayName(user), // Initial modifier
          changeDescription: 'Initial file creation',
          createdBy: getUserDisplayName(user), // Actual creator
        },
      };

      const newNode = await createBpmnNode(request);
      await loadFileTree();
      toast.success('File created successfully');
      
      // Select the new file
      const completeProject = convertNodeToProject(newNode);
      onProjectSelect(completeProject);
    } catch (error) {
      console.error('Error creating file:', error);
      toast.error('Failed to create file');
    }
  };

  // Start editing node name
  const startEditing = (node: FileNode) => {
    setEditingNode(node.id);
    setEditingName(node.name);
    closeContextMenu();
  };

  // Save edit
  const saveEdit = async () => {
    if (!user || !editingNode || !editingName.trim()) return;

    try {
      await updateBpmnNode({
        nodeId: editingNode,
        userId: user.id,
        name: editingName.trim(),
      });
      
      await loadFileTree();
    setEditingNode(null);
    setEditingName('');
      toast.success('Name updated successfully');
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    }
  };

  const cancelEdit = () => {
    setEditingNode(null);
    setEditingName('');
  };

  // Delete node
  const deleteNode = async (node: FileNode) => {
    if (!user) return;

    const confirmMessage = node.type === 'folder' 
      ? `Are you sure you want to delete the folder "${node.name}" and all its contents?`
      : `Are you sure you want to delete the file "${node.name}"?`;

    if (!confirm(confirmMessage)) return;

    try {
      await deleteBpmnNode(node.id, user.id);
      await loadFileTree();
      toast.success(`${node.type === 'folder' ? 'Folder' : 'File'} deleted successfully`);
    } catch (error) {
      console.error('Error deleting node:', error);
      toast.error('Failed to delete');
    }
  };

  // Duplicate project
  const duplicateProject = async (node: FileNode) => {
    if (!user || node.type !== 'file') return;

    try {
      const request: CreateNodeRequest = {
        userId: user.id,
        type: 'file',
        name: `${node.name} (Copy)`,
        parentId: node.parentId || undefined,
        content: node.content || INITIAL_DIAGRAM,
        processMetadata: node.processMetadata || {
          processName: '',
          description: '',
          processOwner: '',
          processManager: '',
        },
      };

      await createBpmnNode(request);
      await loadFileTree();
      toast.success('File duplicated successfully');
    } catch (error) {
      console.error('Error duplicating file:', error);
      toast.error('Failed to duplicate file');
    }
  };

  // Handle move (drag and drop)
  const handleMove = async ({ dragIds, parentId, index }: { dragIds: string[]; parentId: string | null; index: number }) => {
    if (!user || dragIds.length === 0) return;

    try {
      // For each dragged item, update its parent
      for (const dragId of dragIds) {
        await updateBpmnNode({
          nodeId: dragId,
          userId: user.id,
          parentId: parentId || null,
        });
      }

      // Refresh the tree to show the new structure
      await loadFileTree();
      toast.success('Items moved successfully');
    } catch (error) {
      console.error('Error moving items:', error);
      toast.error('Failed to move items');
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    loadFileTree();
    if (onRefresh) {
      onRefresh();
    }
  };

  // Create file from editor
  const createFileFromEditor = async (project: BpmnProject) => {
    if (!user) return;

    try {
      const request: CreateNodeRequest = {
        userId: user.id,
        type: 'file',
        name: project.name || 'Untitled',
        content: project.content || INITIAL_DIAGRAM,
        processMetadata: project.processMetadata || {
          processName: '',
          description: '',
          processOwner: '',
          processManager: '',
        },
        advancedDetails: {
          versionNo: '1.0.0',
          processStatus: '',
          classification: '',
          dateOfCreation: getCurrentDateTimeString(), // Actual creation time
          dateOfReview: '',
          effectiveDate: '',
          modificationDate: getCurrentDateTimeString(), // Initial modification time
          modifiedBy: getUserDisplayName(user), // Initial modifier
          changeDescription: 'Initial file creation',
          createdBy: getUserDisplayName(user), // Actual creator
        },
      };

      await createBpmnNode(request);
      await loadFileTree();
      toast.success('File saved successfully');
    } catch (error) {
      console.error('Error creating file from editor:', error);
      toast.error('Failed to save file');
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const fileType = file.name.endsWith('.bpmn') || file.name.endsWith('.xml') ? 'bpmn' : 
                      file.name.endsWith('.json') ? 'json' : 
                      file.name.endsWith('.xlsx') ? 'excel' : null;
      
      if (fileType) {
        onFileUpload(file, fileType);
      } else {
        toast.error(`Unsupported file type: ${file.name}. Please upload .bpmn, .xml, .json, or .xlsx files.`);
      }
    });

    // Reset input
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  };

  // Handle folder upload
  const handleFolderUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
                if (!files || files.length === 0) return;

                Array.from(files).forEach(file => {
      const fileType = file.name.endsWith('.bpmn') ? 'bpmn' : 
                      file.name.endsWith('.json') ? 'json' : 
                      file.name.endsWith('.xlsx') ? 'excel' : null;
      
      if (fileType) {
        onFileUpload(file, fileType);
      }
    });

    // Reset input
                if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  };

  // Render node content
  const renderNode = ({ node, style, dragHandle }: any) => {
    const isEditing = editingNode === node.data.id;
    const isSelected = currentProjectId === node.data.id;

    return (
      <div
        style={style}
                ref={dragHandle}
        className={`group flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer ${
          isSelected ? 'bg-blue-100' : ''
        }`}
        onClick={() => handleNodeClick(node.data)}
        onContextMenu={(e) => handleContextMenu(e, node.data)}
      >
        <div className="flex items-center flex-1 min-w-0">
          {node.data.type === 'folder' ? (
            <HiFolder className="text-yellow-500 mr-2 flex-shrink-0" />
          ) : (
            <HiDocument className="text-blue-500 mr-2 flex-shrink-0" />
          )}
          
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => { e.stopPropagation(); handleKeyDown(e); }}
                onKeyPress={(e) => { e.stopPropagation(); }}
                onKeyUp={(e) => { e.stopPropagation(); }}
                className="flex-1 px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                className="p-1 rounded hover:bg-green-100"
                title="Save"
              >
                <HiCheck className="w-4 h-4 text-green-600" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                className="p-1 rounded hover:bg-red-100"
                title="Cancel"
              >
                <HiX className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ) : (
            <span className="truncate text-sm">{node.data.name}</span>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded px-2 py-1 shadow-sm">
            {/* View/Open button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                handleNodeClick(node.data);
                        }}
              className="p-1 hover:bg-blue-100 rounded transition-colors"
              title={node.data.type === 'file' ? 'Open File' : 'Open Folder'}
                      >
              <HiEye className="w-4 h-4 text-blue-700" />
                      </button>

            {/* Create new item buttons (for folders) */}
            {node.data.type === 'folder' && (
              <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                    createNewFolder(node.data.id);
                        }}
                  className="p-1 hover:bg-yellow-100 rounded transition-colors"
                  title="Create Subfolder"
                      >
                  <HiFolderAdd className="w-4 h-4 text-yellow-700" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                    createNewBpmnFile(node.data.id);
                        }}
                  className="p-1 hover:bg-green-100 rounded transition-colors"
                  title="Create File in Folder"
                      >
                  <HiDocumentAdd className="w-4 h-4 text-green-700" />
                      </button>
                    </>
                  )}

            {/* Edit/Rename button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(node.data);
                        }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Rename"
                      >
              <HiPencil className="w-4 h-4 text-gray-700" />
                      </button>
            
            {/* Duplicate button (for files) */}
            {node.data.type === 'file' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                  duplicateProject(node.data);
                }}
                className="p-1 hover:bg-purple-100 rounded transition-colors"
                title="Duplicate"
              >
                <HiDuplicate className="w-4 h-4 text-purple-700" />
                      </button>
            )}
            
            {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(node.data);
                        }}
              className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="Delete"
                      >
              <HiTrash className="w-4 h-4 text-red-700" />
                      </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">BPMN Files</h2>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-100 rounded"
            title="Refresh"
          >
            <HiRefresh className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => createNewFolder()}
            className="flex-1 flex items-center justify-center p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
            title="New Folder"
          >
            <div className="relative">
              <HiFolderOpen className="w-6 h-6" />
              <HiPlus className="w-3 h-3 absolute -top-1 -right-1 bg-blue-500 rounded-full" />
            </div>
          </button>
          
          <button
            onClick={() => createNewBpmnFile()}
            className="flex-1 flex items-center justify-center p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 shadow-sm hover:shadow-md"
            title="New BPMN File"
          >
            <div className="relative">
              <HiDocumentText className="w-6 h-6" />
              <HiPlus className="w-3 h-3 absolute -top-1 -right-1 bg-green-500 rounded-full" />
            </div>
          </button>

          {/* Upload button */}
          <div className="flex-1">
            <input
              ref={uploadInputRef}
              type="file"
              accept=".bpmn,.xml,.json,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="w-full flex items-center justify-center p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Upload File"
            >
              <HiCloudUpload className="w-6 h-6" />
            </button>
          </div>
        </div>
              </div>

      {/* File tree */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : fileTree.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <HiFolder className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No files or folders</p>
            <p className="text-sm">Create a new folder or file to get started</p>
          </div>
        ) : (
          <Tree
            key={treeKey}
            data={fileTree}
            onMove={handleMove}
            indent={24}
            rowHeight={40}
            overscanCount={10}
            paddingTop={10}
            paddingBottom={10}
          >
            {renderNode}
          </Tree>
        )}
      </div>

      {/* Context menu */}
      {contextMenu.show && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-48"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.node && (
            <>
              {/* Open/View option */}
              <button
                onClick={() => {
                  handleNodeClick(contextMenu.node!);
                  closeContextMenu();
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm flex items-center"
              >
                <HiEye className="w-4 h-4 mr-2 text-blue-600" />
                {contextMenu.node.type === 'file' ? 'Open File' : 'Open Folder'}
              </button>

              {/* Create options for folders */}
              {contextMenu.node.type === 'folder' && (
                <>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => {
                      createNewFolder(contextMenu.node!.id);
                      closeContextMenu();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm flex items-center"
                  >
                    <HiFolderAdd className="w-4 h-4 mr-2 text-yellow-600" />
                    Create Subfolder
              </button>
              <button
                    onClick={() => {
                      createNewBpmnFile(contextMenu.node!.id);
                      closeContextMenu();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm flex items-center"
                  >
                    <HiDocumentAdd className="w-4 h-4 mr-2 text-green-600" />
                    Create File
              </button>
            </>
          )}

              <div className="border-t border-gray-200 my-1"></div>

              {/* Edit/Rename option */}
              <button
                onClick={() => {
                  startEditing(contextMenu.node!);
                  closeContextMenu();
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm flex items-center"
              >
                <HiPencil className="w-4 h-4 mr-2 text-gray-600" />
                Rename
              </button>
              
              {/* Duplicate option for files */}
              {contextMenu.node.type === 'file' && (
                <button
                  onClick={() => {
                    duplicateProject(contextMenu.node!);
                    closeContextMenu();
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm flex items-center"
                >
                  <HiDuplicate className="w-4 h-4 mr-2 text-purple-600" />
                  Duplicate
                </button>
              )}
              
              <div className="border-t border-gray-200 my-1"></div>

              {/* Delete option */}
              <button
                onClick={() => {
                  deleteNode(contextMenu.node!);
                  closeContextMenu();
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm text-red-600 flex items-center"
              >
                <HiTrash className="w-4 h-4 mr-2 text-red-600" />
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Overlay to close context menu */}
      {contextMenu.show && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />
      )}
    </div>
  );
};

export default BpmnFileTree; 