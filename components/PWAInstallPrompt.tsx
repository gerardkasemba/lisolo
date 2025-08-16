// components/PWAInstallPrompt.tsx
'use client';

import { useEffect, useState } from 'react';
import { FaTimes, FaDownload } from 'react-icons/fa';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwaPromptDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-xs z-50">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium text-gray-900 dark:text-white">
          Installer Lisolo
        </h3>
        <button 
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
        >
          <FaTimes className="h-4 w-4" />
        </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
        Ajoutez Lisolo à votre écran d'accueil pour une meilleure expérience !
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm"
        >
          <FaDownload className="w-3 h-3" />
          Installer
        </button>
        <button
          onClick={handleDismiss}
          className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 px-3 py-1.5 rounded-md"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}