'use client';

import { useRouter } from 'next/navigation';
import { IconType } from 'react-icons';
import { HiOutlineViewGrid, HiOutlineUsers, HiOutlineLogout, HiOutlineUser, HiChevronUp } from 'react-icons/hi';
import { useState } from 'react';
import { ROLES } from '../utils/permissions';

interface SideMenuProps {
  isCollapsed?: boolean;
  onNavigate: (view: string) => void;
  currentView?: string;
  userRole?: string;
  userName?: string;
  userEmail?: string;
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

  const menuItems = [
    {
      label: 'Dashboard',
      icon: <HiOutlineViewGrid className={`${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} />,
      onClick: () => onNavigate('dashboard'),
      view: 'dashboard',
      requiredRole: ROLES.USER // Everyone can access
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
      className={`flex flex-col h-screen bg-[#1a1f2e] text-white transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex flex-col flex-grow p-4 space-y-2">
        {menuItems
          .filter(item => hasAccess(item.requiredRole))
          .map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`flex items-center ${
              isCollapsed ? 'justify-center' : 'gap-4'
            } px-3 py-3 rounded-lg transition-colors ${
              currentView === item.view 
                ? 'bg-blue-600 shadow-lg' 
                : 'hover:bg-blue-600/50'
            }`}
          >
            {item.icon}
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </div>
      
      <div className="relative mx-4 mb-4">
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={`flex items-center w-full px-3 py-3 rounded-lg hover:bg-blue-600/50 transition-colors ${
            isCollapsed ? 'justify-center' : 'justify-between'
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