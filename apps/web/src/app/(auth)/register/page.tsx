'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import api from '@/lib/axios';
import { API_ROUTES } from '@/lib/config';
import Link from 'next/link';
import { Github, Chrome, Loader2, Sparkles } from 'lucide-react';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STUDENT', 'TEACHER']),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema as any),
    defaultValues: {
      role: 'STUDENT',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(API_ROUTES.REGISTER, data);
      login(res.data.accessToken, res.data.refreshToken);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    window.location.href = provider === 'google' ? API_ROUTES.OAUTH_GOOGLE : API_ROUTES.OAUTH_GITHUB;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4 py-12">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[150px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel p-8 rounded-lg relative z-10"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-sans">StudySync AI</h1>
          <p className="text-muted-foreground text-sm mt-1">Create your account to start learning</p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">First Name</label>
              <input
                type="text"
                {...register('firstName')}
                className="w-full px-4 py-2.5 rounded-md border border-border bg-card/50 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50 transition-colors"
                placeholder="Jane"
              />
              {errors.firstName && <p className="text-destructive text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Last Name</label>
              <input
                type="text"
                {...register('lastName')}
                className="w-full px-4 py-2.5 rounded-md border border-border bg-card/50 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50 transition-colors"
                placeholder="Doe"
              />
              {errors.lastName && <p className="text-destructive text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address</label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-4 py-2.5 rounded-md border border-border bg-card/50 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50 transition-colors"
              placeholder="jane@example.com"
            />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Password</label>
            <input
              type="password"
              {...register('password')}
              className="w-full px-4 py-2.5 rounded-md border border-border bg-card/50 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/50 transition-colors"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 font-sans">I am a...</label>
            <select
              {...register('role')}
              className="w-full px-4 py-2.5 rounded-md border border-border bg-card/50 focus:outline-none focus:border-primary text-foreground transition-colors"
            >
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
            </select>
            {errors.role && <p className="text-destructive text-xs mt-1">{errors.role.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-md font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_14px_rgba(139,92,246,0.2)] hover:shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or sign up with</span></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleOAuth('google')}
            className="flex items-center justify-center gap-2 border border-border bg-card/30 hover:bg-card/50 py-2 rounded-md font-semibold text-sm cursor-pointer transition-colors"
          >
            <Chrome className="h-4 w-4" />
            Google
          </button>
          <button
            onClick={() => handleOAuth('github')}
            className="flex items-center justify-center gap-2 border border-border bg-card/30 hover:bg-card/50 py-2 rounded-md font-semibold text-sm cursor-pointer transition-colors"
          >
            <Github className="h-4 w-4" />
            GitHub
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">Sign in instead</Link>
        </p>
      </motion.div>
    </div>
  );
}
