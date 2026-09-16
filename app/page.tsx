'use client';

import dynamic from 'next/dynamic';

const AdminConsole = dynamic(() => import('@/components/admin/AdminConsole'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#070b16] flex items-center justify-center text-slate-400">
      <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
    </div>
  ),
});

export default function HomePage() {
  return <AdminConsole />;
}

