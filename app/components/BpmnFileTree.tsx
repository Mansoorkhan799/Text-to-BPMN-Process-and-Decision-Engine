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
  HiEye,
  HiUpload,
  HiDotsVertical
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { saveProject, getProjectById, deleteProject, getSavedProjects, BpmnProject } from '../utils/projectStorage';
import { saveBpmnFileTree, getBpmnFileTree, migrateProjectsToFileTree, FileTreeNode } from '../utils/fileTreeStorage';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface FileNode extends FileTreeNode {
  projectData?: BpmnProject;
}

interface BpmnFileTreeProps {
  user: User | null;
  onProjectSelect: (project: BpmnProject) => void;
  onNewProject: () => void;
  onFileUpload: (file: File, fileType: 'bpmn' | 'json' | 'excel') => void;
  currentProjectId?: string | null;
  onRefresh?: () => void;
}

const BpmnFileTree: React.FC<BpmnFileTreeProps> = ({
  user,
  onProjectSelect,
  onNewProject,
  onFileUpload,
  currentProjectId,
  onRefresh
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
  const loadFileTree = useCallback(() => {
    if (!user) return;
    
    // First try to get the saved file tree structure
    let savedTree = getBpmnFileTree(user.id, user.role);
    
    // If no saved tree exists, migrate from existing projects
    if (savedTree.length === 0) {
      const projects = getSavedProjects(user.id, user.role);
      savedTree = migrateProjectsToFileTree(projects, user.id, user.role, 'bpmn');
      // Save the migrated tree
      if (savedTree.length > 0) {
        saveBpmnFileTree(savedTree, user.id, user.role);
      }
    }
    
    // Update projectData in the tree with the latest data from storage
    const updateProjectData = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.type === 'file' && node.projectData) {
          // Fetch the complete project data from storage
          const completeProject = getProjectById(node.projectData.id, user.id, user.role);
          if (completeProject) {
            return { ...node, projectData: completeProject };
          }
        }
        if (node.children) {
          return { ...node, children: updateProjectData(node.children) };
        }
        return node;
      });
    };
    
    const updatedTree = updateProjectData(savedTree);
    setFileTree(updatedTree);
  }, [user]);

  useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      node
    });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, node: null });
  };

  // Handle node click
  const handleNodeClick = (node: FileNode) => {
    if (node.type === 'file' && node.projectData) {
      // Fetch the complete project data from storage to ensure we have the latest XML content
      const completeProject = getProjectById(node.projectData.id, user?.id, user?.role);
      if (completeProject) {
        onProjectSelect(completeProject);
      } else {
        // Fallback to the project data in the node if storage fetch fails
        onProjectSelect(node.projectData);
      }
    }
  };

  // Create new project
  const createNewProject = () => {
    const projectName = prompt('Enter project name:');
    if (!projectName?.trim()) return;

    const newProject: BpmnProject = {
      id: uuidv4(),
      name: projectName,
      lastEdited: new Date().toISOString().split('T')[0],
      createdBy: user?.id,
      role: user?.role
    };

    saveProject(newProject, user?.id, user?.role);
    loadFileTree();
    toast.success(`Project "${projectName}" created successfully!`);
    closeContextMenu();
  };

  // Start editing node name
  const startEditing = (node: FileNode) => {
    setEditingNode(node.id);
    setEditingName(node.name);
    closeContextMenu();
  };

  // Save edited name
  const saveEdit = () => {
    if (!editingNode || !editingName.trim()) return;

    setFileTree(prev => {
      const updateNode = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === editingNode) {
            if (node.type === 'file' && node.projectData) {
              const updatedProject = { ...node.projectData, name: editingName };
              saveProject(updatedProject, user?.id, user?.role);
              return { ...node, name: editingName, projectData: updatedProject };
            }
            return { ...node, name: editingName };
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      const updatedTree = updateNode(prev);
      saveBpmnFileTree(updatedTree, user?.id, user?.role);
      return updatedTree;
    });

    setEditingNode(null);
    setEditingName('');
    toast.success('Name updated successfully!');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingNode(null);
    setEditingName('');
  };

  // Delete node
  const deleteNode = (node: FileNode) => {
    const removeNodeById = (nodes: FileNode[], id: string): FileNode[] => {
      return nodes
        .filter(n => n.id !== id)
        .map(n =>
          n.children ? { ...n, children: removeNodeById(n.children, id) } : n
        );
    };

    if (node.type === 'file' && node.projectData) {
      if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
        deleteProject(node.projectData.id, user?.id, user?.role);
        setFileTree(prev => {
          const updatedTree = removeNodeById(prev, node.id);
          saveBpmnFileTree(updatedTree, user?.id, user?.role);
          return updatedTree;
        });
        toast.success('Project deleted successfully!');
      }
    } else if (node.type === 'folder') {
      if (confirm(`Are you sure you want to delete folder "${node.name}" and all its contents?`)) {
        // Delete all child files from storage
        const deleteFilesRecursively = (n: FileNode) => {
          if (n.type === 'file' && n.projectData) {
            deleteProject(n.projectData.id, user?.id, user?.role);
          } else if (n.children) {
            n.children.forEach(deleteFilesRecursively);
          }
        };
        deleteFilesRecursively(node);
        setFileTree(prev => {
          const updatedTree = removeNodeById(prev, node.id);
          saveBpmnFileTree(updatedTree, user?.id, user?.role);
          return updatedTree;
        });
        toast.success('Folder deleted successfully!');
      }
    }
    closeContextMenu();
  };

  // Duplicate project
  const duplicateProject = (node: FileNode) => {
    if (node.type === 'file' && node.projectData) {
      const duplicatedProject: BpmnProject = {
        ...node.projectData,
        id: uuidv4(),
        name: `${node.projectData.name} (Copy)`,
        lastEdited: new Date().toISOString().split('T')[0]
      };

      saveProject(duplicatedProject, user?.id, user?.role);
      loadFileTree();
      toast.success('Project duplicated successfully!');
    }
    closeContextMenu();
  };

  // Handle keyboard events for editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Refresh file tree
  const handleRefresh = () => {
    loadFileTree();
    if (onRefresh) {
      onRefresh();
    }
  };

  // Add after useState declarations
  const getUniqueFolderName = (baseName = 'New-Folder') => {
    let name = baseName;
    let counter = 1;
    const existingNames = fileTree.filter(node => node.type === 'folder').map(node => node.name);
    while (existingNames.includes(name)) {
      name = `${baseName} (${counter})`;
      counter++;
    }
    return name;
  };

  const createNewFolder = () => {
    const name = getUniqueFolderName();
    const newFolder: FileNode = {
      id: uuidv4(),
      name,
      type: 'folder',
      children: [] as FileNode[],
      path: name
    };
    setFileTree(prev => {
      const updatedTree = [...prev, newFolder];
      saveBpmnFileTree(updatedTree, user?.id, user?.role);
      return updatedTree;
    });
    toast.success(`Folder '${name}' created!`);
  };

  const createNewBpmnFile = (folderNode?: FileNode) => {
    const targetNode = folderNode || contextMenu.node;
    if (!targetNode) return;
    const fileName = prompt('Enter BPMN file name:');
    if (!fileName?.trim()) return;

    setFileTree(prev => {
      const addFileToFolder = (nodes: FileNode[]): FileNode[] =>
        nodes.map(node => {
          if (node.id === targetNode.id && node.type === 'folder') {
            const newFile: FileNode = {
              id: uuidv4(),
              name: fileName,
              type: 'file',
              children: [] as FileNode[],
              parentId: node.id,
              path: `${node.path}/${fileName}`,
              projectData: {
                id: uuidv4(),
                name: fileName,
                lastEdited: new Date().toISOString().split('T')[0],
                createdBy: user?.id,
                role: user?.role
              }
            };
            return {
              ...node,
              children: node.children ? [...node.children, newFile] : [newFile]
            };
          } else if (node.children && Array.isArray(node.children)) {
            return { ...node, children: addFileToFolder(node.children) };
          } else {
            return { ...node, children: [] };
          }
        });
      const updatedTree = addFileToFolder(prev);
      saveBpmnFileTree(updatedTree, user?.id, user?.role);
      return updatedTree;
    });
    toast.success(`BPMN file "${fileName}" created successfully!`);
    closeContextMenu();
  };

  // Move node handler for drag-and-drop (react-arborist expects an object with dragIds, parentId, index)
  const handleMove = ({ dragIds, parentId, index }: { dragIds: string[]; parentId: string | null; index: number }) => {
    setFileTree(prev => {
      // Helper to find and remove nodes by id
      const findAndRemove = (nodes: FileNode[], ids: string[]): [FileNode[], FileNode[]] => {
        let removed: FileNode[] = [];
        const filtered = nodes.filter(n => {
          if (ids.includes(n.id)) {
            removed.push(n);
            return false;
          }
          return true;
        }).map(n => {
          if (n.children) {
            const [newChildren, removedChildren] = findAndRemove(n.children, ids);
            removed = removed.concat(removedChildren);
            return { ...n, children: newChildren };
          }
          return n;
        });
        return [filtered, removed];
      };

      // Remove dragged nodes from their old location
      const [treeWithoutDragged, draggedNodes] = findAndRemove(prev, dragIds);
      if (draggedNodes.length === 0) return prev;

      // Helper to insert nodes at a specific index in a folder
      const insertAt = (nodes: FileNode[], parentId: string | null, toInsert: FileNode[], index: number): FileNode[] => {
        if (parentId === null) {
          // Insert at root
          const before = nodes.slice(0, index);
          const after = nodes.slice(index);
          return [...before, ...toInsert, ...after];
        }
        return nodes.map(n => {
          if (n.id === parentId) {
            const before = n.children ? n.children.slice(0, index) : [];
            const after = n.children ? n.children.slice(index) : [];
            return {
              ...n,
              children: [...before, ...toInsert.map(node => ({ ...node, parentId: n.id, path: `${n.path}/${node.name}` })), ...after]
            };
          } else if (n.children) {
            return { ...n, children: insertAt(n.children, parentId, toInsert, index) };
          }
          return n;
        });
      };

      const updatedTree = insertAt(treeWithoutDragged, parentId, draggedNodes, index);
      saveBpmnFileTree(updatedTree, user?.id, user?.role);
      return updatedTree;
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">BPMN Projects</h3>
          <div className="flex items-center space-x-1">
            {/* Hidden file input for file upload */}
            <input
              type="file"
              id="bpmn-upload-input"
              ref={uploadInputRef}
              className="hidden"
              accept=".bpmn,.xml,.json,.xlsx"
              multiple
              onClick={e => { (e.target as HTMLInputElement).value = ''; }}
              onChange={(e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                Array.from(files).forEach(file => {
                  const ext = file.name.split('.').pop()?.toLowerCase();
                  if (ext === 'bpmn' || ext === 'xml') {
                    onFileUpload(file, 'bpmn');
                  } else if (ext === 'json') {
                    onFileUpload(file, 'json');
                  } else if (ext === 'xlsx') {
                    onFileUpload(file, 'excel');
                  }
                });
              }}
            />
            <button
              onClick={() => {
                if (uploadInputRef.current) {
                  uploadInputRef.current.click();
                }
              }}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Import Project"
            >
              <HiUpload className="w-4 h-4" />
            </button>
            <button
              onClick={createNewFolder}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="New Folder"
            >
              <HiPlus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-auto">
        {fileTree.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <HiFolder className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No projects found</p>
            <div className="mt-2 flex flex-col items-center space-y-2">
              <button
                onClick={createNewFolder}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Create New Folder
              </button>
              <label className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    // Simulate import: create a folder with the name of the first file's directory
                    const firstFile = files[0];
                    const folderPath = firstFile.webkitRelativePath.split('/')[0];
                                            const newFolder: FileNode = {
                          id: uuidv4(),
                          name: folderPath,
                          type: 'folder',
                          children: [] as FileNode[],
                          path: folderPath
                        };
                        // Add files as children
                        Array.from(files).forEach(file => {
                          const fileName = file.name;
                          const fileNode: FileNode = {
                            id: uuidv4(),
                            name: fileName,
                            type: 'file',
                            children: [] as FileNode[],
                            parentId: newFolder.id,
                            path: `${folderPath}/${fileName}`,
                            projectData: {
                              id: uuidv4(),
                              name: fileName,
                              lastEdited: new Date().toISOString().split('T')[0],
                              createdBy: user?.id,
                              role: user?.role
                            }
                          };
                          newFolder.children!.push(fileNode);
                                                });
                        setFileTree(prev => {
                          const updatedTree = [...prev, newFolder];
                          saveBpmnFileTree(updatedTree, user?.id, user?.role);
                          return updatedTree;
                        });
                        toast.success(`Folder '${folderPath}' imported!`);
                  }}
                />
                Import Folder
              </label>
            </div>
          </div>
        ) : (
          <Tree
            data={fileTree}
            indent={20}
            rowHeight={32}
            overscanCount={1}
            paddingTop={8}
            paddingBottom={8}
            className="file-tree"
            onMove={handleMove}
          >
            {({ node, style, dragHandle }) => (
              <div
                ref={dragHandle}
                style={style}
                className={`flex items-center px-3 py-1 hover:bg-gray-100 cursor-pointer group ${
                  node.data.type === 'file' && node.data.projectData?.id === currentProjectId
                    ? 'bg-blue-50 border-r-2 border-blue-500'
                    : ''
                }`}
                onClick={() => {
                  if (node.data.type === 'folder') {
                    node.toggle();
                  } else if (node.data.type === 'file') {
                    handleNodeClick(node.data);
                  }
                }}
                onContextMenu={node.data.type === 'file' ? (e) => handleContextMenu(e, node.data) : undefined}
              >
                {/* Expand/Collapse Icon */}
                {node.data.type === 'folder' && (
                  <div className="mr-1 text-gray-400">
                    {node.isOpen ? (
                      <HiChevronDown className="w-4 h-4" />
                    ) : (
                      <HiChevronRight className="w-4 h-4" />
                    )}
                  </div>
                )}

                {/* File/Folder Icon */}
                <div className="mr-2 text-gray-500">
                  {node.data.type === 'folder' ? (
                    <HiFolder className="w-4 h-4" />
                  ) : (
                    <HiDocument className="w-4 h-4" />
                  )}
                </div>

                {/* Name (editable if editing) */}
                {editingNode === node.data.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={saveEdit}
                    className="flex-1 text-sm bg-white border border-blue-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm text-gray-700 truncate">
                    {node.data.name}
                  </span>
                )}

                {/* Action buttons (visible on hover) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                  {node.data.type === 'file' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(node.data);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                        title="Rename"
                      >
                        <HiPencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateProject(node.data);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                        title="Duplicate"
                      >
                        <HiDuplicate className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  {node.data.type === 'folder' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(node.data);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                        title="Rename"
                      >
                        <HiPencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (node.data && node.data.type === 'folder') {
                            setContextMenu({
                              show: false,
                              x: 0,
                              y: 0,
                              node: node.data
                            });
                            createNewBpmnFile(node.data);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                        title="Add BPMN File"
                      >
                        <HiPlus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(node.data);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <HiTrash className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  {node.data.type === 'folder' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Show context menu at the button position
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setContextMenu({
                          show: true,
                          x: rect.right,
                          y: rect.bottom,
                          node: node.data
                        });
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                      title="Options"
                    >
                      <HiDotsVertical className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </Tree>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.node?.type === 'folder' && (
            <>
              <button
                onClick={() => {
                  if (contextMenu.node && contextMenu.node.type === 'folder') {
                    setContextMenu({
                      show: false,
                      x: 0,
                      y: 0,
                      node: contextMenu.node
                    });
                    createNewBpmnFile(contextMenu.node);
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
              >
                <HiPlus className="w-4 h-4 mr-2" />
                New BPMN File
              </button>
              <button
                onClick={() => startEditing(contextMenu.node!)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
              >
                <HiPencil className="w-4 h-4 mr-2" />
                Rename
              </button>
            </>
          )}
          {contextMenu.node?.type === 'file' && (
            <>
              <button
                onClick={() => handleNodeClick(contextMenu.node!)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
              >
                <HiEye className="w-4 h-4 mr-2" />
                Open
              </button>
              <button
                onClick={() => startEditing(contextMenu.node!)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
              >
                <HiPencil className="w-4 h-4 mr-2" />
                Rename
              </button>
              <button
                onClick={() => duplicateProject(contextMenu.node!)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
              >
                <HiDuplicate className="w-4 h-4 mr-2" />
                Duplicate
              </button>
            </>
          )}
          <button
            onClick={() => deleteNode(contextMenu.node!)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center"
          >
            <HiTrash className="w-4 h-4 mr-2" />
            Delete
          </button>
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