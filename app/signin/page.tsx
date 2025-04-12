'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { GoogleSignInButton } from '@/app/components/ui/GoogleSignInButton';
import { Divider } from '@/app/components/ui/Divider';
import { PasswordInput } from '@/app/components/ui/PasswordInput';

export default function SignIn() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        // Set the first login flag in sessionStorage
        sessionStorage.setItem('isFirstLogin', 'true');
        // Also set currentView to dashboard to ensure consistency
        sessionStorage.setItem('currentView', 'dashboard');
        
        toast.success('Login successful!');
        router.push('/');
        router.refresh();
      } else {
        toast.error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const response = await fetch('/api/auth/google-signin', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        sessionStorage.setItem('isFirstLogin', 'true');
        sessionStorage.setItem('currentView', 'dashboard');
        
        toast.success('Login successful!');
        router.push('/');
        router.refresh();
      } else {
        toast.error('Google sign-in failed');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error('An error occurred during Google sign-in');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card title="Sign in to your account">
        <GoogleSignInButton />
        
        <Divider text="Or continue with email" />

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          
          <div className="space-y-2">
            <PasswordInput
              id="password"
              name="password"
              required
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <div className="text-right relative z-10">
              <Link href="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500 inline-block">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            fullWidth
          >
            Sign in
          </Button>
        </form>

        <div className="text-center relative z-10">
          <Link href="/signup" className="text-indigo-600 hover:text-indigo-500 inline-block">
            Don't have an account? Sign up
          </Link>
        </div>
      </Card>
    </div>
  );
} 