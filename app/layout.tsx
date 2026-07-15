import '../src/index.css';
import { ReactNode } from 'react';
import { Providers } from './providers';
import { AuthGuard } from '../components/AuthGuard';
import { Header } from '../components/Header';
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const metadata = {
  title: 'Poultry Farm Pro',
  description: 'Advanced metrics, break-even analysis, and market trends',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#4f46e5',
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans")}>
      <body>
        <Providers>
          <AuthGuard>
            <div className="max-w-[1400px] mx-auto px-4 py-8 flex flex-col gap-8 animate-in fade-in duration-500">
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
