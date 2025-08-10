export interface BpmnProject {
    id: string;
    name: string;
    lastEdited?: string;
    xml?: string;
    content?: string; // BPMN XML content (new field for hierarchical system)
    preview?: string;
    createdBy?: string; // User ID of project creator
    role?: string;      // Role of the creator
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
    selectedStandards?: string[];
}

const BASE_STORAGE_KEY = 'bpmn_projects';

/**
 * Gets the storage key specific to a user
 */
function getStorageKey(userId?: string, role?: string): string {
    // If no user info is provided, return the base key (backward compatibility)
    if (!userId && !role) return BASE_STORAGE_KEY;

    // Otherwise, create a user-specific key
    return `${BASE_STORAGE_KEY}_${role}_${userId}`;
}

/**
 * Checks if a user can access/edit a specific project
 */
export function canAccessProject(project: BpmnProject, userId?: string, userRole?: string): boolean {
    // If no user info provided, deny access
    if (!userId || !userRole) return false;

    // If no project creator info, allow access (backward compatibility)
    if (!project.createdBy || !project.role) return true;

    // Same user can always access their own projects
    if (project.createdBy === userId) return true;

    // Role-based access: Admin can access all projects
    if (userRole === 'admin') return true;

    // Supervisors can access user projects but not admin projects
    if (userRole === 'supervisor' && project.role !== 'admin') return true;

    // Regular users can only access their own projects
    return false;
}

/**
 * Gets all saved BPMN projects from local storage for a specific user
 */
export function getSavedProjects(userId?: string, role?: string): BpmnProject[] {
    if (typeof window === 'undefined') return [];

    try {
        const storageKey = getStorageKey(userId, role);
        const savedData = localStorage.getItem(storageKey);
        if (!savedData) return [];
        return JSON.parse(savedData);
    } catch (err) {
        console.error('Error retrieving saved projects:', err);
        return [];
    }
}

/**
 * Saves a BPMN project to local storage
 */
export function saveProject(project: BpmnProject, userId?: string, role?: string): void {
    if (typeof window === 'undefined') return;

    try {
        // Add user information to the project if provided
        const projectWithUser = {
            ...project,
            createdBy: userId || project.createdBy,
            role: role || project.role
        };

        const storageKey = getStorageKey(userId, role);
        const projects = getSavedProjects(userId, role);

        // Check if project already exists (update it)
        const existingIndex = projects.findIndex(p => p.id === project.id);

        if (existingIndex >= 0) {
            // Update existing project
            projects[existingIndex] = {
                ...projects[existingIndex],
                ...projectWithUser,
                lastEdited: new Date().toISOString() // Update last edited date
            };
        } else {
            // Add new project
            projects.push({
                ...projectWithUser,
                lastEdited: new Date().toISOString()
            });
        }

        localStorage.setItem(storageKey, JSON.stringify(projects));
    } catch (err) {
        console.error('Error saving project:', err);
    }
}

/**
 * Deletes a BPMN project from local storage
 */
export function deleteProject(projectId: string, userId?: string, role?: string): void {
    if (typeof window === 'undefined') return;

    try {
        const storageKey = getStorageKey(userId, role);
        const projects = getSavedProjects(userId, role);
        const updatedProjects = projects.filter(p => p.id !== projectId);
        localStorage.setItem(storageKey, JSON.stringify(updatedProjects));
    } catch (err) {
        console.error('Error deleting project:', err);
    }
}

/**
 * Gets a specific BPMN project by ID
 */
export function getProjectById(projectId: string, userId?: string, role?: string): BpmnProject | null {
    if (typeof window === 'undefined') return null;

    try {
        const projects = getSavedProjects(userId, role);
        return projects.find(p => p.id === projectId) || null;
    } catch (err) {
        console.error('Error retrieving project:', err);
        return null;
    }
}

/**
 * Async: Gets all saved BPMN projects from the backend API for a specific user
 */
export async function getSavedProjectsFromAPI(userId?: string, role?: string): Promise<BpmnProject[]> {
  if (!userId || !role) return [];
  // Not implemented in backend yet, so return [] for now
  return [];
}

/**
 * Async: Gets a specific BPMN project by fileId from the backend API
 */
export async function getProjectByIdFromAPI(fileId: string): Promise<BpmnProject | null> {
  if (!fileId) return null;
  try {
    const res = await fetch(`/api/bpmn?fileId=${fileId}`);
    if (!res.ok) return null;
    const data = await res.json();
    
    console.log('API response data:', data);
    console.log('Process metadata from API:', data.processMetadata);
    
    // Transform the API response to match our BpmnProject interface
    const transformedProject = {
      id: data._id || data.id,
      name: data.name,
      lastEdited: data.updatedAt || new Date().toISOString(),
      xml: data.content,
      preview: data.preview,
      createdBy: data.userId,
      role: data.role,
      processMetadata: data.processMetadata || {
        processName: '',
        description: '',
        processOwner: '',
        processManager: '',
      },
      signOffData: data.signOffData || {
        responsibility: '',
        date: '',
        name: '',
        designation: '',
        signature: ''
      },
      historyData: data.historyData || {
        versionNo: '',
        date: '',
        statusRemarks: '',
        author: ''
      },
      triggerData: data.triggerData || {
        triggers: '',
        inputs: '',
        outputs: ''
      },
      selectedStandards: data.selectedStandards || []
    };
    
    console.log('Transformed project:', transformedProject);
    return transformedProject;
  } catch (err) {
    console.error('Error fetching BPMN project from API:', err);
    return null;
  }
}

/**
 * Async: Saves a BPMN project to the backend API (create or update)
 */
export async function saveProjectToAPI(project: BpmnProject, userId?: string, role?: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
  if (!userId || !project.name || !project.xml) {
    return { success: false, error: 'Missing required fields' };
  }
  
  try {
    console.log('Saving project to API:', { userId, name: project.name, fileId: project.id });
    
    const res = await fetch('/api/bpmn-nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type: 'file',
        name: project.name,
        content: project.xml,
        processMetadata: project.processMetadata || {
          processName: '',
          description: '',
          processOwner: '',
          processManager: '',
        },
        signOffData: project.signOffData || {
          responsibility: '',
          date: '',
          name: '',
          designation: '',
          signature: ''
        },
        historyData: project.historyData || {
          versionNo: '',
          date: '',
          statusRemarks: '',
          author: ''
        },
        triggerData: project.triggerData || {
          triggers: '',
          inputs: '',
          outputs: ''
        },
        advancedDetails: project.advancedDetails,
        selectedStandards: project.selectedStandards || []
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('Project saved successfully:', data);
      return { success: true, fileId: data.fileId || data._id };
    } else {
      const errorData = await res.json().catch(() => ({}));
      console.error('API error saving project:', errorData);
      return { success: false, error: errorData.error || 'Failed to save project' };
    }
  } catch (err) {
    console.error('Error saving BPMN project to API:', err);
    return { success: false, error: (err as Error).message || 'Network error' };
  }
}

/**
 * Async: Deletes a BPMN project from the backend API
 */
export async function deleteProjectFromAPI(fileId: string): Promise<boolean> {
  if (!fileId) return false;
  try {
    const res = await fetch(`/api/bpmn?fileId=${fileId}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('Error deleting BPMN project from API:', err);
    return false;
    }
} 