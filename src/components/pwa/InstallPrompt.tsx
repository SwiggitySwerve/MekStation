import React, { useState, useEffect } from 'react';

import { logger } from '@/utils/logger';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallPromptProps {
  className?: string;
}

export function InstallPrompt({
  className = '',
}: InstallPromptProps): React.ReactElement | null {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if running as PWA (Safari-specific property)
    if (
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the prompt after a delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    // Listen for app install event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      logger.debug('PWA installation accepted');
    } else {
      logger.debug('PWA installation dismissed');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal in localStorage so we don't show again for a while
    localStorage.setItem('pwa-install-prompt-dismissed', Date.now().toString());
  };

  // Check if prompt was recently dismissed
  const wasRecentlyDismissed = () => {
    const dismissed = localStorage.getItem('pwa-install-prompt-dismissed');
    if (!dismissed) return false;

    const daysSinceDismissal =
      (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
    return daysSinceDismissal < 7; // Don't show if dismissed within 7 days
  };

  if (isInstalled || !showPrompt || !deferredPrompt || wasRecentlyDismissed()) {
    return null;
  }

  return (
    <div
      className={`animate-slide-up fixed right-4 bottom-4 left-4 z-50 md:right-4 md:left-auto md:w-96 ${className}`.trim()}
    >
      <div className="rounded-lg border-2 border-red-500 bg-white p-4 shadow-lg dark:bg-gray-800">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-red-500">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
              Install MekStation
            </h3>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Install the app for offline access and a better experience on your
              device.
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="min-h-[44px] min-w-[44px] flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="min-h-[44px] min-w-[44px] rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                aria-label="Not now"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
