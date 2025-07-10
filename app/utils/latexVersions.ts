/**
 * LaTeX document version tracking utilities
 * This file provides functions to handle versioning of LaTeX documents
 */

export interface LatexVersion {
    version: string;
    content: string;
    timestamp: string;
    userId?: string;
    userRole?: string;
    notes?: string;
    changeType?: 'insertion' | 'deletion' | 'modification' | 'save';
    changeDescription?: string;
}

export interface LatexProjectVersions {
    projectId: string;
    versions: LatexVersion[];
}

const VERSIONS_STORAGE_KEY = 'latex_project_versions';

/**
 * Gets all stored versions for a LaTeX project
 */
export function getLatexProjectVersions(projectId: string): LatexVersion[] {
    if (typeof window === 'undefined') return [];

    try {
        const versionsData = localStorage.getItem(VERSIONS_STORAGE_KEY);
        if (!versionsData) return [];

        const allProjectVersions: LatexProjectVersions[] = JSON.parse(versionsData);
        const projectVersions = allProjectVersions.find(p => p.projectId === projectId);

        return projectVersions?.versions || [];
    } catch (err) {
        console.error('Error retrieving LaTeX project versions:', err);
        return [];
    }
}

/**
 * Adds a new version to a LaTeX project's version history
 */
export function addLatexProjectVersion(
    projectId: string,
    content: string,
    userId?: string,
    userRole?: string,
    notes?: string,
    changeType: 'insertion' | 'deletion' | 'modification' | 'save' = 'save',
    changeDescription?: string
): LatexVersion {
    if (typeof window === 'undefined') {
        return {
            version: "1.0",
            content,
            timestamp: new Date().toISOString(),
            changeType,
            changeDescription
        };
    }

    try {
        // Get existing versions
        const versionsData = localStorage.getItem(VERSIONS_STORAGE_KEY);
        let allProjectVersions: LatexProjectVersions[] = [];

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
        const newVersion: LatexVersion = {
            version: versionString,
            content,
            timestamp: new Date().toISOString(),
            userId,
            userRole,
            notes,
            changeType,
            changeDescription
        };

        // Add to the beginning of the array (newest first)
        projectVersions.versions.unshift(newVersion);

        // Limit version history to 50 versions (more for documents)
        if (projectVersions.versions.length > 50) {
            projectVersions.versions = projectVersions.versions.slice(0, 50);
        }

        // Save back to localStorage
        localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(allProjectVersions));

        return newVersion;
    } catch (err) {
        console.error('Error saving LaTeX project version:', err);
        return {
            version: "1.0",
            content,
            timestamp: new Date().toISOString(),
            changeType,
            changeDescription
        };
    }
}

/**
 * Gets a specific version by version number
 */
export function getLatexProjectVersion(projectId: string, version: string): LatexVersion | null {
    const versions = getLatexProjectVersions(projectId);
    return versions.find(v => v.version === version) || null;
}

/**
 * Reverts to a specific version
 */
export function revertToLatexVersion(projectId: string, version: string): LatexVersion | null {
    const targetVersion = getLatexProjectVersion(projectId, version);
    if (!targetVersion) return null;

    // Add a new version with the reverted content
    return addLatexProjectVersion(
        projectId,
        targetVersion.content,
        targetVersion.userId,
        targetVersion.userRole,
        `Reverted to version ${version}`,
        'modification',
        `Reverted to version ${version} from ${targetVersion.timestamp}`
    );
}

/**
 * Compares two versions and returns differences
 */
export function compareLatexVersions(projectId: string, version1: string, version2: string): {
    added: string[];
    removed: string[];
    modified: string[];
} {
    const v1 = getLatexProjectVersion(projectId, version1);
    const v2 = getLatexProjectVersion(projectId, version2);

    if (!v1 || !v2) {
        return { added: [], removed: [], modified: [] };
    }

    const lines1 = v1.content.split('\n');
    const lines2 = v2.content.split('\n');

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Simple line-by-line comparison
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
        const line1 = lines1[i] || '';
        const line2 = lines2[i] || '';

        if (line1 !== line2) {
            if (line1 === '') {
                added.push(`Line ${i + 1}: ${line2}`);
            } else if (line2 === '') {
                removed.push(`Line ${i + 1}: ${line1}`);
            } else {
                modified.push(`Line ${i + 1}: "${line1}" → "${line2}"`);
            }
        }
    }

    return { added, removed, modified };
}

/**
 * Deletes all versions for a LaTeX project
 */
export function deleteLatexProjectVersions(projectId: string): void {
    if (typeof window === 'undefined') return;

    try {
        const versionsData = localStorage.getItem(VERSIONS_STORAGE_KEY);
        if (!versionsData) return;

        let allProjectVersions: LatexProjectVersions[] = JSON.parse(versionsData);

        // Filter out the project to delete
        allProjectVersions = allProjectVersions.filter(p => p.projectId !== projectId);

        // Save back to localStorage
        localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(allProjectVersions));
    } catch (err) {
        console.error('Error deleting LaTeX project versions:', err);
    }
}

/**
 * Formats a timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

/**
 * Gets a human-readable change description
 */
export function getChangeDescription(version: LatexVersion): string {
    if (version.changeDescription) {
        return version.changeDescription;
    }

    switch (version.changeType) {
        case 'insertion':
            return 'Text inserted';
        case 'deletion':
            return 'Text deleted';
        case 'modification':
            return 'Text modified';
        case 'save':
            return 'Document saved';
        default:
            return 'Change made';
    }
}

/**
 * Checks if the new content has meaningful changes compared to the latest version
 */
export function hasMeaningfulChanges(projectId: string, newContent: string): boolean {
    if (!newContent || newContent.trim() === '') {
        return false;
    }

    const versions = getLatexProjectVersions(projectId);
    if (versions.length === 0) {
        // First version, always meaningful
        return true;
    }

    const latestVersion = versions[0];
    const latestContent = latestVersion.content;

    // Remove whitespace differences for comparison
    const normalizedNew = newContent.trim();
    const normalizedLatest = latestContent.trim();

    // Check if content is actually different
    if (normalizedNew === normalizedLatest) {
        return false;
    }

    // Check if the difference is significant (more than just whitespace or minor formatting)
    const newLines = normalizedNew.split('\n').filter(line => line.trim() !== '');
    const latestLines = normalizedLatest.split('\n').filter(line => line.trim() !== '');

    // If line count is significantly different, it's meaningful
    if (Math.abs(newLines.length - latestLines.length) > 1) {
        return true;
    }

    // Check character difference (ignore whitespace)
    const newChars = normalizedNew.replace(/\s/g, '');
    const latestChars = normalizedLatest.replace(/\s/g, '');

    // If character difference is more than 5%, it's meaningful
    const maxLength = Math.max(newChars.length, latestChars.length);
    const charDifference = Math.abs(newChars.length - latestChars.length);
    
    return charDifference > 5 || (maxLength > 0 && charDifference / maxLength > 0.05);
} 