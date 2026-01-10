/**
 * InstallPrompt Component
 *
 * Displays a button to install the PWA when available.
 * Appears in the header/sidebar when the app can be installed.
 */

import React from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface InstallPromptProps {
  /** Variant style of the button */
  variant?: 'button' | 'banner' | 'compact';
  /** Optional class name for styling */
  className?: string;
}

export function InstallPrompt({
  variant = 'button',
  className = '',
}: InstallPromptProps): React.ReactElement | null {
  const { canInstall, isInstalled, isPrompting, promptInstall, dismissInstall } = usePWAInstall();

  // Don't render if already installed or can't install
  if (isInstalled || !canInstall) {
    return null;
  }

  if (variant === 'banner') {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4 flex items-center justify-between z-50 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium">Install MekStation</p>
            <p className="text-slate-400 text-sm">Add to your home screen for quick access</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={dismissInstall}
            className="px-3 py-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Dismiss install prompt"
          >
            Not now
          </button>
          <button
            onClick={promptInstall}
            disabled={isPrompting}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isPrompting ? 'Installing...' : 'Install'}
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={promptInstall}
        disabled={isPrompting}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors ${className}`}
        title="Install MekStation"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>{isPrompting ? 'Installing...' : 'Install'}</span>
      </button>
    );
  }

  // Default button variant
  return (
    <button
      onClick={promptInstall}
      disabled={isPrompting}
      className={`flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${className}`}
      title="Install MekStation as an app"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      <span>{isPrompting ? 'Installing...' : 'Install App'}</span>
    </button>
  );
}

export default InstallPrompt;
