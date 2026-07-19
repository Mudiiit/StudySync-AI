import axios from 'axios';
import { API_BASE_URL, API_ROUTES, APP_ROUTES } from './config';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject active access token
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  console.log('[Axios Interceptor] Intercepting request. URL:', config.url, 'Has token:', !!token);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('[Axios Interceptor] Attached Bearer header to request.');
  }

  // Prevent browser caching of API requests
  if (config.method?.toLowerCase() === 'get') {
    // Add cache buster query parameter
    config.params = config.params || {};
    config.params['_t'] = Date.now();
  }

  return config;
});

// Global flags and queue to manage concurrent token refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle auto-refresh on 401 Unauthorized with request queuing
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 and we haven't retried yet
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request until the current token refresh finishes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Trigger token refresh call (use direct axios to prevent infinite interceptor loops)
        const res = await axios.post(`${API_BASE_URL}${API_ROUTES.REFRESH}`, { refreshToken }, { withCredentials: true });
        const { accessToken, refreshToken: newRefreshToken } = res.data;

        // Store new tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Update authorization header on the original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        processQueue(null, accessToken);
        isRefreshing = false;

        // Re-execute original request
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;

        // Clear tokens on verification failure (forces logout state)
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          // Avoid loop redirection if the user is already on auth pages
          if (currentPath !== APP_ROUTES.LOGIN && currentPath !== APP_ROUTES.REGISTER && currentPath !== APP_ROUTES.CALLBACK) {
            window.location.href = `${APP_ROUTES.LOGIN}?error=session_expired`;
          }
        }
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);


export default api;
