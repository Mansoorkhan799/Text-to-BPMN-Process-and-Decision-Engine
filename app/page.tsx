'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SideMenu from './components/SideMenu';
import Users from './components/Users';
import UserHeader from './components/UserHeader';
import Profile from './components/Profile';
import ProfileFormWrapper from './components/ProfileFormWrapper';
import Notifications from './components/Notifications';
import CombinedLatexEditor from './components/CombinedLatexEditor';
import toast from 'react-hot-toast';
import { User } from './types';
import { RoleBasedUi, ROLES } from './utils/permissions';
import dynamic from 'next/dynamic';
import AdminFileManagement from './components/AdminFileManagement';
import AIProcessGenerator from './components/AIProcessGenerator';
import SettingsView from './components/SettingsView';

// Import the BpmnEditor component dynamically to prevent SSR issues with browser APIs
const BpmnEditor = dynamic(() => import('./components/BpmnEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-2 text-gray-600">Loading BPMN Editor...</span>
    </div>
  ),
});

// Import the BpmnDashboard component
const BpmnDashboard = dynamic(() => import('./components/BpmnDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-2 text-gray-600">Loading BPMN Dashboard...</span>
    </div>
  ),
});

// Import the LaTeX Dashboard component
const LatexDashboard = dynamic(() => import('./components/LatexDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-2 text-gray-600">Loading LaTeX Dashboard...</span>
    </div>
  ),
});

export default function Home() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

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
      } else {
        // Default to dashboard if no view is saved
        setCurrentView('dashboard');
        sessionStorage.setItem('currentView', 'dashboard');
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
    // Check if user is authenticated and get user data
    if (mounted) {
      fetch('/api/auth/check', {
        credentials: 'include',
      }).then((res) => {
        if (!res.ok) {
          router.push('/signin');
        } else {
          return res.json();
        }
      })
        .then((data) => {
          if (data && data.authenticated && data.user) {
            setUser(data.user);
            // If a regular user tries to access the users page, redirect to dashboard
            if (data.user.role === 'user' && currentView === 'users') {
              setCurrentView('latex');
              toast.error('You do not have permission to access the Users page');
            }
          }
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
        });
    }
  }, [router, mounted, currentView]);

  const handleNavigation = (view: string) => {
    // Check if user has permission to access this view
    if (view === 'users' && user?.role === 'user') {
      toast.error('You do not have permission to access the Users page');
      return;
    }

    if (view === 'admin-file-management' && user?.role !== 'admin') {
      toast.error('You do not have permission to access this page');
      return;
    }

    // Redirect admin users trying to access notifications
    if (view === 'notifications' && user?.role === 'admin') {
      toast.error('Notifications are only available for users and supervisors');
      // We still allow the view to be set so the message is shown
    }

    setCurrentView(view);

    // Reset editing mode when switching views
    if (view === 'profile') {
      setIsEditingProfile(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <div className="w-64 bg-white border-r shrink-0"></div>
        <div className="flex-1 flex flex-col h-full">
          <div className="p-4 h-14"></div>
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
        userRole={user?.role || 'user'}
        userName={user?.name || ''}
        userEmail={user?.email || ''}
      />

      <div className="flex-1 flex flex-col h-full">
        <div className="flex items-center justify-between bg-white border-b">
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
          <UserHeader />
        </div>

        {currentView === 'latex' && (
          <main className="flex-1 w-full h-full overflow-hidden">
            <CombinedLatexEditor user={user} />
          </main>
        )}

        {currentView === 'dashboard' && (
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <BpmnDashboard user={user} />
                </div>
                <div>
                  <LatexDashboard user={user} />
                </div>
              </div>
            </div>
          </main>
        )}

        {currentView === 'ai-process-generator' && (
          <main className="flex-1 w-full h-full overflow-hidden">
            <AIProcessGenerator />
          </main>
        )}

        {currentView === 'bpmn' && (
          <main className="flex-1 w-full h-full overflow-hidden">
            <BpmnEditor user={user} />
          </main>
        )}

        {currentView === 'admin-file-management' && (
          <div className="flex-1 overflow-hidden">
            <AdminFileManagement userRole={user?.role} />
          </div>
        )}

        {currentView === 'users' && (
          <div className="flex-1 overflow-hidden">
            <RoleBasedUi
              userRole={user?.role || 'user'}
              requiredRole={ROLES.SUPERVISOR}
              fallback={
                <div className="h-full flex items-center justify-center">
                  <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
                    <p className="text-xl font-semibold text-red-600 mb-2">
                      Access Denied
                    </p>
                    <p className="text-gray-600">
                      You don't have permission to view this page.
                    </p>
                  </div>
                </div>
              }
            >
              <Users />
            </RoleBasedUi>
          </div>
        )}

        {currentView === 'notifications' && user?.role !== 'admin' && (
          <div className="flex-1 overflow-auto">
            <Notifications userRole={user?.role || 'user'} />
          </div>
        )}

        {currentView === 'notifications' && user?.role === 'admin' && (
          <div className="h-full flex items-center justify-center">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 max-w-md text-center">
              <p className="text-xl font-semibold text-red-600 mb-2">
                Feature Not Available
              </p>
              <p className="text-gray-600">
                Notifications are only available for users and supervisors.
              </p>
            </div>
          </div>
        )}

        {currentView === 'profile' && !isEditingProfile && (
          <div className="flex-1 overflow-auto">
            <Profile
              showEditButton={true}
              onEditClick={handleEditProfile}
            />
          </div>
        )}

        {currentView === 'profile' && isEditingProfile && (
          <div className="flex-1 overflow-auto">
            <ProfileFormWrapper
              initialData={user || undefined}
              onCancel={handleCancelEditProfile}
              onSuccess={(updatedUser) => {
                setIsEditingProfile(false);
                // Update user data with the returned user
                setUser(updatedUser);
              }}
              showToast={true}
            />
          </div>
        )}

        {currentView === 'settings' && (
          <div className="flex-1 overflow-auto">
            <SettingsView onNavigate={handleNavigation} />
          </div>
        )}
      </div>
    </div>
  );
} 