'use client';

import { useSyncExternalStore } from 'react';
import AdminConsole from '@/components/admin/AdminConsole';

const emptySubscribe = () => () => {};
function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function HomePage() {
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#070b16] flex items-center justify-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <AdminConsole />;
}
