import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeInitScript } from '@/components/ThemeInitScript';
import { QueryProvider } from '@/components/QueryProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TypographyProvider } from '@/components/TypographyProvider';

// Weights match the legacy SPA <link> tag (line 7 of Expense Tracker.html).
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ExpenseIQ',
  description: 'Intelligent Spend Tracker — Personal finance management.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-bg text-text">
        <ErrorBoundary>
          <ThemeProvider>
            <TypographyProvider>
              <QueryProvider>
                <ToastProvider>{children}</ToastProvider>
              </QueryProvider>
            </TypographyProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
