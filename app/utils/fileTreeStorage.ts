export interface FileTreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: FileTreeNode[];
  projectData?: any; // This will be BpmnProject or LatexProject
  parentId?: string;
  path: string;
}

const BPMN_TREE_STORAGE_KEY = 'bpmn_file_tree';
const LATEX_TREE_STORAGE_KEY = 'latex_file_tree';

/**
 * Gets the storage key specific to a user for BPMN file tree
 */
function getBpmnTreeStorageKey(userId?: string, role?: string): string {
  if (!userId && !role) return BPMN_TREE_STORAGE_KEY;
  return `${BPMN_TREE_STORAGE_KEY}_${role}_${userId}`;
}

/**
 * Gets the storage key specific to a user for LaTeX file tree
 */
function getLatexTreeStorageKey(userId?: string, role?: string): string {
  if (!userId && !role) return LATEX_TREE_STORAGE_KEY;
  return `${LATEX_TREE_STORAGE_KEY}_${role}_${userId}`;
}

/**
 * Saves the complete BPMN file tree structure to localStorage
 */
export function saveBpmnFileTree(fileTree: FileTreeNode[], userId?: string, role?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const storageKey = getBpmnTreeStorageKey(userId, role);
    localStorage.setItem(storageKey, JSON.stringify(fileTree));
  } catch (err) {
    console.error('Error saving BPMN file tree:', err);
  }
}

/**
 * Gets the complete BPMN file tree structure from localStorage
 */
export function getBpmnFileTree(userId?: string, role?: string): FileTreeNode[] {
  if (typeof window === 'undefined') return [];

  try {
    const storageKey = getBpmnTreeStorageKey(userId, role);
    const savedData = localStorage.getItem(storageKey);
    if (!savedData) return [];
    return JSON.parse(savedData);
  } catch (err) {
    console.error('Error retrieving BPMN file tree:', err);
    return [];
  }
}

/**
 * Saves the complete LaTeX file tree structure to localStorage
 */
export function saveLatexFileTree(fileTree: FileTreeNode[], userId?: string, role?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const storageKey = getLatexTreeStorageKey(userId, role);
    localStorage.setItem(storageKey, JSON.stringify(fileTree));
  } catch (err) {
    console.error('Error saving LaTeX file tree:', err);
  }
}

/**
 * Gets the complete LaTeX file tree structure from localStorage
 */
export function getLatexFileTree(userId?: string, role?: string): FileTreeNode[] {
  if (typeof window === 'undefined') return [];

  try {
    const storageKey = getLatexTreeStorageKey(userId, role);
    const savedData = localStorage.getItem(storageKey);
    if (!savedData) return [];
    return JSON.parse(savedData);
  } catch (err) {
    console.error('Error retrieving LaTeX file tree:', err);
    return [];
  }
}

/**
 * Migrates existing projects to the new file tree structure
 * This function should be called when the file tree is first loaded
 */
export function migrateProjectsToFileTree(
  projects: any[],
  userId?: string,
  role?: string,
  treeType: 'bpmn' | 'latex' = 'bpmn'
): FileTreeNode[] {
  if (projects.length === 0) return [];

  // Create root folders for different categories
  const categories = {
    'My Projects': projects.filter(p => p.createdBy === userId),
    'Shared Projects': projects.filter(p => p.createdBy !== userId && p.role !== 'admin'),
    'Admin Projects': projects.filter(p => p.role === 'admin')
  };

  const rootFolders: FileTreeNode[] = [];

  Object.entries(categories).forEach(([categoryName, categoryProjects]) => {
    if (categoryProjects.length > 0) {
      const folderId = `folder-${categoryName.toLowerCase().replace(/\s+/g, '-')}`;
      const folder: FileTreeNode = {
        id: folderId,
        name: categoryName,
        type: 'folder',
        children: [],
        path: categoryName
      };

      // Add projects to this folder
      categoryProjects.forEach(project => {
        const fileNode: FileTreeNode = {
          id: project.id,
          name: project.name,
          type: 'file',
          projectData: project,
          parentId: folderId,
          path: `${categoryName}/${project.name}`
        };
        folder.children!.push(fileNode);
      });

      rootFolders.push(folder);
    }
  });

  return rootFolders;
} 