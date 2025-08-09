'use client';

import { useRouter } from 'next/navigation';
import { IconType } from 'react-icons';
import { HiOutlineViewGrid, HiOutlineUsers, HiOutlineLogout, HiOutlineUser, HiChevronUp, HiBell, HiOutlineFolderOpen } from 'react-icons/hi';
import { SiLatex } from 'react-icons/si';
import { useState, useEffect } from 'react';
import { ROLES } from '../utils/permissions';

interface SideMenuProps {
  isCollapsed?: boolean;
  onNavigate: (view: string) => void;
  currentView?: string;
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  view: string;
  requiredRole: string;
  shouldShow?: boolean;
  badge?: React.ReactNode;
}

interface NotificationCounts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

const SideMenu: React.FC<SideMenuProps> = ({
  isCollapsed = false,
  onNavigate,
  currentView = 'dashboard',
  userRole = 'user',
  userName = '',
  userEmail = ''
}) => {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState(0);
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  // Check for pending notifications
  useEffect(() => {
    // Check for notifications for all users
    fetchNotificationCount();

    // Listen for notification changes from other components
    const handleNotificationChange = () => {
      fetchNotificationCount();
    };

    window.addEventListener('notificationsChanged', handleNotificationChange);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('notificationsChanged', handleNotificationChange);
    };
  }, [userRole]);

  const fetchNotificationCount = async () => {
    try {
      const response = await fetch('/api/notifications/count');
      if (response.ok) {
        const data = await response.json();
        setPendingNotifications(data.count);
        // Check if the new counts structure is available
        if (data.counts) {
          setNotificationCounts(data.counts);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  // Function to check if user has access to a view
  const hasAccess = (requiredRole: string) => {
    const roleLevels: Record<string, number> = {
      [ROLES.USER]: 1,
      [ROLES.SUPERVISOR]: 2,
      [ROLES.ADMIN]: 3
    };

    const userRoleLevel = roleLevels[userRole] || 1;
    const requiredRoleLevel = roleLevels[requiredRole] || 3;

    return userRoleLevel >= requiredRoleLevel;
  };

  const menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: <HiOutlineViewGrid className={`${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} />,
      onClick: () => onNavigate('dashboard'),
      view: 'dashboard',
      requiredRole: ROLES.USER // Everyone can access
    },
    {
      label: 'BPMN Editor',
      icon: <svg className={`${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 7V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
        <rect x="7" y="9" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
      </svg>,
      onClick: () => onNavigate('bpmn'),
      view: 'bpmn',
      requiredRole: ROLES.USER // Everyone can access
    },
    {
      label: 'LaTeX Editor',
      icon: <SiLatex className={`${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} />,
      onClick: () => onNavigate('latex'),
      view: 'latex',
      requiredRole: ROLES.USER // Everyone can access
    },
    // Admin-only: File Management (combines BPMN + LaTeX)
    {
      label: 'File Management',
      icon: <HiOutlineFolderOpen className={`${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} />,
      onClick: () => onNavigate('admin-file-management'),
      view: 'admin-file-management',
      requiredRole: ROLES.ADMIN,
      shouldShow: userRole === ROLES.ADMIN,
    },
    {
      label: 'Notifications',
      icon: (
        <div className="relative">
          <HiBell className={`${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} />
          {notificationCounts.total > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {notificationCounts.total > 9 ? '9+' : notificationCounts.total}
            </span>
          )}
        </div>
      ),
      onClick: () => onNavigate('notifications'),
      view: 'notifications',
      requiredRole: ROLES.USER,
      shouldShow: userRole !== ROLES.ADMIN, // Hide for admin users
      badge: notificationCounts.total > 0 ?
        (isCollapsed ? null : (
          <div className="flex gap-1 ml-auto">
            {notificationCounts.pending > 0 && (
              <span className="bg-yellow-100 text-yellow-800 text-xs rounded px-1 py-0.5">
                {notificationCounts.pending}
              </span>
            )}
            {notificationCounts.approved > 0 && (
              <span className="bg-green-100 text-green-800 text-xs rounded px-1 py-0.5">
                {notificationCounts.approved}
              </span>
            )}
            {notificationCounts.rejected > 0 && (
              <span className="bg-red-100 text-red-800 text-xs rounded px-1 py-0.5">
                {notificationCounts.rejected}
              </span>
            )}
          </div>
        )) : null
    },
    {
      label: 'Users',
      icon: <HiOutlineUsers className={`${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} />,
      onClick: () => onNavigate('users'),
      view: 'users',
      requiredRole: ROLES.SUPERVISOR // Only supervisor and admin can access
    },
    {
      label: 'Profile',
      icon: <HiOutlineUser className={`${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} />,
      onClick: () => onNavigate('profile'),
      view: 'profile',
      requiredRole: ROLES.USER // Everyone can access
    },
  ];

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/signin');
      }
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Get user initials
  const getUserInitials = () => {
    if (!userName) return userEmail ? userEmail[0].toUpperCase() : 'U';

    const names = userName.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return userName.charAt(0).toUpperCase();
  };

  const formatDisplayName = () => {
    if (userName) return userName;
    return userEmail ? userEmail.split('@')[0] : 'User';
  };

  return (
    <div
      className={`flex flex-col h-screen bg-[#1a1f2e] text-white transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      <div className="flex flex-col flex-grow p-4 space-y-2">
        {menuItems
          .filter(item => hasAccess(item.requiredRole) && (item.shouldShow !== false))
          .map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'
                } px-3 py-3 rounded-lg transition-colors ${currentView === item.view
                  ? 'bg-blue-600 shadow-lg'
                  : 'hover:bg-blue-600/50'
                }`}
            >
              {item.icon}
              {!isCollapsed && (
                <>
                  <span className="font-medium">{item.label}</span>
                  {item.badge}
                </>
              )}
            </button>
          ))}
      </div>

      <div className="relative mx-4 mb-4">
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={`flex items-center w-full px-3 py-3 rounded-lg hover:bg-blue-600/50 transition-colors ${isCollapsed ? 'justify-center' : 'justify-between'
            }`}
        >
          {isCollapsed ? (
            <HiOutlineUser className="w-6 h-6" />
          ) : (
            <>
              <span className="font-medium">{formatDisplayName()}</span>
              <HiChevronUp
                className={`transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </button>

        {showProfileMenu && (
          <div className="absolute bottom-full left-0 w-full mb-1 bg-[#2a304a] rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center w-full px-3 py-3 hover:bg-blue-600/50 transition-colors gap-3"
            >
              <HiOutlineLogout />
              <span className="font-medium">Sign Out</span>
              {isSigningOut && (
                <div className="animate-spin ml-2 rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SideMenu;