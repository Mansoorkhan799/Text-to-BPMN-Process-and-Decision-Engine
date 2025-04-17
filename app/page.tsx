'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SideMenu from './components/SideMenu';
import UserHeader from './components/UserHeader';
import Profile from './components/Profile';
import ProfileFormWrapper from './components/ProfileFormWrapper';
import toast from 'react-hot-toast';
import { User } from './types';
import { RoleBasedUi, ROLES } from './utils/permissions';

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
              setCurrentView('dashboard');
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
              <div className="h-full flex items-center justify-center">
                <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 text-center">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">User Management</h2>
                  <p className="text-xl text-gray-600 mb-4">
                    This feature is coming soon.
                  </p>
                  <p className="text-gray-500">
                    The user management interface will allow administrators to view, add, edit, and manage users.
                  </p>
                </div>
              </div>
            </RoleBasedUi>
          </div>
        )}

        {currentView === 'profile' && (
          <div className="flex-1 overflow-auto px-4 py-4">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold mb-4">My Profile</h1>

              {isEditingProfile ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>
                  <ProfileFormWrapper
                    initialData={user || undefined}
                    onCancel={handleCancelEditProfile}
                    onSuccess={(updatedUser) => {
                      setUser(updatedUser);
                      setIsEditingProfile(false);
                    }}
                    showToast={true}
                  />
                </div>
              ) : (
                <Profile
                  showEditButton={true}
                  onEditClick={handleEditProfile}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 