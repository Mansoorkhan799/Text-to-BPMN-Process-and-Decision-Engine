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
  HiChevronLeft,
  HiEye,
  HiUpload,
  HiDotsVertical,
  HiRefresh,
  HiFolderAdd,
  HiDocumentAdd,
  HiFolderOpen,
  HiDocumentText,
  HiCloudUpload
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import { 
  saveLatexProject, 
  getLatexProjectById, 
  deleteLatexProject, 
  getSavedLatexProjects, 
  saveLatexProjectToAPI,
  updateLatexProjectInAPI,
  deleteLatexProjectFromAPI,
  getLatexProjectByIdFromAPI,
  LatexProject 
} from '../utils/latexProjectStorage';
import { 
  saveLatexFileTree, 
  getLatexFileTree, 
  migrateProjectsToFileTree, 
  getLatexTreeFromAPI,
  saveLatexFileTreeToAPI,
  FileTreeNode 
} from '../utils/fileTreeStorage';
import { v4 as uuidv4 } from 'uuid';
import mammoth from 'mammoth';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface FileNode extends FileTreeNode {
  projectData?: LatexProject;
}

interface LatexTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  isDefault: boolean;
}

interface LatexFileTreeProps {
  user: User | null;
  onProjectSelect: (project: LatexProject) => void;
  onNewProject: () => void;
  onFileUpload: (file: File, fileType: 'tex' | 'latex') => void;
  currentProjectId?: string | null;
  onRefresh?: () => void;
}

