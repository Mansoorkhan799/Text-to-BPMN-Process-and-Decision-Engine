'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { User } from '@/app/types';
import ProfilePictureUpload from './ProfilePictureUpload';

interface ProfileFormProps {
  initialData?: User;
  onSubmit?: (data: Partial<User>) => Promise<void>;
  showCancelButton?: boolean;
  onCancel?: () => void;
  showSuccessToast?: boolean;
}

export default function ProfileForm({ 
  initialData, 
  onSubmit,
  showCancelButton = true,
  onCancel,
  showSuccessToast = true
}: ProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [selectedPicture, setSelectedPicture] = useState<File | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    phoneNumber: '',
    address: '',
    state: '',
    country: '',
    zipCode: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        phoneNumber: initialData.phoneNumber || '',
        address: initialData.address || '',
        state: initialData.state || '',
        country: initialData.country || '',
        zipCode: initialData.zipCode || '',
      });
    }
  }, [initialData]);

  const handlePictureChange = (file: File) => {
    setSelectedPicture(file);
  };

  const uploadProfilePicture = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch('/api/user/profile-picture', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        return data.profilePicture;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Upload profile picture first if selected
      let profilePictureUrl: string | null = null;
      if (selectedPicture) {
        setIsUploadingPicture(true);
        try {
          profilePictureUrl = await uploadProfilePicture(selectedPicture);
          toast.success('Profile picture uploaded successfully');
        } catch (error: any) {
          toast.error(`Failed to upload profile picture: ${error.message}`);
          setIsLoading(false);
          setIsUploadingPicture(false);
          return;
        } finally {
          setIsUploadingPicture(false);
        }
      }

      // Prepare complete profile data including profile picture
      const completeProfileData = {
        ...formData,
        profilePicture: profilePictureUrl || initialData?.profilePicture || ''
      };

      // Update profile information with profile picture
      if (onSubmit) {
        await onSubmit(completeProfileData);
        if (showSuccessToast) {
          toast.success('Profile updated successfully');
        }
      } else {
        console.log('No onSubmit handler provided');
      }

      // Trigger profile update event to refresh the profile display
      window.dispatchEvent(new CustomEvent('profile-updated', {
        detail: {
          user: completeProfileData
        }
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Picture Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Picture</h3>
        <ProfilePictureUpload
          currentPicture={initialData?.profilePicture}
          onPictureChange={handlePictureChange}
          disabled={isLoading || isUploadingPicture}
        />
      </div>

      {/* Profile Information Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              disabled
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed text-sm"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-0.5">Email cannot be changed</p>
          </div>
          
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="e.g. (123) 456-7890"
            />
          </div>
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="md:col-span-3">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. 123 Main St, Apt 4B"
            />
          </div>
          
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State / Province
            </label>
            <input
              id="state"
              name="state"
              type="text"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>
          
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              id="country"
              name="country"
              type="text"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
          
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
              Zip / Postal Code
            </label>
            <input
              id="zipCode"
              name="zipCode"
              type="text"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-2">
        {showCancelButton && (
          <button
            type="button"
            onClick={handleCancel}
            className="mr-2 py-1.5 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || isUploadingPicture}
          className="py-1.5 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading || isUploadingPicture ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
} 