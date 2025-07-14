// Define roles hierarchy
export const ROLES = {
  USER: 'user',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin'
};

// Role hierarchy (higher number = more permissions)
export const ROLE_LEVELS: Record<string, number> = {
  [ROLES.USER]: 1,
  [ROLES.SUPERVISOR]: 2,
  [ROLES.ADMIN]: 3
};

// Function to check if user has required role level
export function hasRole(userRole: string, requiredRole: string): boolean {
  const userRoleLevel = ROLE_LEVELS[userRole] || 0;
  const requiredRoleLevel = ROLE_LEVELS[requiredRole] || 999; // Default to a high number if invalid role
  
  return userRoleLevel >= requiredRoleLevel;
}

// Define type for feature access
type FeatureAccess = Record<string, string[]>;

// Function to check if user can access specific feature
export function canAccess(userRole: string, feature: string): boolean {
  // Define feature access by role
  const featureAccess: FeatureAccess = {
    // Admin features
    'manage-users': [ROLES.ADMIN],
    'delete-user': [ROLES.ADMIN],
    'system-settings': [ROLES.ADMIN],
    
    // Supervisor features
    'view-reports': [ROLES.SUPERVISOR, ROLES.ADMIN],
    'approve-users': [ROLES.SUPERVISOR, ROLES.ADMIN],
    
    // Common features
    'view-dashboard': [ROLES.USER, ROLES.SUPERVISOR, ROLES.ADMIN],
    'edit-profile': [ROLES.USER, ROLES.SUPERVISOR, ROLES.ADMIN],
  };
  
  const allowedRoles = featureAccess[feature] || [];
  return allowedRoles.includes(userRole);
}

// Component to conditionally render UI based on role
export function RoleBasedUi({ 
  userRole,
  requiredRole,
  fallback = null,
  children 
}: {
  userRole: string;
  requiredRole: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactNode {
  if (hasRole(userRole, requiredRole)) {
    return children;
  }
  return fallback;
} 