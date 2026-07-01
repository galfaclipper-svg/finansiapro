'use client';

import React, { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed previously
    if (localStorage.getItem('pwa_prompt_dismissed') === 'true') {
      setDismissed(true);
      return;
    }

    // Detect if already installed (standalone)
    const isStandAloneMatch = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandAlone = (window.navigator as any).standalone === true;
    if (isStandAloneMatch || isIOSStandAlone) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS (where beforeinstallprompt doesn't fire natively)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // If iOS and not standalone, show prompt after a short delay
    if (isIosDevice && !isStandalone) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Android/Chrome
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  if (isStandalone || !showPrompt || dismissed) return null;

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed bottom-[90px] left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-96 z-[150] bg-card border border-border shadow-2xl rounded-2xl p-4 flex flex-col gap-3 animate-fade-in-up">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg">
            <Download className="text-primary-foreground" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">Install FinansiaProf</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Akses lebih cepat dari layar HP Anda layaknya aplikasi asli.</p>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground bg-muted/50 rounded-full p-1 transition-colors">
          <X size={16} />
        </button>
      </div>

      {isIOS ? (
        <div className="bg-muted/50 rounded-lg p-3 text-xs flex flex-col gap-2 border border-border/50">
          <p className="flex items-center gap-2">
            1. Tekan ikon <Share size={14} className="text-primary"/> <b>Share (Bagikan)</b> di bawah layar browser.
          </p>
          <p>
            2. Geser menu ke atas lalu pilih <b>"Add to Home Screen"</b> (Tambahkan ke Layar Utama).
          </p>
        </div>
      ) : (
        <Button onClick={handleInstallClick} className="w-full font-bold shadow-md shadow-primary/20">
          Install Sekarang
        </Button>
      )}
    </div>
  );
}
