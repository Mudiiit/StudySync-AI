/**
 * Centralized API and App Configuration
 */

// Base API URL from environment variables
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Base Frontend URL
export const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Backend Endpoints
export const API_ROUTES = {
  LOGIN: `/auth/login`,
  REGISTER: `/auth/register`,
  LOGOUT: `/auth/logout`,
  REFRESH: `/auth/refresh`,
  ME: `/auth/me`,
  OAUTH_GOOGLE: `${API_BASE_URL}/auth/oauth/google`,
  OAUTH_GITHUB: `${API_BASE_URL}/auth/oauth/github`,
} as const;

// Frontend Routes
export const APP_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  CALLBACK: '/auth/callback',
} as const;
