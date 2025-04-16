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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Profile Header - decreased height */}
      <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 h-24">
        {/* Profile avatar overlay - adjusted position */}
        <div className="absolute -bottom-8 left-8">
          <div className="h-16 w-16 rounded-full bg-white p-1 shadow-lg">
            <div className="h-full w-full rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xl uppercase">
              {user.name ? user.name.charAt(0) : user.email.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Info - more compact */}
      <div className="pt-10 pb-6 px-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{user.name || user.email.split('@')[0]}</h1>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
          {showEditButton && (
            <button
              onClick={handleEditProfile}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition duration-200"
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="mt-4 border-t pt-4">
          <h2 className="text-base font-semibold mb-3 text-gray-800">Profile Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-sm">
            <div className="border border-gray-200 rounded-md p-2">
              <p className="font-medium text-gray-500">Name</p>
              <p className="text-gray-800">{user.name || 'Not provided'}</p>
            </div>
            <div className="border border-gray-200 rounded-md p-2">
              <p className="font-medium text-gray-500">Email</p>
              <p className="text-gray-800 truncate">{user.email}</p>
            </div>
            <div className="border border-gray-200 rounded-md p-2">
              <p className="font-medium text-gray-500">Phone</p>
              <p className="text-gray-800">{user.phoneNumber || 'Not provided'}</p>
            </div>
            <div className="border border-gray-200 rounded-md p-2">
              <p className="font-medium text-gray-500">Address</p>
              <p className="text-gray-800 truncate">{user.address || 'Not provided'}</p>
            </div>
            <div className="border border-gray-200 rounded-md p-2">
              <p className="font-medium text-gray-500">State</p>
              <p className="text-gray-800">{user.state || 'Not provided'}</p>
            </div>
            <div className="border border-gray-200 rounded-md p-2">
              <p className="font-medium text-gray-500">Country</p>
              <p className="text-gray-800">{user.country || 'Not provided'}</p>
            </div>
            <div className="border border-gray-200 rounded-md p-2">
              <p className="font-medium text-gray-500">Zip Code</p>
              <p className="text-gray-800">{user.zipCode || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 