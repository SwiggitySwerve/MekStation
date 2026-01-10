/**
 * PWA Install Button Component
 *
 * Shows an "Install App" button when the PWA is installable.
 * Automatically hides when the app is already installed or running in standalone mode.
 */
import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
}

export function PWAInstallButton({ className = '' }: PWAInstallButtonProps): React.ReactElement | null {
  const { canInstall, isInstalled, isStandalone, promptInstall } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already installed, in standalone mode, or dismissed
  if (isInstalled || isStandalone || dismissed) {
    return null;
  }

  // Don't show if install prompt is not available
  if (!canInstall) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const installed = await promptInstall();
      if (!installed) {
        // User declined, don't show again this session
        setDismissed(true);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        bg-slate-800 border border-slate-700 rounded-lg shadow-lg
        p-4 max-w-xs
        print:hidden
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-amber-500"
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Install MekStation</p>
          <p className="text-xs text-slate-400 mt-1">
            Add to your home screen for quick access and offline use.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="
                px-3 py-1.5 text-sm font-medium
                bg-amber-600 hover:bg-amber-500 text-white
                rounded-md transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                inline-flex items-center gap-2
              "
            >
              {isInstalling ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Installing...
                </>
              ) : (
                'Install'
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="
                px-3 py-1.5 text-sm font-medium
                text-slate-400 hover:text-white
                transition-colors
              "
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default PWAInstallButton;
