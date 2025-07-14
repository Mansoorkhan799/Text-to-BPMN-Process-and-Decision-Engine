'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Divider } from '@/app/components/ui/Divider';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password reset email sent! Please check your inbox.');
        setResetSent(true);
      } else {
        toast.error(data.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('An error occurred while processing your request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card title={resetSent ? "Email Sent" : "Reset Your Password"}>
        {resetSent ? (
          <div className="space-y-6">
            <p className="text-center text-gray-600">
              Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
            </p>
            <Button
              onClick={() => router.push('/signin')}
              fullWidth
            >
              Return to Sign In
            </Button>
          </div>
        ) : (
          <>
            <p className="text-center text-gray-600 mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              
              <Button
                type="submit"
                isLoading={isLoading}
                fullWidth
              >
                Send Reset Link
              </Button>
            </form>
            
            <div className="text-center mt-6 relative z-10">
              <Link href="/signin" className="text-indigo-600 hover:text-indigo-500 inline-block">
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
} 