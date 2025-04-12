'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SideMenu from './components/SideMenu';
import Users from './components/Users';

export default function Home() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  // Only access browser APIs after component has mounted
  useEffect(() => {
    // Check if this is the first time loading the page after sign-in
    const isFirstLogin = sessionStorage.getItem('isFirstLogin');
    
    if (isFirstLogin === 'true') {
      // If it's first login, set view to dashboard and clear the flag
      setCurrentView('dashboard');
      sessionStorage.setItem('currentView', 'dashboard');
      sessionStorage.removeItem('isFirstLogin');
    } else {
      // Otherwise, get the stored view from sessionStorage
      const savedView = sessionStorage.getItem('currentView');
      if (savedView) {
        setCurrentView(savedView);
      }
    }
    
    setMounted(true);
    setIsLoading(false);
  }, []);

  // Save current view to sessionStorage
  useEffect(() => {
    if (mounted) {
      sessionStorage.setItem('currentView', currentView);
    }
  }, [currentView, mounted]);

  useEffect(() => {
    // Check if user is authenticated
    if (mounted) {
      fetch('/api/auth/check', {
        credentials: 'include',
      }).then((res) => {
        if (!res.ok) {
          router.push('/signin');
        }
      });
    }
  }, [router, mounted]);

  const handleNavigation = (view: string) => {
    setCurrentView(view);
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <div className="w-64 bg-white border-r shrink-0"></div>
        <div className="flex-1 flex flex-col h-full">
          <div className="p-4 h-14"></div>
          <div className="flex-1 flex items-center justify-center">
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <SideMenu 
        isCollapsed={isCollapsed} 
        onNavigate={handleNavigation}
        currentView={currentView}
      />
      
      <div className="flex-1 flex flex-col h-full">
        <div className="p-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg
              className="w-6 h-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {currentView === 'dashboard' && (
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="h-full flex items-center justify-center">
              <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
                <p className="text-2xl font-semibold text-gray-600">
                  Welcome! You are successfully logged in.
                </p>
              </div>
            </div>
          </main>
        )}

        {currentView === 'users' && (
          <div className="flex-1 overflow-hidden">
            <Users />
          </div>
        )}
      </div>
    </div>
  );
} 
