import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'API Shield & Gateway',
  description: 'Production-grade API protection gateway, domain authorization firewall, real-time security monitor, and rate-limiting analytics platform.',
  openGraph: {
    title: 'API Shield & Gateway',
    description: 'Production-grade API protection gateway, domain authorization firewall, real-time security monitor, and rate-limiting analytics platform.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'API Shield & Gateway',
    description: 'Production-grade API protection gateway, domain authorization firewall, real-time security monitor, and rate-limiting analytics platform.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#070b16] text-slate-100 antialiased min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
