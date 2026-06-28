import './../src/index.css';
import './../src/App.css';
import { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata = {
  title: 'Poultry Farm Pro',
  description: 'Advanced metrics, break-even analysis, and market trends',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
