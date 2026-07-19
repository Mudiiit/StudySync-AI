'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/axios';
import { useRouter, usePathname } from 'next/navigation';
import { API_ROUTES, APP_ROUTES } from '@/lib/config';

interface User {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    timezone: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  checkUserSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkUserSession = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      console.log('[AuthProvider] checkUserSession: auth/me request');
      const res = await api.get(API_ROUTES.ME);
      console.log('[AuthProvider] checkUserSession: auth/me success. Email:', res.data.email);
      setUser(res.data);
    } catch (err: any) {
      console.error('[AuthProvider] checkUserSession: auth/me failure:', err.message);
      // Rule 5: Only wipe tokens/session if it is a genuine auth error (401 or 403)
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        console.warn('[AuthProvider] checkUserSession: Invalid session tokens detected. Wiping credentials.');
        setUser(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Rule 8: Prevent duplicate startup session check if we land directly on callback page
    if (typeof window !== 'undefined' && window.location.pathname === APP_ROUTES.CALLBACK) {
      console.log('[AuthProvider] Mount check: Callback page detected. Skipping duplicate startup session request.');
      return;
    }
    checkUserSession();
  }, []);

  const login = async (accessToken: string, refreshToken: string): Promise<void> => {
    console.log('[AuthProvider] login: tokens stored');
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setLoading(true);
    
    try {
      console.log('[AuthProvider] login: auth/me request');
      const res = await api.get(API_ROUTES.ME);
      console.log('[AuthProvider] login: auth/me success. Email:', res.data.email);
      setUser(res.data);
    } catch (err: any) {
      console.error('[AuthProvider] login: auth/me failure:', err.message);
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('refreshToken');
    if (token) {
      try {
        await api.post(API_ROUTES.LOGOUT, { refreshToken: token });
      } catch (e) {
        // Ignored
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    router.push(APP_ROUTES.LOGIN);
  };

  useEffect(() => {
    const publicPaths: string[] = [APP_ROUTES.LOGIN, APP_ROUTES.REGISTER, APP_ROUTES.CALLBACK, '/'];
    const isPublic = publicPaths.includes(pathname);
    if (!loading) {
      if (!user && !isPublic) {
        console.log('[AuthProvider] Route Guard: Redirecting unauthenticated user on private route to login.');
        router.push(APP_ROUTES.LOGIN);
      } else if (user && (pathname === APP_ROUTES.LOGIN || pathname === APP_ROUTES.REGISTER)) {
        console.log('[AuthProvider] Route Guard: Redirecting authenticated user on auth route to dashboard.');
        router.push(APP_ROUTES.DASHBOARD);
      }
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkUserSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;
