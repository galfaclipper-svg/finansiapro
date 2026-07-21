import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/contexts/app-provider';
import { AuthProvider } from '@/contexts/auth-provider';
import { LicenseProvider } from '@/contexts/license-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import Script from 'next/script';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'FinansiaProf',
  description:
    'Manajemen keuangan cerdas untuk bisnis perdagangan online.',
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/icon.png' }
    ],
    apple: '/icon-192x192.png'
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <link rel="icon" href="/icon.png" type="image/png" sizes="any" />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased overflow-x-hidden', inter.variable)}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="dark" 
          enableSystem 
          disableTransitionOnChange
          themes={['light', 'dark', 'burgundy', 'luxury', 'terracotta', 'stencil']}
        >
          <AuthProvider>
            <LicenseProvider>
              <AppProvider>
                {children}
                <Toaster />
                <PWAInstallPrompt />
                {/* Anti-Piracy Watermark */}
                <div className="fixed bottom-2 right-2 text-[10px] md:text-xs font-black text-slate-800 opacity-[0.04] pointer-events-none select-none z-[9999] tracking-widest uppercase origin-bottom-right">
                  Wisesa Niskala - Proprietary
                </div>
                {/* Copyright Console Trace & Anti-Piracy */}
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      console.log("%cFinansiaProf SaaS Hak Cipta dilindungi. Proprietary Software milik Wisesa Niskala.", "color: #247BA0; font-size: 14px; font-weight: bold; border: 1px solid #247BA0; padding: 10px; border-radius: 5px;");
                      
                      // Anti-Piracy Protection
                      if (typeof window !== 'undefined') {
                        document.addEventListener('contextmenu', function(e) {
                           e.preventDefault();
                        });
                        document.addEventListener('keydown', function(e) {
                          if (
                            e.key === 'F12' || 
                            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')) || 
                            (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
                          ) {
                            e.preventDefault();
                          }
                        });
                      }
                    `
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
                
                {/* Google Analytics */}
                <Script src="https://www.googletagmanager.com/gtag/js?id=G-T6GV80QN0F" strategy="afterInteractive" />
                <Script id="google-analytics" strategy="afterInteractive">
                  {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){window.dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', 'G-T6GV80QN0F');
                  `}
                </Script>

                {/* Tawk.to Live Chat */}
                <Script id="tawk-to" strategy="afterInteractive">
                  {`
                    var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
                    (function(){
                    var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                    s1.async=true;
                    s1.src='https://embed.tawk.to/6a5fcea5e01f0e1d4ae0cdf2/1ju33ueg3';
                    s1.charset='UTF-8';
                    s1.setAttribute('crossorigin','*');
                    s0.parentNode.insertBefore(s1,s0);
                    })();
                  `}
                </Script>
              </AppProvider>
            </LicenseProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