const LatexFileTree: React.FC<LatexFileTreeProps> = ({
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
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const [templates, setTemplates] = useState<LatexTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<LatexTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [pendingFileName, setPendingFileName] = useState('');
  const [pendingParentFolderId, setPendingParentFolderId] = useState<string | undefined>(undefined);

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
  const loadFileTree = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    console.log('Loading file tree for user:', { userId: user.id, userRole: user.role });
    
    try {
      // Get the hierarchical tree from the database API
      const savedTree = await getLatexTreeFromAPI(user.id);
      console.log('Retrieved tree from database with', savedTree.length, 'nodes');
      
    if (savedTree.length === 0) {
        // No files exist, set empty tree
        console.log('No files found, setting empty tree');
        setFileTree([]);
      } else {
        // Convert database nodes to FileNode format
        const convertToFileNodes = (nodes: any[]): FileNode[] => {
          return nodes.map(node => ({
            id: node.id,
            name: node.name,
            type: node.type,
            parentId: node.parentId,
            path: node.path || node.name,
            children: node.children ? convertToFileNodes(node.children) : undefined,
            projectData: node.type === 'file' ? {
              id: node.id, // Use the same ID as the node for consistency
              name: node.name,
              lastEdited: node.updatedAt || new Date().toISOString(),
              content: node.content,
        createdBy: user.id,
        role: user.role,
            } : undefined
          }));
        };
        
        const convertedTree = convertToFileNodes(savedTree);
        console.log('Setting file tree with', convertedTree.length, 'nodes');
        setFileTree(convertedTree);
      }
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

  // Load expanded state when component mounts
  useEffect(() => {
    loadExpandedState();
  }, [loadExpandedState]);

  // Fetch templates from database
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/latex-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        // Set default template
        const defaultTemplate = data.templates?.find((t: LatexTemplate) => t.isDefault);
        setSelectedTemplate(defaultTemplate || null);
      } else {
        console.error('Failed to fetch templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  // Load templates when component mounts
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

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
      toast.success(`Opened "${node.name}" successfully!`);
    }
  };

  // Create new project
  const createNewProject = async () => {
    const projectName = prompt('Enter LaTeX document name:');
    if (!projectName?.trim()) return;

    // Store the file name and show template selection modal
    setPendingFileName(projectName);
    setPendingParentFolderId(undefined);
    setShowTemplateModal(true);
  };

  // Create new project with selected template
  const createNewProjectWithTemplate = async (template: LatexTemplate) => {
    if (!pendingFileName?.trim()) return;

    // Ensure the file has .tex extension
    const projectNameWithExtension = pendingFileName.endsWith('.tex') ? pendingFileName : `${pendingFileName}.tex`;

    const newProject: LatexProject = {
      id: uuidv4(),
      name: projectNameWithExtension,
      lastEdited: new Date().toISOString().split('T')[0],
      createdBy: user?.id,
      role: user?.role,
      content: template.content
    };

    try {
      // Save the project to database first
      const success = await saveLatexProjectToAPI(newProject, user?.id, user?.role);
      if (!success) {
        toast.error('Failed to create LaTeX file');
        return;
      }

      // Also save to the tree structure in database
      const treeRes = await fetch('/api/latex-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          type: 'file',
          name: newProject.name,
          parentId: pendingParentFolderId,
          content: newProject.content
        })
      });

      if (!treeRes.ok) {
        console.error('Failed to add file to tree structure');
      }

      // Create the file node
      const fileNode: FileNode = {
      id: newProject.id,
      name: newProject.name,
      type: 'file',
      projectData: newProject,
        parentId: pendingParentFolderId,
        path: pendingParentFolderId ? `${pendingParentFolderId}/${newProject.name}` : newProject.name
      };

      if (pendingParentFolderId) {
        // Add to specific folder
        const addFileToFolder = (nodes: FileNode[]): FileNode[] =>
          nodes.map(node => {
            if (node.id === pendingParentFolderId && node.type === 'folder') {
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
      return updatedTree;
    });
      } else {
        // Add to root level
        setFileTree(prev => [...prev, fileNode]);
      }

      toast.success(`LaTeX file "${projectNameWithExtension}" created successfully!`);
      setShowTemplateModal(false);
      setPendingFileName('');
      setPendingParentFolderId(undefined);
    } catch (error) {
      console.error('Error creating new LaTeX file:', error);
      toast.error('Failed to create LaTeX file');
    }
  };

  // Start editing node name
  const startEditing = (node: FileNode) => {
    console.log('startEditing called:', { nodeId: node.id, nodeName: node.name });
    setEditingNode(node.id);
    setEditingName(node.name);
    closeContextMenu();
  };

  // Save edited name
  const saveEdit = async () => {
    if (!editingNode || !editingName.trim()) return;

    console.log('saveEdit called:', { editingNode, editingName });

    try {
      // Find the node being edited
      const findNode = (nodes: FileNode[]): FileNode | null => {
        for (const node of nodes) {
          if (node.id === editingNode) {
            return node;
          }
          if (node.children) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      const nodeToEdit = findNode(fileTree);
      if (!nodeToEdit) {
        console.error('Node not found for editing:', editingNode);
        toast.error('Node not found');
        return;
      }

      console.log('Node to edit found:', nodeToEdit);

      // Update tree structure in database first
      const treeUpdateRes = await fetch('/api/latex-nodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: editingNode,
          name: editingName
        })
      });

      console.log('Tree update response:', treeUpdateRes.status, treeUpdateRes.statusText);

      if (!treeUpdateRes.ok) {
        const errorText = await treeUpdateRes.text();
        console.error('Failed to update name in tree structure:', errorText);
        toast.error('Failed to update name in database');
        return;
      }

      // Update individual file storage if it's a file
      if (nodeToEdit.type === 'file') {
        console.log('Updating file in storage. Node ID:', nodeToEdit.id);
        
        if (nodeToEdit.projectData) {
          console.log('File project data:', nodeToEdit.projectData);
          const updatedProject = { ...nodeToEdit.projectData, name: editingName };
          const success = await updateLatexProjectInAPI(updatedProject);
          if (!success) {
            console.error('Failed to update file name in storage using project data');
            // Try using node ID directly
            const projectData = await getLatexProjectByIdFromAPI(nodeToEdit.id);
            if (projectData) {
              console.log('Found project data by node ID:', projectData);
              const updatedProject2 = { ...projectData, name: editingName };
              const success2 = await updateLatexProjectInAPI(updatedProject2);
              if (!success2) {
                console.error('Failed to update file name in storage using node ID');
              } else {
                console.log('File storage updated successfully using node ID');
              }
            }
          } else {
            console.log('File storage updated successfully using project data');
          }
        } else {
          console.error('File node missing projectData:', nodeToEdit);
          // Try to find the project data by node ID
          const projectData = await getLatexProjectByIdFromAPI(nodeToEdit.id);
          if (projectData) {
            console.log('Found project data by ID:', projectData);
            const updatedProject = { ...projectData, name: editingName };
            const success = await updateLatexProjectInAPI(updatedProject);
            if (!success) {
              console.error('Failed to update file name in storage after finding project data');
            } else {
              console.log('File storage updated successfully after finding project data');
            }
          } else {
            console.error('Could not find project data for file:', nodeToEdit.id);
          }
        }
      }

      // Update local state
    setFileTree(prev => {
      const updateNode = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === editingNode) {
            if (node.type === 'file' && node.projectData) {
              const updatedProject = { ...node.projectData, name: editingName };
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
      return updatedTree;
    });

    setEditingNode(null);
    setEditingName('');
    toast.success('Name updated successfully!');
      console.log('Rename completed successfully');
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingNode(null);
    setEditingName('');
  };

  // Delete node
  const deleteNode = async (node: FileNode) => {
    try {
      // Delete from tree structure first
      const treeDeleteRes = await fetch(`/api/latex-nodes?nodeId=${node.id}`, {
        method: 'DELETE'
      });

      if (!treeDeleteRes.ok) {
        console.error('Failed to delete from tree structure');
        toast.error('Failed to delete from database');
        return;
      }

      // Delete from file storage if it's a file
      if (node.type === 'file' && node.projectData) {
        const success = await deleteLatexProjectFromAPI(node.projectData.id);
        if (!success) {
          console.error('Failed to delete file from storage');
          // Continue anyway since tree structure is already deleted
        }
      } else if (node.type === 'folder') {
        // Delete folder and all its contents from file storage
        const deleteFilesRecursively = async (n: FileNode) => {
          if (n.type === 'file' && n.projectData) {
            await deleteLatexProjectFromAPI(n.projectData.id);
          }
          if (n.children) {
            for (const child of n.children) {
              await deleteFilesRecursively(child);
            }
          }
        };
        await deleteFilesRecursively(node);
      }

      // Update local state
    const removeNodeById = (nodes: FileNode[], id: string): FileNode[] => {
      return nodes.filter(n => {
        if (n.id === id) {
          return false;
        }
        if (n.children) {
          n.children = removeNodeById(n.children, id);
        }
        return true;
      });
    };

    setFileTree(prev => {
      const updatedTree = removeNodeById(prev, node.id);
      return updatedTree;
    });
    toast.success(`${node.type === 'folder' ? 'Folder' : 'Document'} deleted successfully!`);
    closeContextMenu();
    } catch (error) {
      console.error('Error deleting node:', error);
      toast.error('Failed to delete item');
    }
  };

  // Duplicate project
  const duplicateProject = async (node: FileNode) => {
    if (node.type === 'file' && node.projectData) {
      try {
      const duplicatedProject: LatexProject = {
        ...node.projectData,
        id: uuidv4(),
        name: `${node.projectData.name} (Copy)`,
        lastEdited: new Date().toISOString().split('T')[0]
      };

        // Save the duplicated project to database
        const success = await saveLatexProjectToAPI(duplicatedProject, user?.id, user?.role);
        if (!success) {
          toast.error('Failed to duplicate document');
          return;
        }

        // Also save to the tree structure in database
        const treeRes = await fetch('/api/latex-nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            type: 'file',
            name: duplicatedProject.name,
            parentId: null,
            content: duplicatedProject.content
          })
        });

        if (!treeRes.ok) {
          console.error('Failed to add duplicated file to tree structure');
        }

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
        return updatedTree;
      });

      toast.success(`Document "${node.projectData.name}" duplicated successfully!`);
      } catch (error) {
        console.error('Error duplicating project:', error);
        toast.error('Failed to duplicate document');
      }
    }
    closeContextMenu();
  };

  // Handle keyboard events for editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
    // For all other keys (including space), let the default behavior happen
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Reload the file tree from database
      await loadFileTree();
      toast.success('File tree refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing file tree:', error);
      toast.error('Failed to refresh file tree');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert HTML to LaTeX (simplified version for Word file conversion)
  const convertHtmlToLatex = (html: string): string => {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Function to escape special LaTeX characters
    const escapeLatexSpecialChars = (text: string): string => {
      return text
        .replace(/\\/g, '\\textbackslash ')
        .replace(/\$/g, '\\$')
        .replace(/%/g, '\\%')
        .replace(/&/g, '\\&')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/~/g, '\\textasciitilde ')
        .replace(/\^/g, '\\textasciicircum ')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}');
    };

    // Process child nodes of an element
    const processChildNodes = (element: HTMLElement): string => {
      let result = '';
      for (const child of Array.from(element.childNodes)) {
        result += processNode(child);
      }
      return result;
    };

    // Convert HTML table to LaTeX tabular environment
    const convertTableToLatex = (tableElement: HTMLElement): string => {
      let result = '\\begin{table}[h!]\n  \\centering\n';

      const rows = tableElement.querySelectorAll('tr');
      if (rows.length === 0) return '';

      const firstRow = rows[0];
      const columns = firstRow.querySelectorAll('td, th').length;
      if (columns === 0) return '';

      let colSpec = '|';
      for (let i = 0; i < columns; i++) {
        colSpec += 'c|';
      }

      result += `  \\begin{tabular}{${colSpec}}\n    \\hline\n`;

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length > 0) {
          let rowContent = '    ';
          cells.forEach((cell, cellIndex) => {
            const cellContent = cell.textContent?.trim() || '';
            rowContent += escapeLatexSpecialChars(cellContent);
            if (cellIndex < cells.length - 1) {
              rowContent += ' & ';
            }
          });
          rowContent += ' \\\\\n    \\hline\n';
          result += rowContent;
        }
      });

      result += '  \\end{tabular}\n';
      result += '  \\caption{Imported Table}\n';
      result += '\\end{table}\n\n';

      return result;
    };

    // Process individual nodes
    const processNode = (node: Node): string => {
      let result = '';

      switch (node.nodeType) {
        case Node.TEXT_NODE:
          if (node.textContent && node.textContent.trim()) {
            result += escapeLatexSpecialChars(node.textContent.trim());
          }
          break;

        case Node.ELEMENT_NODE:
          const element = node as HTMLElement;
          const tagName = element.tagName.toLowerCase();

          switch (tagName) {
            case 'h1':
              result += `\\section{${processChildNodes(element)}}\n\n`;
              break;

            case 'h2':
              result += `\\subsection{${processChildNodes(element)}}\n\n`;
              break;

            case 'h3':
              result += `\\subsubsection{${processChildNodes(element)}}\n\n`;
              break;

            case 'p':
              const paragraphContent = processChildNodes(element);
              if (paragraphContent.trim()) {
                result += `${paragraphContent}\n\n`;
              }
              break;

            case 'strong':
            case 'b':
              result += `\\textbf{${processChildNodes(element)}}`;
              break;

            case 'em':
            case 'i':
              result += `\\textit{${processChildNodes(element)}}`;
              break;

            case 'u':
              result += `\\underline{${processChildNodes(element)}}`;
              break;

            case 'ul':
              result += `\\begin{itemize}\n${processChildNodes(element)}\\end{itemize}\n\n`;
              break;

            case 'ol':
              result += `\\begin{enumerate}\n${processChildNodes(element)}\\end{enumerate}\n\n`;
              break;

            case 'li':
              result += `  \\item ${processChildNodes(element)}\n`;
              break;

            case 'table':
              result += convertTableToLatex(element);
              break;

            case 'br':
              result += ' \\\\ ';
              break;

            case 'hr':
              result += `\\par\\noindent\\rule{\\textwidth}{0.4pt}\n\n`;
              break;

            default:
              result += processChildNodes(element);
          }
          break;
      }

      return result;
    };

    // Process the HTML and return LaTeX
    let latex = '';
    for (const child of Array.from(tempDiv.childNodes)) {
      latex += processNode(child);
    }

    // Clean up the LaTeX
    latex = latex
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\\textbackslash{}/g, '\\textbackslash ')
      .replace(/\\textasciitilde{}/g, '\\textasciitilde ')
      .replace(/\\textasciicircum{}/g, '\\textasciicircum ');

    return latex;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        
        if (ext === 'tex' || ext === 'latex') {
          // Handle LaTeX files
          const content = await file.text();

    const newProject: LatexProject = {
      id: uuidv4(),
            name: file.name,
      lastEdited: new Date().toISOString().split('T')[0],
      createdBy: user?.id,
      role: user?.role,
            content: content
          };

          // Save the project to database
          const success = await saveLatexProjectToAPI(newProject, user?.id, user?.role);
          if (!success) {
            toast.error(`Failed to upload ${file.name}`);
            continue;
          }

          // Also save to the tree structure in database
          const treeRes = await fetch('/api/latex-nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user?.id,
              type: 'file',
              name: newProject.name,
              parentId: null,
              content: newProject.content
            })
          });

          if (!treeRes.ok) {
            console.error('Failed to add uploaded file to tree structure');
          }

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
            return updatedTree;
          });

          toast.success(`LaTeX file "${file.name}" uploaded successfully!`);
        } else if (ext === 'doc' || ext === 'docx') {
          // Handle Word files - convert to LaTeX
          try {
            const arrayBuffer = await file.arrayBuffer();
            
            // Use mammoth to convert docx to HTML
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const html = result.value;

            // Extract title from filename
            const fileName = file.name.replace(/\.(doc|docx)$/i, '');
            const documentTitle = fileName || 'Imported Document';

            // Convert HTML to LaTeX
            const latex = convertHtmlToLatex(html);

            // Create a complete LaTeX document
            const fullLatex = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\title{${documentTitle}}
\\author{${user?.name || ''}}
\\date{\\today}

\\begin{document}

\\maketitle

${latex}

\\end{document}`;

            // Create new project with converted content
            const newProject: LatexProject = {
              id: uuidv4(),
              name: `${fileName}.tex`,
              lastEdited: new Date().toISOString().split('T')[0],
              createdBy: user?.id,
              role: user?.role,
              content: fullLatex
            };

            // Save the project to database
            const success = await saveLatexProjectToAPI(newProject, user?.id, user?.role);
            if (!success) {
              toast.error(`Failed to convert and upload ${file.name}`);
              continue;
            }

            // Also save to the tree structure in database
            const treeRes = await fetch('/api/latex-nodes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user?.id,
                type: 'file',
                name: newProject.name,
                parentId: null,
                content: newProject.content
              })
            });

            if (!treeRes.ok) {
              console.error('Failed to add converted file to tree structure');
            }

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
              return updatedTree;
            });

            toast.success(`Word file "${file.name}" converted to LaTeX and uploaded successfully!`);
          } catch (error) {
            console.error('Error converting Word file:', error);
            toast.error(`Failed to convert Word file "${file.name}"`);
          }
        } else {
          toast.error(`File "${file.name}" is not a valid LaTeX or Word file (.tex, .latex, .doc, .docx)`);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    }

    // Reset the input
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
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
  const createNewFolder = async (parentFolderId?: string) => {
    const folderName = prompt('Enter folder name:');
    if (!folderName?.trim()) return;

    // Check if folder name already exists
    const checkName = (nodes: FileNode[]): boolean => {
      for (const node of nodes) {
        if (node.name === folderName) {
          return true; // Name exists
        }
        if (node.children) {
          if (checkName(node.children)) {
            return true; // Name exists in children
          }
        }
      }
      return false; // Name doesn't exist
    };

    if (checkName(fileTree)) {
      toast.error(`A folder with the name "${folderName}" already exists`);
      return;
    }

    const folderId = uuidv4();
    
    try {
      // Save folder to database using the nodes API
      const res = await fetch('/api/latex-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          type: 'folder',
          name: folderName,
          parentId: parentFolderId || null
        })
      });

      if (!res.ok) {
        toast.error('Failed to create folder');
        return;
      }

    const newFolder: FileNode = {
        id: folderId,
      name: folderName,
      type: 'folder',
        parentId: parentFolderId || undefined,
      children: [] as FileNode[],
        path: parentFolderId ? `${parentFolderId}/${folderName}` : folderName
    };

    setFileTree(prev => {
        if (parentFolderId) {
          // Add to specific folder
          const addFolderToParent = (nodes: FileNode[]): FileNode[] =>
            nodes.map(node => {
              if (node.id === parentFolderId && node.type === 'folder') {
          return {
            ...node,
                  children: [...(node.children || []), newFolder]
          };
        }
        if (node.children) {
                return { ...node, children: addFolderToParent(node.children) };
        }
        return node;
      });

          const updatedTree = addFolderToParent(prev);
      return updatedTree;
        } else {
          // Add to root level
      const updatedTree = [...prev, newFolder];
      return updatedTree;
        }
    });
      
    toast.success(`Folder "${folderName}" created successfully!`);
    closeContextMenu();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  // Create new LaTeX file
  const createNewLatexFile = async (parentFolderId?: string) => {
    const fileName = prompt('Enter LaTeX file name:');
    if (!fileName?.trim()) return;

    // Store the file name and show template selection modal
    setPendingFileName(fileName);
    setPendingParentFolderId(parentFolderId);
    setShowTemplateModal(true);
  };

  // Handle drag and drop
  const handleMove = async ({ dragIds, parentId, index }: { dragIds: string[]; parentId: string | null; index: number }) => {
    try {
      // Update database first
      for (const dragId of dragIds) {
        const res = await fetch('/api/latex-nodes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: dragId,
            parentId: parentId
          })
        });
        
        if (!res.ok) {
          console.error('Failed to update node position in database');
        }
      }

      // Update local state
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
        
        // Show success message for move operation
        if (removed.length > 0) {
          const itemType = removed[0].type === 'folder' ? 'folder' : 'document';
          const itemName = removed[0].name;
          const destination = parentId ? 'folder' : 'root level';
          toast.success(`${itemType} "${itemName}" moved to ${destination} successfully!`);
        }
        
      return updatedTree;
    });
    } catch (error) {
      console.error('Error moving node:', error);
      toast.error('Failed to move item');
    }
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

  // Reload file tree when component becomes visible or when window gains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Reload the file tree when the page becomes visible
        loadFileTree();
      }
    };

    const handleFocus = () => {
      if (user) {
        // Reload the file tree when the window gains focus
        loadFileTree();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, loadFileTree]);

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
          <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">LaTeX Documents</h2>
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
          
          {/* New LaTeX File Button */}
                  <button
            onClick={() => createNewProject()}
            className="flex-1 flex items-center justify-center p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 shadow-sm hover:shadow-md"
            title="New LaTeX File"
                  >
            <div className="relative">
              <HiDocumentText className="w-6 h-6" />
              <HiPlus className="w-3 h-3 absolute -top-1 -right-1 bg-green-500 rounded-full" />
            </div>
                  </button>

          {/* Upload LaTeX button */}
          <div className="flex-1">
                    <input
              ref={uploadInputRef}
                      type="file"
                      accept=".tex,.latex,.docx,.doc"
              onChange={handleFileUpload}
                      className="hidden"
            />
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="w-full flex items-center justify-center p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Upload LaTeX or Word File"
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
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          handleKeyDown(e);
                        }}
                        onKeyPress={(e) => {
                          e.stopPropagation();
                        }}
                        onKeyUp={(e) => {
                          e.stopPropagation();
                        }}
                        className="flex-1 text-sm bg-white border border-blue-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span className="flex-1 text-sm text-gray-700 truncate">
                        {node.data.name}
                      </span>
                    )}
                    {/* Action buttons (visible on hover) */}
                {!editingNode && (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded px-2 py-1 shadow-sm">
                    {/* View/Open button for files */}
                      {node.data.type === 'file' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                          handleNodeClick(node.data);
                            }}
                        className="p-1 hover:bg-blue-100 rounded transition-colors"
                        title="Open File"
                          >
                        <HiEye className="w-4 h-4 text-blue-700" />
                          </button>
                    )}

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
                            createNewLatexFile(node.data.id);
                            }}
                          className="p-1 hover:bg-green-100 rounded transition-colors"
                          title="Create LaTeX File in Folder"
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
                onClick={() => createNewFolder(contextMenu.node?.id)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
              >
                <HiFolderAdd className="w-4 h-4 mr-2" />
                Create Subfolder
              </button>
              <button
                onClick={() => createNewLatexFile(contextMenu.node?.id)}
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
      {contextMenu.show && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Select Template for "{pendingFileName}"
                </h3>
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setPendingFileName('');
                    setPendingParentFolderId(undefined);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Choose a template to start your LaTeX document
              </p>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              <div className="grid gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => createNewProjectWithTemplate(template)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-700">
                            {template.name}
                          </h4>
                          {template.isDefault && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            {template.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setPendingFileName('');
                    setPendingParentFolderId(undefined);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default LatexFileTree; 