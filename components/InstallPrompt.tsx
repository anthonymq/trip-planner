import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    
    // For iOS, check if not in standalone mode
    if (isIOSDevice) {
      const isInStandaloneMode = ('standalone' in window.navigator) && ((window.navigator as any).standalone);
      if (!isInStandaloneMode) {
        setShowPrompt(true);
      }
      return;
    }

    // For Android/Desktop (Chrome/Edge/etc)
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const closePrompt = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] bg-white text-ocean-900 p-4 rounded-xl shadow-2xl border border-sand-200 flex items-center gap-4 animate-in slide-in-from-bottom duration-300 max-w-sm">
      <div className="flex-1">
        <h3 className="font-bold text-sm mb-1">
          Install WeTravel
        </h3>
        <p className="text-xs text-sand-400">
          {isIOS 
            ? 'Tap the share button and select "Add to Home Screen"'
            : 'Install our app for a better experience.'}
        </p>
      </div>
      
      {!isIOS && deferredPrompt && (
        <button 
          onClick={handleInstallClick}
          className="bg-ocean-600 hover:bg-ocean-700 text-white p-2 rounded-lg transition-colors flex items-center gap-2 px-3"
        >
          <Download className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wide">Install</span>
        </button>
      )}
      
      <button 
        onClick={closePrompt}
        className="text-sand-400 hover:text-ocean-900 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default InstallPrompt;
