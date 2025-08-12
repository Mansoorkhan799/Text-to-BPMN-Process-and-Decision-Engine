'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ProfileForm from '@/app/components/ProfileForm';
import { User } from '@/app/types';

export default function EditProfilePage() {
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
          } else {
            router.push('/signin');
          }
        } else {
          router.push('/signin');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/signin');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleProfileUpdate = async (formData: Partial<User>) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update local user state
        setUser(prevUser => prevUser ? { ...prevUser, ...data.user } : null);
        
        // Trigger profile update event
        window.dispatchEvent(new CustomEvent('profile-updated', {
          detail: { user: data.user }
        }));
        
        toast.success('Profile updated successfully');
        
        // Redirect back to profile or dashboard
        router.push('/');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="mt-2 text-gray-600">
            Update your profile information and profile picture
          </p>
        </div>

        {/* Profile Form */}
        <ProfileForm
          initialData={user}
          onSubmit={handleProfileUpdate}
          onCancel={handleCancel}
          showCancelButton={true}
          showSuccessToast={false}
        />
      </div>
    </div>
  );
}
