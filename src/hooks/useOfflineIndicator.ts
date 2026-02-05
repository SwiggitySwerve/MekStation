/**
 * Offline Indicator Hook
 *
 * Detects when the browser loses internet connection and shows a persistent
 * toast notification. Automatically dismisses when connection is restored.
 *
 * @module hooks/useOfflineIndicator
 */

import { useEffect } from 'react';

import { useToast } from '@/components/shared/Toast';

/**
 * Hook to detect and display offline/online status
 *
 * Shows a persistent warning toast when offline, and a success toast when back online.
 * Automatically cleans up event listeners on unmount.
 *
 * @example
 * ```tsx
 * function App() {
 *   useOfflineIndicator();
 *   return <div>App content</div>;
 * }
 * ```
 */
export function useOfflineIndicator(): void {
  const { showToast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      showToast({
        message: 'Back online',
        variant: 'success',
      });
    };

    const handleOffline = () => {
      showToast({
        message: 'No internet connection',
        variant: 'warning',
        duration: 0, // Persistent until back online
      });
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);
}
