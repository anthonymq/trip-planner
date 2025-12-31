import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

const ReloadPrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] bg-ocean-900 text-white p-4 rounded-xl shadow-2xl border border-white/10 flex items-center gap-4 animate-in slide-in-from-bottom duration-300 max-w-sm">
      <div className="flex-1">
        <h3 className="font-bold text-sm mb-1">
          {offlineReady ? 'App ready to work offline' : 'New content available'}
        </h3>
        <p className="text-xs text-sand-300">
          {offlineReady 
            ? 'You can use this app without internet connection.' 
            : 'Click reload to update to the latest version.'}
        </p>
      </div>
      
      {needRefresh && (
        <button 
          onClick={() => updateServiceWorker(true)}
          className="bg-terracotta-500 hover:bg-terracotta-600 text-white p-2 rounded-lg transition-colors"
          title="Reload"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
      
      <button 
        onClick={close}
        className="text-sand-400 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ReloadPrompt;
