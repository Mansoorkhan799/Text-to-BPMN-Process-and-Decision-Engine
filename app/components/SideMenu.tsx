'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { IconType } from 'react-icons';
import { HiOutlineViewGrid, HiOutlineUsers, HiOutlineLogout } from 'react-icons/hi';
import { useState } from 'react';

interface SideMenuProps {
  isCollapsed?: boolean;
  onNavigate: (view: string) => void;
  currentView?: string;
}

const SideMenu: React.FC<SideMenuProps> = ({ isCollapsed = false, onNavigate, currentView = 'dashboard' }) => {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const menuItems = [
    {
      label: 'Dashboard',
      icon: <HiOutlineViewGrid className={`${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} />,
      onClick: () => onNavigate('dashboard'),
      view: 'dashboard'
    },
    {
      label: 'Users',
      icon: <HiOutlineUsers className={`${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} />,
      onClick: () => onNavigate('users'),
      view: 'users'
    },
  ];

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ redirect: true, callbackUrl: '/signin' });
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div
      className={`flex flex-col h-screen bg-[#1a1f2e] text-white transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex flex-col flex-grow p-4 space-y-2">
        {menuItems.map((item, index) => (
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
      
      <button
        onClick={handleSignOut}
        disabled={isSigningOut}
        className={`flex items-center mx-4 mb-4 px-3 py-3 rounded-lg hover:bg-blue-600/50 transition-colors disabled:opacity-50 ${
          isCollapsed ? 'justify-center' : 'gap-4'
        }`}
      >
        <HiOutlineLogout className={`${isCollapsed ? 'w-7 h-7' : 'w-6 h-6'}`} />
        {!isCollapsed && (
          <>
            <span className="font-medium">Sign Out</span>
            {isSigningOut && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            )}
          </>
        )}
      </button>
    </div>
  );
};

export default SideMenu; 