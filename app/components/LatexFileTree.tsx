'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  HiDotsVertical,
  HiChevronLeft
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { saveLatexProject, getLatexProjectById, deleteLatexProject, getSavedLatexProjects, LatexProject } from '../utils/latexProjectStorage';
import { saveLatexFileTree, getLatexFileTree, migrateProjectsToFileTree, FileTreeNode } from '../utils/fileTreeStorage';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface FileNode extends FileTreeNode {
  projectData?: LatexProject;
}

interface LatexFileTreeProps {
  user: User | null;
  onProjectSelect: (project: LatexProject) => void;
  onNewProject: () => void;
  onFileUpload: (file: File, fileType: 'tex' | 'latex') => void;
  currentProjectId?: string | null;
  onRefresh?: () => void;
  onDefaultFileCreated?: (project: LatexProject) => void;
}

const LatexFileTree: React.FC<LatexFileTreeProps> = ({
  user,
  onProjectSelect,
  onNewProject,
  onFileUpload,
  currentProjectId,
  onRefresh,
  onDefaultFileCreated
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
  const [collapsed, setCollapsed] = useState(false);

  // Add state to track expanded folders
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Load expanded state from localStorage
  const loadExpandedState = useCallback(() => {
    if (!user) return;
    try {
      const savedState = localStorage.getItem(`latex-expanded-${user.id}-${user.role}`);
      if (savedState) {
        const expandedArray = JSON.parse(savedState);
        setExpandedFolders(new Set(expandedArray));
      }
    } catch (error) {
      console.error('Error loading expanded state:', error);
    }
  }, [user]);

  // Save expanded state to localStorage
  const saveExpandedState = useCallback((expanded: Set<string>) => {
    if (!user) return;
    try {
      localStorage.setItem(`latex-expanded-${user.id}-${user.role}`, JSON.stringify(Array.from(expanded)));
    } catch (error) {
      console.error('Error saving expanded state:', error);
    }
  }, [user]);

  // Load projects and build file tree
  const loadFileTree = useCallback(() => {
    if (!user) return;
    
    console.log('Loading file tree for user:', { userId: user.id, userRole: user.role });
    
    // First try to get the saved file tree structure
    let savedTree = getLatexFileTree(user.id, user.role);
    console.log('Retrieved saved tree with', savedTree.length, 'nodes');
    
    // If no saved tree exists, migrate from existing projects
    if (savedTree.length === 0) {
      const projects = getSavedLatexProjects(user.id, user.role);
      console.log('No saved tree found, migrating', projects.length, 'projects');
      savedTree = migrateProjectsToFileTree(projects, user.id, user.role, 'latex');
      // Save the migrated tree
      if (savedTree.length > 0) {
        saveLatexFileTree(savedTree, user.id, user.role);
        console.log('Saved migrated tree with', savedTree.length, 'nodes');
      }
    }
    
    // If still no files exist, create a default main.tex file
    if (savedTree.length === 0) {
      console.log('No files found, creating default main.tex file');
      const defaultProject: LatexProject = {
        id: uuidv4(),
        name: 'main.tex',
        lastEdited: new Date().toISOString().split('T')[0],
        createdBy: user.id,
        role: user.role,
        content: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{LaTeX Document}
\\author{${user?.name || ''}}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a sample LaTeX document. You can edit it in the editor.

\\end{document}`
      };

      // Save the default project
      saveLatexProject(defaultProject, user.id, user.role);

      // Create a file node for the default project
      const defaultFileNode: FileNode = {
        id: defaultProject.id,
        name: defaultProject.name,
        type: 'file',
        projectData: defaultProject,
        path: defaultProject.name
      };

      // Add the default file to the tree
      savedTree = [defaultFileNode];
      saveLatexFileTree(savedTree, user.id, user.role);
      console.log('Created default main.tex file and saved to tree');
      
      // Notify parent component about the default file creation
      if (onDefaultFileCreated) {
        onDefaultFileCreated(defaultProject);
      }
    }
    
    // Update project data in the tree with latest data from storage
    const updateTreeWithLatestProjects = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.type === 'file' && node.projectData) {
          // Get the latest project data from storage
          const latestProject = getSavedLatexProjects(user.id, user.role).find(p => p.id === node.projectData?.id);
          if (latestProject) {
            console.log('Updating tree node with latest project data:', { 
              nodeId: node.id, 
              projectId: latestProject.id, 
              contentLength: latestProject.content?.length 
            });
            return { ...node, projectData: latestProject };
          }
        }
        if (node.children) {
          return { ...node, children: updateTreeWithLatestProjects(node.children) };
        }
        return node;
      });
    };
    
    const updatedTree = updateTreeWithLatestProjects(savedTree);
    console.log('Setting file tree with', updatedTree.length, 'nodes');
    setFileTree(updatedTree);
  }, [user]);

  useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  // Load expanded state when component mounts
  useEffect(() => {
    loadExpandedState();
  }, [loadExpandedState]);

  // Handle context menu

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
      onProjectSelect(node.projectData);
    }
  };

  // Create new project
  const createNewProject = () => {
    const projectName = prompt('Enter LaTeX document name:');
    if (!projectName?.trim()) return;

    // Ensure the file has .tex extension
    const projectNameWithExtension = projectName.endsWith('.tex') ? projectName : `${projectName}.tex`;

    const newProject: LatexProject = {
      id: uuidv4(),
      name: projectNameWithExtension,
      lastEdited: new Date().toISOString().split('T')[0],
      createdBy: user?.id,
      role: user?.role,
      content: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{${projectNameWithExtension.replace('.tex', '')}}
\\author{${user?.name || ''}}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a new LaTeX document. You can start editing it in the editor.

\\end{document}`
    };

    // Save the project first
    saveLatexProject(newProject, user?.id, user?.role);

    // Add the new project to the file tree
    const newFileNode: FileNode = {
      id: newProject.id,
      name: newProject.name,
      type: 'file',
      projectData: newProject,
      path: newProject.name
    };

    setFileTree(prev => {
      const updatedTree = [...prev, newFileNode];
      saveLatexFileTree(updatedTree, user?.id, user?.role);
      return updatedTree;
    });

    toast.success(`LaTeX document "${projectNameWithExtension}" created successfully!`);
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
              saveLatexProject(updatedProject, user?.id, user?.role);
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
      saveLatexFileTree(updatedTree, user?.id, user?.role);
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
      return nodes.filter(n => {
        if (n.id === id) {
          // Delete project data if it's a file
          if (n.type === 'file' && n.projectData) {
            deleteLatexProject(n.projectData.id, user?.id, user?.role);
          }
          return false;
        }
        if (n.children) {
          n.children = removeNodeById(n.children, id);
        }
        return true;
      });
    };

    if (node.type === 'folder') {
      const deleteFilesRecursively = (n: FileNode) => {
        if (n.type === 'file' && n.projectData) {
          deleteLatexProject(n.projectData.id, user?.id, user?.role);
        }
        if (n.children) {
          n.children.forEach(deleteFilesRecursively);
        }
      };
      deleteFilesRecursively(node);
    }

    setFileTree(prev => {
      const updatedTree = removeNodeById(prev, node.id);
      saveLatexFileTree(updatedTree, user?.id, user?.role);
      return updatedTree;
    });
    toast.success(`${node.type === 'folder' ? 'Folder' : 'Document'} deleted successfully!`);
    closeContextMenu();
  };

  // Duplicate project
  const duplicateProject = (node: FileNode) => {
    if (node.type === 'file' && node.projectData) {
      const duplicatedProject: LatexProject = {
        ...node.projectData,
        id: uuidv4(),
        name: `${node.projectData.name} (Copy)`,
        lastEdited: new Date().toISOString().split('T')[0]
      };

      // Save the duplicated project
      saveLatexProject(duplicatedProject, user?.id, user?.role);

      // Add the duplicated project to the file tree
      const duplicatedFileNode: FileNode = {
        id: duplicatedProject.id,
        name: duplicatedProject.name,
        type: 'file',
        projectData: duplicatedProject,
        path: duplicatedProject.name
      };

      setFileTree(prev => {
        const updatedTree = [...prev, duplicatedFileNode];
        saveLatexFileTree(updatedTree, user?.id, user?.role);
        return updatedTree;
      });

      toast.success(`Document "${node.projectData.name}" duplicated successfully!`);
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

  // Handle refresh
  const handleRefresh = () => {
    // Only refresh if explicitly requested, don't reload the entire tree
    if (onRefresh) {
      onRefresh();
    }
  };

  // Get unique folder name
  const getUniqueFolderName = (baseName = 'New-Folder') => {
    let counter = 1;
    let name = baseName;
    
    const checkName = (nodes: FileNode[]): boolean => {
      return nodes.some(node => {
        if (node.name === name) return true;
        if (node.children) return checkName(node.children);
        return false;
      });
    };

    while (checkName(fileTree)) {
      name = `${baseName}-${counter}`;
      counter++;
    }
    
    return name;
  };

  // Create new folder
  const createNewFolder = () => {
    const folderName = getUniqueFolderName('New-LaTeX-Folder');
    const newFolder: FileNode = {
      id: uuidv4(),
      name: folderName,
      type: 'folder',
      children: [] as FileNode[],
      path: folderName
    };

    setFileTree(prev => {
      const updatedTree = [...prev, newFolder];
      saveLatexFileTree(updatedTree, user?.id, user?.role);
      return updatedTree;
    });
    toast.success(`Folder "${folderName}" created successfully!`);
    closeContextMenu();
  };

  // Create new LaTeX file
  const createNewLatexFile = () => {
    const fileName = prompt('Enter LaTeX file name:');
    if (!fileName?.trim()) return;

    // Ensure the file has .tex extension
    const fileNameWithExtension = fileName.endsWith('.tex') ? fileName : `${fileName}.tex`;

    const newProject: LatexProject = {
      id: uuidv4(),
      name: fileNameWithExtension,
      lastEdited: new Date().toISOString().split('T')[0],
      createdBy: user?.id,
      role: user?.role,
      content: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{${fileNameWithExtension.replace('.tex', '')}}
\\author{${user?.name || ''}}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a new LaTeX document. You can start editing it in the editor.

\\end{document}`
    };

    const addFileToFolder = (nodes: FileNode[]): FileNode[] =>
      nodes.map(node => {
        if (node.id === contextMenu.node?.id && node.type === 'folder') {
          const fileNode: FileNode = {
            id: newProject.id,
            name: newProject.name,
            type: 'file',
            projectData: newProject,
            parentId: node.id,
            path: `${node.path}/${newProject.name}`
          };
          return {
            ...node,
            children: [...(node.children || []), fileNode]
          };
        }
        if (node.children) {
          return { ...node, children: addFileToFolder(node.children) };
        }
        return node;
      });

    setFileTree(prev => {
      const updatedTree = addFileToFolder(prev);
      saveLatexFileTree(updatedTree, user?.id, user?.role);
      return updatedTree;
    });
    saveLatexProject(newProject, user?.id, user?.role);
    toast.success(`LaTeX file "${fileNameWithExtension}" created successfully!`);
    closeContextMenu();
  };

  // Handle drag and drop
  const handleMove = ({ dragIds, parentId, index }: { dragIds: string[]; parentId: string | null; index: number }) => {
    setFileTree(prev => {
      const findAndRemove = (nodes: FileNode[], ids: string[]): [FileNode[], FileNode[]] => {
        const remaining: FileNode[] = [];
        const removed: FileNode[] = [];

        nodes.forEach(node => {
          if (ids.includes(node.id)) {
            removed.push(node);
          } else {
            if (node.children) {
              const [newChildren, removedFromChildren] = findAndRemove(node.children, ids);
              node.children = newChildren;
              removed.push(...removedFromChildren);
            }
            remaining.push(node);
          }
        });

        return [remaining, removed];
      };

      const insertAt = (nodes: FileNode[], parentId: string | null, toInsert: FileNode[], index: number): FileNode[] => {
        if (parentId === null) {
          // Insert at root level
          const result = [...nodes];
          result.splice(index, 0, ...toInsert);
          return result;
        }

        return nodes.map(node => {
          if (node.id === parentId) {
            const children = node.children || [];
            const newChildren = [...children];
            newChildren.splice(index, 0, ...toInsert);
            return { ...node, children: newChildren };
          }
          if (node.children) {
            return { ...node, children: insertAt(node.children, parentId, toInsert, index) };
          }
          return node;
        });
      };

      const [remaining, removed] = findAndRemove(prev, dragIds);
      const updatedTree = insertAt(remaining, parentId, removed, index);
      saveLatexFileTree(updatedTree, user?.id, user?.role);
      return updatedTree;
    });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.show]);

  return (
    <div className={`relative h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col`}>
      {/* Collapse/Expand Arrow Button */}
      {!collapsed && (
        <button
          className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-50 bg-white border border-gray-200 rounded-full shadow p-1 flex items-center justify-center hover:bg-gray-50 focus:outline-none"
          style={{ width: 32, height: 32 }}
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <HiChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
      )}
      {/* Collapsed State */}
      {collapsed ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 shadow-md px-3 py-4" style={{ minWidth: 48 }}>
            <button
              className="flex items-center justify-center w-8 h-8 rounded focus:outline-none hover:bg-gray-100 mb-2"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <HiFolder className="w-7 h-7 text-gray-500" />
            </button>
            <button
              className="flex items-center justify-center w-6 h-6 rounded focus:outline-none hover:bg-gray-100"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <HiChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">LaTeX Documents</h3>
              <div className="flex items-center space-x-1">
                {/* Hidden file input for file upload */}
                <input
                  type="file"
                  id="latex-upload-input"
                  ref={uploadInputRef}
                  className="hidden"
                  accept=".tex,.latex"
                  multiple
                  onClick={e => { (e.target as HTMLInputElement).value = ''; }}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    Array.from(files).forEach(file => {
                      const ext = file.name.split('.').pop()?.toLowerCase();
                      if (ext === 'tex' || ext === 'latex') {
                        onFileUpload(file, ext as 'tex' | 'latex');
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
                  title="Import LaTeX Document"
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
                <p className="text-sm">No LaTeX documents found</p>
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
                      {...({ webkitdirectory: "true", directory: "true" } as any)}
                      multiple
                      className="hidden"
                      accept=".tex,.latex"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        // Simulate import: create a folder with the name of the first file's directory
                        const firstFile = files[0];
                        const folderPath = (firstFile as any).webkitRelativePath.split('/')[0];
                        const newFolder: FileNode = {
                          id: uuidv4(),
                          name: folderPath,
                          type: 'folder',
                          children: [] as FileNode[],
                          path: folderPath
                        };
                        // Add only LaTeX files as children
                        Array.from(files).forEach((file) => {
                          const fileName = file.name;
                          const ext = fileName.split('.').pop()?.toLowerCase();
                          if (ext === 'tex' || ext === 'latex') {
                            // Create a proper LaTeX project for this file
                            const newProject: LatexProject = {
                              id: uuidv4(),
                              name: fileName,
                              lastEdited: new Date().toISOString().split('T')[0],
                              createdBy: user?.id,
                              role: user?.role,
                              content: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{${fileName.replace('.tex', '').replace('.latex', '')}}
\\author{${user?.name || ''}}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is an imported LaTeX document. You can edit it in the editor.

\\end{document}`
                            };

                            // Save the project to storage
                            saveLatexProject(newProject, user?.id, user?.role);

                            if (newFolder.children) {
                              newFolder.children.push({
                                id: newProject.id,
                                name: fileName,
                                type: 'file',
                                parentId: newFolder.id,
                                path: `${folderPath}/${fileName}`,
                                projectData: newProject
                              });
                            }
                          }
                        });
                        setFileTree(prev => {
                          const updatedTree = [...prev, newFolder];
                          saveLatexFileTree(updatedTree, user?.id, user?.role);
                          return updatedTree;
                        });
                        toast.success(`LaTeX folder '${folderPath}' imported!`);
                      }}
                    />
                    Import LaTeX Folder
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
                openByDefault={false}
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
                        // Track expanded/collapsed state
                        const newExpanded = new Set(expandedFolders);
                        if (node.isOpen) {
                          newExpanded.delete(node.data.id);
                        } else {
                          newExpanded.add(node.data.id);
                        }
                        setExpandedFolders(newExpanded);
                        saveExpandedState(newExpanded);
                        
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
                              const fileName = prompt('Enter LaTeX file name:');
                              if (!fileName?.trim()) return;
                              // Ensure the file has .tex extension
                              const fileNameWithExtension = fileName.endsWith('.tex') ? fileName : `${fileName}.tex`;
                              const newProject: LatexProject = {
                                id: uuidv4(),
                                name: fileNameWithExtension,
                                lastEdited: new Date().toISOString().split('T')[0],
                                createdBy: user?.id,
                                role: user?.role,
                                content: `\\documentclass{article}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\usepackage{graphicx}\n\\usepackage{hyperref}\n\n\\title{${fileNameWithExtension.replace('.tex', '')}}\n\\author{${user?.name || ''}}\n\\date{\\today}\n\n\\begin{document}\n\n\\maketitle\n\n\\section{Introduction}\nThis is a new LaTeX document. You can start editing it in the editor.\n\n\\end{document}`
                              };
                              const addFileToFolder = (nodes: FileNode[]): FileNode[] =>
                                nodes.map(nodeItem => {
                                  if (nodeItem.id === node.data.id && nodeItem.type === 'folder') {
                                    const fileNode: FileNode = {
                                      id: newProject.id,
                                      name: newProject.name,
                                      type: 'file',
                                      parentId: nodeItem.id,
                                      path: `${nodeItem.path}/${newProject.name}`,
                                      projectData: newProject
                                    };
                                    return {
                                      ...nodeItem,
                                      children: [...(nodeItem.children || []), fileNode]
                                    };
                                  }
                                  if (nodeItem.children) {
                                    return { ...nodeItem, children: addFileToFolder(nodeItem.children) };
                                  }
                                  return nodeItem;
                                });
                              setFileTree(prev => {
                                const updatedTree = addFileToFolder(prev);
                                saveLatexFileTree(updatedTree, user?.id, user?.role);
                                return updatedTree;
                              });
                              saveLatexProject(newProject, user?.id, user?.role);
                              toast.success(`LaTeX file "${fileNameWithExtension}" created successfully!`);
                            }}
                            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Add LaTeX File"
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
        </>
      )}
      {/* Context Menu */}
      {!collapsed && contextMenu.show && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.node?.type === 'folder' && (
            <>
              <button
                onClick={createNewLatexFile}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
              >
                <HiPlus className="w-4 h-4 mr-2" />
                New LaTeX File
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
      {!collapsed && contextMenu.show && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />
      )}
    </div>
  );
};

export default LatexFileTree; 