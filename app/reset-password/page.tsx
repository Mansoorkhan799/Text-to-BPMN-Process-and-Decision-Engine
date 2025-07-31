'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { PasswordInput } from '@/app/components/ui/PasswordInput';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    // Get token and email from URL parameters
    const tokenParam = searchParams?.get('token');
    const emailParam = searchParams?.get('email');
    
    if (tokenParam) setToken(tokenParam);
    if (emailParam) setEmail(emailParam);
    
    // If token or email is missing, redirect to forgot password
    if (!tokenParam || !emailParam) {
      toast.error('Invalid or expired password reset link');
      setTokenValid(false);
      setTimeout(() => {
        router.push('/forgot-password');
      }, 2000);
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password has been reset successfully!');
        setResetComplete(true);
      } else {
        // Handle specific error cases
        if (data.error === 'New password cannot be the same as your old password') {
          toast.error('New password cannot be the same as your old password. Please choose a different password.');
        } else if (data.error === 'Invalid or expired reset token') {
          toast.error('Your password reset link has expired or is invalid. Please request a new one.');
          setTokenValid(false);
          setTimeout(() => {
            router.push('/forgot-password');
          }, 2000);
        } else {
          toast.error(data.error || 'Failed to reset password');
        }
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('An error occurred while resetting your password');
    } finally {
      setIsLoading(false);
    }
  };

  // If token is invalid, show simplified view
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card title="Invalid Reset Link">
          <div className="space-y-6">
            <p className="text-center text-gray-600">
              Your password reset link is invalid or has expired.
            </p>
            <p className="text-center text-gray-600">
              Redirecting you to request a new one...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card title={resetComplete ? "Password Reset Complete" : "Reset Your Password"}>
        {resetComplete ? (
          <div className="space-y-6">
            <p className="text-center text-gray-600">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <Button
              onClick={() => router.push('/signin')}
              fullWidth
            >
              Go to Sign In
            </Button>
          </div>
        ) : (
          <>
            <p className="text-center text-gray-600 mb-6">
              Please enter your new password below.
            </p>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <PasswordInput
                id="password"
                name="password"
                required
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                required
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              
              <Button
                type="submit"
                isLoading={isLoading}
                fullWidth
              >
                Reset Password
              </Button>
            </form>
          </>
        )}

        {!resetComplete && (
          <div className="text-center mt-6 relative z-10">
            <Link href="/signin" className="text-indigo-600 hover:text-indigo-500 inline-block">
              Back to Sign In
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card title="Loading...">
          <div className="space-y-6">
            <p className="text-center text-gray-600">
              Loading reset password form...
            </p>
          </div>
        </Card>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
} 