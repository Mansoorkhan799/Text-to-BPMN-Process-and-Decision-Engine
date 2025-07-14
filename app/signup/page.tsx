'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Divider } from '@/app/components/ui/Divider';
import { PasswordInput } from '@/app/components/ui/PasswordInput';
import { AuthLayout } from '@/app/components/ui/AuthLayout';
import { motion } from 'framer-motion';

// Form error interface
interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user', // Default role
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [formHeight, setFormHeight] = useState(0);

  // Record the form height before OTP is shown
  useEffect(() => {
    if (!showOTPInput) {
      const form = document.getElementById('signup-form');
      if (form) {
        setFormHeight(form.clientHeight);
      }
    }
  }, [showOTPInput]);

  // Form validation function
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (!/^[A-Za-z\s]+$/.test(formData.name.trim())) {
      errors.name = 'Name can only contain letters and spaces';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      errors.password = 'Password must include at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = 'Password must include at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must include at least one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Clear specific field error when user types
  const clearError = (field: keyof FormErrors) => {
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: undefined });
    }
  };

  const handleSendOTP = async () => {
    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

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
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    // Validate OTP input
    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

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
          password: formData.password,
          role: formData.role
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

  // BPMN diagram content for illustration
  const bpmnIllustration = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto px-6 py-5 bg-white/20 rounded-xl backdrop-blur-md border border-white/30 shadow-xl"
    >
      <h3 className="text-center text-xl font-semibold text-white mb-4">
        Text to BPMN Conversion
      </h3>
      <div className="relative h-[160px]">
        {/* Start node */}
        <motion.div
          className="absolute left-1 top-[70px] w-12 h-12 rounded-full bg-pink-200 border-2 border-pink-500 flex items-center justify-center shadow-md"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="w-3 h-3 rounded-full bg-pink-600"></div>
        </motion.div>

        {/* Text input */}
        <motion.div
          className="absolute left-[70px] top-[12px] w-[130px] h-[35px] text-sm bg-blue-100 border border-blue-300 rounded-md px-3 py-1.5 flex items-center justify-center font-medium text-blue-900 shadow-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          "Start process"
        </motion.div>

        {/* Arrow from text to activity */}
        <motion.div
          className="absolute left-[130px] top-[70px] w-[40px] h-[3px] bg-gray-600"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <div className="absolute right-0 w-3 h-3 bg-gray-600" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}></div>
        </motion.div>

        {/* Activity node */}
        <motion.div
          className="absolute left-[180px] top-[55px] w-[100px] h-[30px] rounded-md bg-yellow-200 border-2 border-yellow-400 flex items-center justify-center text-sm font-medium text-yellow-900 shadow-md"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          Activity A
        </motion.div>

        {/* Gateway */}
        <motion.div
          className="absolute left-[310px] top-[52px] w-[35px] h-[35px] bg-green-200 border-2 border-green-500 rotate-45 shadow-md"
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 1, rotate: 45 }}
          transition={{ delay: 1.0, duration: 0.4 }}
        ></motion.div>

        {/* Arrow from activity to gateway */}
        <motion.div
          className="absolute left-[290px] top-[70px] w-[30px] h-[3px] bg-gray-600"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 0.2 }}
        >
          <div className="absolute right-0 w-3 h-3 bg-gray-600" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}></div>
        </motion.div>

        {/* Arrow from gateway to end */}
        <motion.div
          className="absolute left-[355px] top-[70px] w-[35px] h-[3px] bg-gray-600"
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.2, duration: 0.2 }}
        >
          <div className="absolute right-0 w-3 h-3 bg-gray-600" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}></div>
        </motion.div>

        {/* End node */}
        <motion.div
          className="absolute left-[400px] top-[52px] w-[35px] h-[35px] rounded-full bg-pink-200 border-2 border-pink-500 flex items-center justify-center shadow-md"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.4, duration: 0.3 }}
        >
          <div className="w-[18px] h-[18px] rounded-full bg-pink-200 border-2 border-pink-600"></div>
        </motion.div>

        {/* Labels under elements */}
        <motion.div
          className="absolute left-[5px] top-[120px] text-xs font-medium text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.3 }}
        >
          Start
        </motion.div>

        <motion.div
          className="absolute left-[200px] top-[100px] text-xs font-medium text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.3 }}
        >
          Task
        </motion.div>

        <motion.div
          className="absolute left-[300px] top-[100px] text-xs font-medium text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.3 }}
        >
          Gateway
        </motion.div>

        <motion.div
          className="absolute left-[400px] top-[100px] text-xs font-medium text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.3 }}
        >
          End
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <AuthLayout
      title=""
      subtitle=""
      bpmnIllustration={bpmnIllustration}
      showFeatures={false}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        style={{
          minHeight: showOTPInput && formHeight ? `${formHeight}px` : 'auto'
        }}
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
            Create your account
            <div className="ml-2 w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-gray-600 text-sm"
          >
            Fill in your details to get started
          </motion.p>
        </div>

        <motion.form
          id="signup-form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (showOTPInput) {
              handleVerifyOTP();
            } else {
              handleSendOTP();
            }
          }}
        >
          {!showOTPInput ? (
            <>
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    clearError('name');
                  }}
                  error={formErrors.name}
                  className="focus:ring-indigo-500 focus:border-indigo-500"
                />

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

                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    clearError('confirmPassword');
                  }}
                  error={formErrors.confirmPassword}
                />
                <motion.p
                  className="text-xs text-gray-500 -mt-1 pl-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                >
                  <span className="inline-block mr-1">
                    <svg className="w-3 h-3 inline text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </span>
                  Password must be at least 8 characters and include uppercase, lowercase, and numbers
                </motion.p>

                <motion.div
                  className="mt-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Select your role
                  </label>
                  <div className="relative">
                    <select
                      id="role"
                      name="role"
                      className="appearance-none w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="supervisor">Supervisor</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              >
                <Button
                  type="submit"
                  isLoading={isLoading}
                  fullWidth
                  className="mt-6 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 transition-all duration-200 py-2.5"
                >
                  Create Account
                </Button>
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="mb-4 flex flex-col items-center">
                <motion.div
                  className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                >
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </motion.div>
                <motion.h3
                  className="text-lg font-semibold text-gray-900 mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  Verify your email
                </motion.h3>
                <motion.p
                  className="text-sm text-gray-600 text-center mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  We've sent a verification code to <span className="font-medium">{formData.email}</span>
                </motion.p>
              </div>

              <motion.div
                className="w-full mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter verification code
                </label>
                <div className="flex space-x-2 justify-center">
                  {[...Array(6)].map((_, index) => (
                    <motion.input
                      key={index}
                      type="text"
                      maxLength={1}
                      className="w-10 h-12 text-center text-lg font-bold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={otp[index] || ''}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.5 + (index * 0.1) }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          const newOtp = otp.split('');
                          newOtp[index] = val;
                          setOtp(newOtp.join(''));

                          // Auto-focus next input
                          if (val && index < 5) {
                            const nextInput = document.querySelector(`input[name=otp-${index + 1}]`);
                            if (nextInput) {
                              (nextInput as HTMLInputElement).focus();
                            }
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        // Handle backspace to focus previous input
                        if (e.key === 'Backspace' && !otp[index] && index > 0) {
                          const prevInput = document.querySelector(`input[name=otp-${index - 1}]`);
                          if (prevInput) {
                            (prevInput as HTMLInputElement).focus();
                          }
                        }
                      }}
                      name={`otp-${index}`}
                    />
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.8 }}
              >
                <Button
                  type="submit"
                  isLoading={isVerifying}
                  fullWidth
                  className="bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 transition-all duration-200 py-2.5"
                >
                  Verify & Create Account
                </Button>
              </motion.div>

              <motion.p
                className="mt-4 text-sm text-gray-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.9 }}
              >
                Didn't receive the code?{' '}
                <button
                  type="button"
                  className="text-indigo-600 font-medium hover:text-indigo-500"
                  onClick={handleSendOTP}
                  disabled={isLoading}
                >
                  Resend
                </button>
              </motion.p>
            </motion.div>
          )}
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="mt-6 text-center"
        >
          <Link
            href="/signin"
            className="text-indigo-600 hover:text-indigo-500 font-medium text-sm flex items-center justify-center transition-all duration-200 hover:translate-y-[-2px]"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Already have an account? Sign in
          </Link>
        </motion.div>
      </motion.div>
    </AuthLayout>
  );
} 