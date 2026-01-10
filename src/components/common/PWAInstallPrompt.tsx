import React from 'react';
import { usePWA } from '@/hooks/usePWA';

interface PWAInstallPromptProps {
  className?: string;
}

/**
 * PWA Install Button Component
 *
 * Displays an install button when the app is installable as a PWA.
 * Automatically hides when:
 * - The app is already installed
 * - The browser doesn't support PWA installation
 * - The install prompt hasn't been triggered
 */
export function PWAInstallButton({ className = '' }: PWAInstallPromptProps): React.ReactElement | null {
  const { isInstallable, install } = usePWA();

  if (!isInstallable) {
    return null;
  }

  return (
    <button
      onClick={install}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        bg-blue-600 hover:bg-blue-700
        text-white text-sm font-medium
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
        ${className}
      `}
      aria-label="Install MekStation app"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      <span className="hidden sm:inline">Install App</span>
    </button>
  );
}

/**
 * PWA Update Notification Component
 *
 * Displays a notification when a new version of the app is available.
 * Shows a button to reload and apply the update.
 */
export function PWAUpdateNotification(): React.ReactElement | null {
  const { isUpdateAvailable, update } = usePWA();

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <div
      className="
        fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80
        bg-slate-800 border border-slate-700 rounded-lg shadow-lg
        p-4 z-50
      "
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-100">Update available</p>
          <p className="mt-1 text-sm text-slate-400">
            A new version of MekStation is available.
          </p>
          <button
            onClick={update}
            className="
              mt-3 px-4 py-2 rounded-md text-sm font-medium
              bg-blue-600 hover:bg-blue-700 text-white
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800
            "
          >
            Reload to update
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PWA Offline Indicator Component
 *
 * Displays a subtle indicator when the user is offline.
 */
export function PWAOfflineIndicator(): React.ReactElement | null {
  const { isOnline } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="
        fixed top-0 left-0 right-0
        bg-amber-600 text-amber-50 text-center py-1 text-sm font-medium
        z-50
      "
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center justify-center gap-2">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
          />
        </svg>
        You are offline. Some features may be unavailable.
      </span>
    </div>
  );
}

export default PWAInstallButton;
