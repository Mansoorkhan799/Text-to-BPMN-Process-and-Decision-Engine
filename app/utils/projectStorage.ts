export interface BpmnProject {
    id: string;
    name: string;
    lastEdited: string;
    xml?: string;
    preview?: string;
    createdBy?: string; // User ID of project creator
    role?: string;      // Role of the creator
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
                lastEdited: new Date().toISOString().split('T')[0] // Update last edited date
            };
        } else {
            // Add new project
            projects.push({
                ...projectWithUser,
                lastEdited: new Date().toISOString().split('T')[0]
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