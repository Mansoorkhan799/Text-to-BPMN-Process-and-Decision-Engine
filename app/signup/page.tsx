'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Divider } from '@/app/components/ui/Divider';
import { PasswordInput } from '@/app/components/ui/PasswordInput';

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSendOTP = async () => {
    // Validate password length
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('OTP sent successfully!');
        setShowOTPInput(true);
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error('Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email, 
          otp,
          name: formData.name,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Account created successfully!');
        router.push('/');
      } else {
        toast.error(data.error || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      toast.error('Failed to verify OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card title="Create your account">
        <form className="mt-8 space-y-6" onSubmit={(e) => {
          e.preventDefault();
          if (showOTPInput) {
            handleVerifyOTP();
          } else {
            handleSendOTP();
          }
        }}>
          <Input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <PasswordInput
            id="password"
            name="password"
            required
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            required
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />
          <p className="text-xs text-gray-500 -mt-1">Password must be at least 8 characters long</p>

          {showOTPInput && (
            <Input
              id="otp"
              name="otp"
              type="text"
              required
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />
          )}

          <Button
            type="submit"
            isLoading={isLoading || isVerifying}
            fullWidth
          >
            {isLoading ? 'Creating account...' : isVerifying ? 'Verifying OTP...' : showOTPInput ? 'Verify OTP' : 'Create Account'}
          </Button>
        </form>

        <div className="text-center">
          <Link href="/signin" className="text-indigo-600 hover:text-indigo-500">
            Already have an account? Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
} 