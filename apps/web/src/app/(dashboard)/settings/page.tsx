'use client';

import { useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SettingsRedirectPage() {
  const router = useRouter();

  useLayoutEffect(() => {
    router.replace('/profile?tab=identity');
  }, [router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <span className="text-xs font-semibold uppercase tracking-wider">Redirecting to Settings...</span>
      </div>
    </div>
  );
}
