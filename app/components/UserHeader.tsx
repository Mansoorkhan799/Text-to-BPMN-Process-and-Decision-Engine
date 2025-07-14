'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export default function UserHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    fetchUserData();
    
    // Handle profile update events with data
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.user) {
        setUser(customEvent.detail.user);
        setIsLoading(false);
      } else {
        // Fallback to fetching if event doesn't have user data
        fetchUserData();
      }
    };
    
    // Set up event listener for profile updates
    window.addEventListener('profile-updated', handleProfileUpdate);
    
    // Refresh user data every 5 minutes
    const intervalId = setInterval(fetchUserData, 5 * 60 * 1000);
    
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
      clearInterval(intervalId);
    };
  }, []);

  if (isLoading) {
    return <div className="h-14 flex items-center px-4"></div>;
  }
  
  // Function to properly capitalize names
  const formatName = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  // Extract initials for avatar
  const getInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return user.name.charAt(0).toUpperCase();
  };
  
  // Get role badge color
  const getRoleBadgeColor = () => {
    if (!user?.role) return 'bg-gray-100 text-gray-600';
    
    switch (user.role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-600';
      case 'supervisor':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-green-100 text-green-600';
    }
  };

  return (
    <div className="h-14 flex items-center justify-end px-4 border-b bg-white">
      {user && (
        <div className="flex items-center">
          <p className="text-base font-medium mr-2">
            {user.name ? formatName(user.name) : user.email.split('@')[0]}
          </p>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor()}`}>
            {user.role || 'user'}
          </span>
        </div>
      )}
    </div>
  );
} 