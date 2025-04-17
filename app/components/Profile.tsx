'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/app/types';

interface ProfileProps {
  showEditButton?: boolean;
  onEditClick?: () => void;
}

export default function Profile({ showEditButton = true, onEditClick }: ProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();

    // Handle profile update events
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.user) {
        setUser(customEvent.detail.user);
        setIsLoading(false);
      } else {
        fetchUserData();
      }
    };

    // Listen for profile updates
    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  const handleEditProfile = () => {
    if (onEditClick) {
      onEditClick();
    } else {
      router.push('/edit-profile');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading profile...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center h-full">User not found</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      {/* Profile Header with gradient background */}
      <div className="relative bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 h-32">
        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        {/* Profile avatar overlay */}
        <div className="absolute -bottom-10 left-8">
          <div className="h-20 w-20 rounded-full bg-white p-1.5 shadow-xl ring-2 ring-white">
            <div className="h-full w-full rounded-full bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center text-indigo-700 font-bold text-2xl uppercase shadow-inner">
              {user.name ? user.name.charAt(0) : user.email.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-14 pb-8 px-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{user.name || user.email.split('@')[0]}</h1>
            <p className="text-gray-500 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {user.email}
            </p>
          </div>
          {showEditButton && (
            <button
              onClick={handleEditProfile}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        <div className="mt-6 border-t border-gray-100 pt-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 transition-all duration-200 hover:bg-indigo-50 hover:shadow-md group">
              <p className="font-medium text-indigo-500 mb-1 group-hover:text-indigo-600">Name</p>
              <p className="text-gray-800 font-medium">{user.name || 'Not provided'}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 transition-all duration-200 hover:bg-indigo-50 hover:shadow-md group">
              <p className="font-medium text-indigo-500 mb-1 group-hover:text-indigo-600">Email</p>
              <p className="text-gray-800 font-medium truncate">{user.email}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 transition-all duration-200 hover:bg-indigo-50 hover:shadow-md group">
              <p className="font-medium text-indigo-500 mb-1 group-hover:text-indigo-600">Phone</p>
              <p className="text-gray-800 font-medium">{user.phoneNumber || 'Not provided'}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 transition-all duration-200 hover:bg-indigo-50 hover:shadow-md group">
              <p className="font-medium text-indigo-500 mb-1 group-hover:text-indigo-600">Address</p>
              <p className="text-gray-800 font-medium truncate">{user.address || 'Not provided'}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 transition-all duration-200 hover:bg-indigo-50 hover:shadow-md group">
              <p className="font-medium text-indigo-500 mb-1 group-hover:text-indigo-600">State</p>
              <p className="text-gray-800 font-medium">{user.state || 'Not provided'}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 transition-all duration-200 hover:bg-indigo-50 hover:shadow-md group">
              <p className="font-medium text-indigo-500 mb-1 group-hover:text-indigo-600">Country</p>
              <p className="text-gray-800 font-medium">{user.country || 'Not provided'}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 transition-all duration-200 hover:bg-indigo-50 hover:shadow-md group">
              <p className="font-medium text-indigo-500 mb-1 group-hover:text-indigo-600">Zip Code</p>
              <p className="text-gray-800 font-medium">{user.zipCode || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 