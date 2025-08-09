export interface LatexProject {
    id: string;
    name: string;
    lastEdited: string;
    content?: string;
    preview?: string;
    createdBy?: string; // User ID of project creator
    role?: string;      // Role of the creator
    // Template protection properties
    templateName?: string;  // Name of the template used
    templateId?: string;    // ID of the template used
    isTemplateProtected?: boolean; // Whether this project has template protection enabled
}

const BASE_STORAGE_KEY = 'latex_projects';

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
export function canAccessLatexProject(project: LatexProject, userId?: string, userRole?: string): boolean {
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
 * Gets all saved LaTeX projects from local storage for a specific user
 */
export function getSavedLatexProjects(userId?: string, role?: string): LatexProject[] {
    if (typeof window === 'undefined') return [];

    try {
        const storageKey = getStorageKey(userId, role);
        const savedData = localStorage.getItem(storageKey);
        if (!savedData) return [];
        return JSON.parse(savedData);
    } catch (err) {
        console.error('Error retrieving saved LaTeX projects:', err);
        return [];
    }
}

/**
 * Saves a LaTeX project to local storage
 */
export function saveLatexProject(project: LatexProject, userId?: string, role?: string): void {
    if (typeof window === 'undefined') return;

    try {
        console.log('saveLatexProject called:', { projectId: project.id, userId, role, contentLength: project.content?.length });
        
        // Add user information to the project if provided
        const projectWithUser = {
            ...project,
            createdBy: userId || project.createdBy,
            role: role || project.role
        };

        const storageKey = getStorageKey(userId, role);
        console.log('Storage key:', storageKey);
        
        const projects = getSavedLatexProjects(userId, role);
        console.log('Existing projects count:', projects.length);

        // Check if project already exists (update it)
        const existingIndex = projects.findIndex(p => p.id === project.id);

        if (existingIndex >= 0) {
            // Update existing project
            console.log('Updating existing project at index:', existingIndex);
            projects[existingIndex] = {
                ...projects[existingIndex],
                ...projectWithUser,
                lastEdited: new Date().toISOString().split('T')[0] // Update last edited date
            };
        } else {
            // Add new project
            console.log('Adding new project');
            projects.push({
                ...projectWithUser,
                lastEdited: new Date().toISOString().split('T')[0]
            });
        }

        console.log('Saving projects to localStorage:', projects.length, 'projects');
        localStorage.setItem(storageKey, JSON.stringify(projects));
        console.log('Project saved successfully');
    } catch (err) {
        console.error('Error saving LaTeX project:', err);
    }
}

/**
 * Deletes a LaTeX project from local storage
 */
export function deleteLatexProject(projectId: string, userId?: string, role?: string): void {
    if (typeof window === 'undefined') return;

    try {
        const storageKey = getStorageKey(userId, role);
        const projects = getSavedLatexProjects(userId, role);
        const updatedProjects = projects.filter(p => p.id !== projectId);
        localStorage.setItem(storageKey, JSON.stringify(updatedProjects));
    } catch (err) {
        console.error('Error deleting LaTeX project:', err);
    }
}

/**
 * Gets a specific LaTeX project by ID
 */
export function getLatexProjectById(projectId: string, userId?: string, role?: string): LatexProject | null {
    if (typeof window === 'undefined') return null;

    try {
        const projects = getSavedLatexProjects(userId, role);
        return projects.find(p => p.id === projectId) || null;
    } catch (err) {
        console.error('Error retrieving LaTeX project:', err);
        return null;
    }
}

/**
 * Async: Gets a LaTeX project by ID from the database
 */
export async function getLatexProjectByIdFromAPI(projectId: string): Promise<LatexProject | null> {
    try {
        const res = await fetch(`/api/latex?fileId=${projectId}`);
        if (!res.ok) {
            console.error('Failed to fetch LaTeX project from database');
            return null;
        }
        const data = await res.json();
        return {
            id: data.fileId || data._id,
            name: data.name,
            lastEdited: data.updatedAt || new Date().toISOString(),
            content: data.content,
            createdBy: data.userId,
            role: data.role,
        };
    } catch (err) {
        console.error('Error fetching LaTeX project from database:', err);
        return null;
    }
}

/**
 * Async: Saves a LaTeX project to the database
 */
export async function saveLatexProjectToAPI(project: LatexProject, userId?: string, role?: string, authorName?: string): Promise<boolean> {
    try {
        console.log('Saving project to API:', project.id);

        const requestBody: any = {
            userId: userId || project.createdBy,
            name: project.name,
            type: 'tex',
            content: project.content || '',
            fileId: project.id,
            documentMetadata: {
                title: project.name,
                author: authorName || '',
                description: '',
                tags: [],
            }
        };

        const res = await fetch('/api/latex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('API save failed:', errorText);
            return false;
        }

        console.log('Project saved to API successfully');
        return true;
    } catch (err) {
        console.error('Error saving LaTeX project to database:', err);
        return false;
    }
}

/**
 * Async: Updates a LaTeX project in the database
 */
export async function updateLatexProjectInAPI(project: LatexProject): Promise<boolean> {
    try {
        console.log('Updating project in API:', project.id);

        const requestBody: any = {
            fileId: project.id,
            content: project.content,
            name: project.name,
        };

        const res = await fetch('/api/latex', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('API update failed:', errorText);
            return false;
        }

        console.log('Project updated in API successfully');
        return true;
    } catch (err) {
        console.error('Error updating LaTeX project in database:', err);
        return false;
    }
}

/**
 * Async: Deletes a LaTeX project from the database
 */
export async function deleteLatexProjectFromAPI(projectId: string): Promise<boolean> {
    try {
        const res = await fetch(`/api/latex?fileId=${projectId}`, {
            method: 'DELETE'
        });
        return res.ok;
    } catch (err) {
        console.error('Error deleting LaTeX project from database:', err);
        return false;
    }
} 