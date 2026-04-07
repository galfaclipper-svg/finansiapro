import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/contexts/app-provider';
import { AuthProvider } from '@/contexts/auth-provider';
import { LicenseProvider } from '@/contexts/license-provider';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { Balancer as ProivderBalancer } from 'react-wrap-balancer';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'FinansiaPro',
  description:
    'Manajemen keuangan cerdas untuk bisnis perdagangan online.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased', inter.variable)}>
        <ProivderBalancer>
          <AuthProvider>
            <LicenseProvider>
              <AppProvider>
                {children}
                <Toaster />
                {/* Anti-Piracy Watermark */}
                <div className="fixed bottom-2 right-2 text-[10px] md:text-xs font-black text-slate-800 opacity-[0.04] pointer-events-none select-none z-[9999] tracking-widest uppercase origin-bottom-right">
                  Wisesa Niskala - Proprietary
                </div>
                {/* Copyright Console Trace */}
                <script
                  dangerouslySetInnerHTML={{
                    __html: `console.log("%cFinansiaPro SaaS Hak Cipta dilindungi. Proprietary Software milik Wisesa Niskala.", "color: #247BA0; font-size: 14px; font-weight: bold; border: 1px solid #247BA0; padding: 10px; border-radius: 5px;");`
                  }}
                />
                
                {/* Google Translate Integration */}
                <div id="google_translate_element" className="hidden" aria-hidden="true"></div>
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      function googleTranslateElementInit() {
                        new window.google.translate.TranslateElement({
                          pageLanguage: 'id',
                          includedLanguages: 'id,en,ar',
                          autoDisplay: false
                        }, 'google_translate_element');
                      }
                    `
                  }}
                />
                <script src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async defer></script>
              </AppProvider>
            </LicenseProvider>
          </AuthProvider>
        </ProivderBalancer>
      </body>
    </html>
  );
}
