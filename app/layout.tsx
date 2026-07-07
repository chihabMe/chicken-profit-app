import '../src/index.css';
import '../src/App.css';
import { ReactNode } from 'react';
import { Providers } from './providers';
import { AuthGuard } from '../components/AuthGuard';
import { Header } from '../components/Header';
import { Toaster } from "@/components/ui/sonner";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: 'Poultry Farm Pro',
  description: 'Advanced metrics, break-even analysis, and market trends',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#1e293b',
};

export default function RootLayout({ 
  children
}: { 
  children: ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <body>
        <Providers>
          <AuthGuard>
            <div className="app-container" style={{ padding: '2rem 1rem', maxWidth: '1400px', margin: '0 auto' }}>
              <Header />
              {children}
            </div>
            <Toaster />
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
