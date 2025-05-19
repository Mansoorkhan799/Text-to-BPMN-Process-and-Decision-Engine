'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { GoogleSignInButton } from '@/app/components/ui/GoogleSignInButton';
import { Divider } from '@/app/components/ui/Divider';
import { PasswordInput } from '@/app/components/ui/PasswordInput';
import { AuthLayout } from '@/app/components/ui/AuthLayout';
import { motion } from 'framer-motion';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function SignIn() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    // Check for redirect in URL
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      if (redirect) {
        setRedirectPath(redirect);
      }
    }
  }, []);

  // Clear specific field error when user types
  const clearError = (field: keyof FormErrors) => {
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: undefined });
    }
  };

  // Form validation function
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

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

        // Set the view based on redirect path or default to dashboard
        if (redirectPath) {
          sessionStorage.setItem('currentView', redirectPath);
        } else {
          sessionStorage.setItem('currentView', 'dashboard');
        }

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
    <AuthLayout
      title=""
      subtitle=""
      showFeatures={true}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative bg-white p-6 rounded-xl shadow-sm border border-gray-100"
      >
        {/* Decorative elements */}
        <div className="absolute -top-2 -right-2">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full opacity-10"></div>
        </div>
        <div className="absolute -bottom-3 -left-3">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-400 to-blue-600 rounded-full opacity-10"></div>
        </div>

        <div className="mb-6 relative">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-2xl font-bold text-gray-900 mb-1 flex items-center"
          >
            Sign in
            <div className="ml-2 w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-gray-600 text-sm"
          >
            Enter your credentials to access your account
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <GoogleSignInButton />
        </motion.div>

        <div className="my-6">
          <Divider text="Or continue with email" />
        </div>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="space-y-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                clearError('email');
              }}
              error={formErrors.email}
              className="focus:ring-indigo-500 focus:border-indigo-500"
            />

            <div className="space-y-2">
              <PasswordInput
                id="password"
                name="password"
                required
                placeholder="Password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  clearError('password');
                }}
                error={formErrors.password}
              />
              <div className="text-right relative z-10">
                <Link href="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500 inline-block transition-all duration-200 hover:translate-x-1">
                  Forgot password?
                </Link>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            fullWidth
            className="bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 transition-all duration-200 py-2.5 mt-2"
          >
            Sign in
          </Button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-6 text-center"
        >
          <Link
            href="/signup"
            className="text-indigo-600 hover:text-indigo-500 font-medium text-sm flex items-center justify-center transition-all duration-200 hover:translate-y-[-2px]"
          >
            Don't have an account?
            <span className="ml-1 font-bold">Sign up</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </Link>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
} 