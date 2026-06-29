import '../../src/index.css';
import '../../src/App.css';
import { ReactNode } from 'react';
import { Providers } from '../providers';
import { AuthGuard } from '../../components/AuthGuard';
import { Header } from '../../components/Header';
import { getDictionary } from '../getDictionary';

export const metadata = {
  title: 'Poultry Farm Pro',
  description: 'Advanced metrics, break-even analysis, and market trends',
};

export default async function RootLayout({ 
  children,
  params
}: { 
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang as 'en' | 'fr' | 'ar');

  return (
    <html lang={resolvedParams.lang} dir={resolvedParams.lang === 'ar' ? 'rtl' : 'ltr'}>
      <body>
        <Providers>
          <AuthGuard>
            <div className="app-container" style={{ padding: '2rem 1rem', maxWidth: '1400px', margin: '0 auto' }}>
              <Header dict={dict} lang={resolvedParams.lang} />
              {children}
            </div>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
