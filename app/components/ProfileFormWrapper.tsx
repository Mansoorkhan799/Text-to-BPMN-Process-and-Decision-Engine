'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ProfileForm from './ProfileForm';
import { User } from '@/app/types';

interface ProfileFormWrapperProps {
  initialData?: User;
  onCancel?: () => void;
  onSuccess?: (updatedUser: User) => void;
  redirectPath?: string;
  showToast?: boolean;
}

export default function ProfileFormWrapper({
  initialData,
  onCancel,
  onSuccess,
  redirectPath,
  showToast = false,
}: ProfileFormWrapperProps) {
  const router = useRouter();

  const handleSubmit = async (formData: Partial<User>) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const data = await response.json();
      
      // Dispatch custom event with the updated user data
      const event = new CustomEvent('profile-updated', { 
        detail: { user: data.user } 
      });
      window.dispatchEvent(event);

      // Show toast only if requested
      if (showToast) {
        toast.success('Profile updated successfully');
      }

      // Call the onSuccess handler if provided
      if (onSuccess && data.user) {
        onSuccess(data.user);
      }

      // Redirect if a path is provided
      if (redirectPath) {
        router.push(redirectPath);
      }

      return data.user;
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
      throw error;
    }
  };

  return (
    <ProfileForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      // Don't show success toast in the form since we're handling it here
      showSuccessToast={false}
    />
  );
} 