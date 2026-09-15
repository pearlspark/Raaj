'use client';

import { EduAppView } from '@/components/player/EduAppView';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function GenericEduPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Gateway Console</span>
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <Shield className="w-3.5 h-3.5" /> Gateway Enforced
          </span>
        </div>
        <EduAppView />
      </div>
    </div>
  );
}
