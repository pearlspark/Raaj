import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070b16] flex flex-col items-center justify-center p-6 text-center text-slate-100">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
        <span className="text-2xl font-mono text-cyan-400 font-bold">404</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Page Not Found</h1>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        The requested resource or endpoint could not be found.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium text-xs transition-colors"
      >
        Return to Gateway Console
      </Link>
    </div>
  );
}
