/**
 * Project version tracking utilities
 * This file provides functions to handle versioning of BPMN diagrams
 */

export interface DiagramVersion {
    version: string;
    xml: string;
    timestamp: string;
    userId?: string;
    userRole?: string;
    notes?: string;
}

export interface ProjectVersions {
    projectId: string;
    versions: DiagramVersion[];
}

const VERSIONS_STORAGE_KEY = 'bpmn_project_versions';

/**
 * Gets all stored versions for a project
 */
export function getProjectVersions(projectId: string): DiagramVersion[] {
    if (typeof window === 'undefined') return [];

    try {
        const versionsData = localStorage.getItem(VERSIONS_STORAGE_KEY);
        if (!versionsData) return [];

        const allProjectVersions: ProjectVersions[] = JSON.parse(versionsData);
        const projectVersions = allProjectVersions.find(p => p.projectId === projectId);

        return projectVersions?.versions || [];
    } catch (err) {
        console.error('Error retrieving project versions:', err);
        return [];
    }
}

/**
 * Adds a new version to a project's version history
 */
export function addProjectVersion(
    projectId: string,
    xml: string,
    userId?: string,
    userRole?: string,
    notes?: string
): DiagramVersion {
    if (typeof window === 'undefined') {
        return {
            version: "1.0",
            xml,
            timestamp: new Date().toISOString()
        };
    }

    try {
        // Get existing versions
        const versionsData = localStorage.getItem(VERSIONS_STORAGE_KEY);
        let allProjectVersions: ProjectVersions[] = [];

        if (versionsData) {
            allProjectVersions = JSON.parse(versionsData);
        }

        // Find the project versions or create a new entry
        let projectVersions = allProjectVersions.find(p => p.projectId === projectId);

        if (!projectVersions) {
            projectVersions = {
                projectId,
                versions: []
            };
            allProjectVersions.push(projectVersions);
        }

        // Calculate the new version number
        let versionNumber = 1.0;
        if (projectVersions.versions.length > 0) {
            const latestVersion = projectVersions.versions[0];
            const latestVersionNumber = parseFloat(latestVersion.version);
            versionNumber = latestVersionNumber + 0.1;
        }

        // Round to 1 decimal place and format
        versionNumber = Math.round(versionNumber * 10) / 10;
        const versionString = versionNumber.toFixed(1);

        // Create new version object
        const newVersion: DiagramVersion = {
            version: versionString,
            xml,
            timestamp: new Date().toISOString(),
            userId,
            userRole,
            notes
        };

        // Add to the beginning of the array (newest first)
        projectVersions.versions.unshift(newVersion);

        // Limit version history to 20 versions
        if (projectVersions.versions.length > 20) {
            projectVersions.versions = projectVersions.versions.slice(0, 20);
        }

        // Save back to localStorage
        localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(allProjectVersions));

        return newVersion;
    } catch (err) {
        console.error('Error saving project version:', err);
        return {
            version: "1.0",
            xml,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Deletes all versions for a project
 */
export function deleteProjectVersions(projectId: string): void {
    if (typeof window === 'undefined') return;

    try {
        const versionsData = localStorage.getItem(VERSIONS_STORAGE_KEY);
        if (!versionsData) return;

        let allProjectVersions: ProjectVersions[] = JSON.parse(versionsData);

        // Filter out the project to delete
        allProjectVersions = allProjectVersions.filter(p => p.projectId !== projectId);

        // Save back to localStorage
        localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(allProjectVersions));
    } catch (err) {
        console.error('Error deleting project versions:', err);
    }
} 