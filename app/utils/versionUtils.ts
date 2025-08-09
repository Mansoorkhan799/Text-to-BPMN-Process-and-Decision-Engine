/**
 * Utility functions for version management
 */

/**
 * Increments a semantic version number
 * @param currentVersion - Current version string (e.g., "1.0.0")
 * @param incrementType - Type of increment: 'major', 'minor', or 'patch'
 * @returns New version string
 */
export function incrementVersion(currentVersion: string, incrementType: 'major' | 'minor' | 'patch' = 'patch'): string {
    const versionParts = currentVersion.split('.').map(part => parseInt(part, 10));
    
    if (versionParts.length !== 3 || versionParts.some(isNaN)) {
        // If version format is invalid, start with 1.0.0
        return '1.0.0';
    }
    
    const [major, minor, patch] = versionParts;
    
    switch (incrementType) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
        default:
            return `${major}.${minor}.${patch + 1}`;
    }
}

/**
 * Automatically determines the appropriate version increment based on change type
 * @param currentVersion - Current version string
 * @param changeType - Type of change made
 * @returns New version string
 */
export function autoIncrementVersion(currentVersion: string, changeType: 'diagram' | 'process' | 'advanced' | 'tables'): string {
    // For diagram changes, increment patch version (most common)
    if (changeType === 'diagram') {
        return incrementVersion(currentVersion, 'patch');
    }
    
    // For process details changes, increment minor version
    if (changeType === 'process') {
        return incrementVersion(currentVersion, 'minor');
    }
    
    // For advanced details changes, increment patch version
    if (changeType === 'advanced') {
        return incrementVersion(currentVersion, 'patch');
    }
    
    // For table data changes, increment patch version
    if (changeType === 'tables') {
        return incrementVersion(currentVersion, 'patch');
    }
    
    // Default to patch increment
    return incrementVersion(currentVersion, 'patch');
}

/**
 * Formats the current date for version tracking (date only)
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function getCurrentDateString(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Formats the current date and time for version tracking
 * @returns Formatted date and time string (YYYY-MM-DD HH:MM:SS)
 */
export function getCurrentDateTimeString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formats a date string for display
 * @param dateString - Date string to format
 * @returns Formatted date string for display
 */
export function formatDateForDisplay(dateString: string): string {
    if (!dateString || dateString.trim() === '') return 'Not specified';
    
    try {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            return dateString; // Return original if parsing fails
        }
        
        // Always try to show time if the date object has time information
        // Check if the time is not midnight (00:00:00)
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        
        if (hours === 0 && minutes === 0 && seconds === 0) {
            // Time is midnight, show date only
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } else {
            // Has time component, show date and time
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
    } catch (error) {
        return dateString; // Return original if formatting fails
    }
}

/**
 * Formats a date string for display (date only, no time)
 * @param dateString - Date string to format
 * @returns Formatted date string for display (date only)
 */
export function formatDateOnlyForDisplay(dateString: string): string {
    if (!dateString || dateString.trim() === '') return 'Not specified';
    
    try {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            return dateString; // Return original if parsing fails
        }
        
        // Always show date only, regardless of time component
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return dateString; // Return original if formatting fails
    }
}

/**
 * Creates a change description based on the change type
 * @param changeType - Type of change made
 * @param additionalInfo - Additional information about the change
 * @returns Change description string
 */
export function createChangeDescription(changeType: 'diagram' | 'process' | 'advanced' | 'tables', additionalInfo?: string): string {
    const baseDescriptions = {
        diagram: 'Diagram elements modified',
        process: 'Process details updated',
        advanced: 'Advanced details modified',
        tables: 'Table data updated'
    };
    
    const baseDescription = baseDescriptions[changeType];
    
    if (additionalInfo) {
        return `${baseDescription}: ${additionalInfo}`;
    }
    
    return baseDescription;
}

/**
 * Gets the user display name from user object
 * @param user - User object with name and email
 * @returns User display name
 */
export function getUserDisplayName(user: { name?: string; email?: string } | null): string {
    if (!user) return 'Unknown';
    
    // Prefer name over email, fallback to email if no name
    return user.name || user.email || 'Unknown';
}

/**
 * Creates initial advanced details for a new file
 * @param user - Current user creating the file
 * @returns Initial advanced details object
 */
export function createInitialAdvancedDetails(user: { name?: string; email?: string } | null) {
    return {
        versionNo: '1.0.0',
        processStatus: '',
        classification: '',
        dateOfCreation: '', // Will be populated when file is actually created
        dateOfReview: '',
        effectiveDate: '',
        modificationDate: '', // Will be populated when file is actually created
        modifiedBy: '', // Will be populated when file is actually created
        changeDescription: '',
        createdBy: '', // Will be populated when file is actually created
    };
}
