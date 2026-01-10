/**
 * Service Worker Registration Component
 *
 * Registers the service worker and handles updates.
 * This component should be placed in the app layout.
 */
import { useEffect, useState } from 'react';

interface ServiceWorkerRegistrationProps {
  onUpdate?: () => void;
  onSuccess?: () => void;
}

export function ServiceWorkerRegistration({
  onUpdate,
  onSuccess,
}: ServiceWorkerRegistrationProps): React.ReactElement | null {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Only register in production and if service workers are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setRegistration(reg);
        console.log('[PWA] Service worker registered:', reg.scope);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                console.log('[PWA] New content available');
                setUpdateAvailable(true);
                onUpdate?.();
              } else if (newWorker.state === 'activated') {
                // Content has been cached for offline use
                console.log('[PWA] Content cached for offline use');
                onSuccess?.();
              }
            });
          }
        });

        // Check if already registered
        if (reg.active) {
          console.log('[PWA] Service worker already active');
          onSuccess?.();
        }
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };

    registerServiceWorker();

    // Listen for controller change (when new SW takes over)
    const handleControllerChange = () => {
      console.log('[PWA] Controller changed, reloading...');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [onUpdate, onSuccess]);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Tell the waiting SW to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  // Show update notification when available
  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-slate-800 border border-blue-500 rounded-lg shadow-lg p-4 max-w-xs print:hidden">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-blue-500"
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
          <p className="text-sm font-medium text-white">Update Available</p>
          <p className="text-xs text-slate-400 mt-1">
            A new version of MekStation is available.
          </p>
          <button
            onClick={handleUpdate}
            className="mt-2 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

export default ServiceWorkerRegistration;
