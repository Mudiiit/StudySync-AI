'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Loader2, XCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { APP_ROUTES } from '@/lib/config';

function CallbackHandler() {
  const { login, user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  
  const processedRef = React.useRef(false);

  useEffect(() => {
    console.log('[Auth Callback] callback started');

    if (user) {
      console.log('[Auth Callback] User already has an active session. Redirecting to dashboard...');
      console.log('[Auth Callback] router.push called');
      router.push(APP_ROUTES.DASHBOARD);
      console.log('[Auth Callback] dashboard navigation complete');
      return;
    }

    if (processedRef.current) {
      console.log('[Auth Callback] Already processing authorization. Skipping duplicate hook execution.');
      return;
    }

    // 1. Check for explicit OAuth error callback parameters
    const err = searchParams.get('error');
    const errDesc = searchParams.get('error_description');

    if (err) {
      console.error('[Auth Callback] error handler executed: OAuth callback returned error:', err, errDesc);
      processedRef.current = true;
      setIsProcessing(false);
      if (err === 'access_denied') {
        setErrorTitle('Access Denied');
        setErrorMessage('The authorization request was cancelled or denied.');
      } else {
        setErrorTitle('Authentication Failed');
        setErrorMessage(errDesc || 'An error occurred during the OAuth authentication flow.');
      }
      return;
    }

    // 2. Read tokens
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
      // If search params are empty (e.g. because history.replaceState ran), but we are still loading,
      // just wait for the login promise to finish or the initial check to complete.
      return;
    }

    console.log('[Auth Callback] tokens received');
    processedRef.current = true;

    const handleLoginFlow = async () => {
      try {
        console.log('[Auth Callback] tokens stored');
        
        // 3. Wiping query parameters from browser URL bar immediately to prevent token leakage in history/XSS
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // 4. Authenticate (triggers auth/me request in AuthProvider)
        await login(accessToken, refreshToken);
        
        console.log('[Auth Callback] router.push called');
        router.push(APP_ROUTES.DASHBOARD);
        console.log('[Auth Callback] dashboard navigation complete');
        return; // Guard: return immediately after router.push so no later code executes
      } catch (e: any) {
        console.error('[Auth Callback] error handler executed: Error handling callback authorization:', e);
        setIsProcessing(false);
        setErrorTitle('Authorization Error');
        setErrorMessage(e?.message || 'Failed to complete authorization session.');
      }
    };

    handleLoginFlow();
  }, [searchParams, login, router, user]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 font-sans p-6">
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute w-16 h-16 rounded-full border-4 border-violet-500/20 animate-pulse"></div>
          <Loader2 className="h-10 w-10 animate-spin text-violet-500 relative z-10" />
        </div>
        <h2 className="text-xl font-semibold mb-2 tracking-tight">Completing Authorization</h2>
        <p className="text-zinc-400 text-sm max-w-xs text-center leading-relaxed">
          Establishing your secure learning workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 font-sans p-6">
      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 to-rose-500"></div>
        
        <div className="flex items-center justify-center mb-6">
          <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20 text-red-500">
            <ShieldAlert className="h-8 w-8" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center tracking-tight mb-2 text-red-500">{errorTitle}</h2>
        
        <p className="text-zinc-300 text-center text-sm leading-relaxed mb-8">
          {errorMessage}
        </p>

        <button
          onClick={() => router.push(APP_ROUTES.LOGIN)}
          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-800 text-zinc-200 text-sm font-medium rounded-xl border border-zinc-700/50 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 font-sans p-6">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500 mb-4" />
        <p className="text-zinc-400 text-sm">Initializing callback page...</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
