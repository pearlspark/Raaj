'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#070b16] flex flex-col items-center justify-center p-6 text-center text-slate-100">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
        <span className="text-2xl font-mono text-rose-400 font-bold">!</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Application Error</h1>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        An unexpected error occurred. Click below to retry.
      </p>
      <button
        onClick={() => reset()}
        className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium text-xs transition-colors cursor-pointer"
      >
        Try Again
      </button>
    </div>
  );
}
