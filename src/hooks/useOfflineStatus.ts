/**
 * Offline Status Detection Hook
 *
 * Detects online/offline status and provides reactive state updates.
 * Listens for browser online/offline events for real-time status.
 *
 * @module hooks/useOfflineStatus
 */

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Network status state
 */
export interface NetworkStatus {
  /** Whether the device is currently online */
  isOnline: boolean;
  /** Whether the device is currently offline */
  isOffline: boolean;
  /** Timestamp of last status change */
  lastChanged: number | null;
}

/**
 * Offline status hook options
 */
export interface UseOfflineStatusOptions {
  /**
   * Callback fired when going offline
   */
  onOffline?: () => void;
  /**
   * Callback fired when coming back online
   */
  onOnline?: () => void;
  /**
   * Perform an actual network check (fetch) to verify connectivity
   * Default: false (uses navigator.onLine only)
   */
  performNetworkCheck?: boolean;
  /**
   * URL to ping for network check (default: '/api/health' or current origin)
   */
  pingUrl?: string;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to detect and track online/offline status.
 *
 * Uses navigator.onLine and listens to online/offline events.
 * Optionally performs actual network requests to verify connectivity.
 *
 * @param options - Configuration options
 * @returns Network status with isOnline boolean
 *
 * @example Basic usage
 * ```tsx
 * const { isOnline, isOffline } = useOfflineStatus();
 *
 * return (
 *   <div>
 *     {isOffline && (
 *       <Banner variant="warning">
 *         You are offline. Changes will be saved when you reconnect.
 *       </Banner>
 *     )}
 *     <App />
 *   </div>
 * );
 * ```
 *
 * @example With callbacks
 * ```tsx
 * const { isOnline } = useOfflineStatus({
 *   onOffline: () => {
 *     showToast({ message: 'You are offline', variant: 'warning' });
 *   },
 *   onOnline: () => {
 *     showToast({ message: 'Back online!', variant: 'success' });
 *     syncPendingChanges();
 *   },
 * });
 * ```
 */
export function useOfflineStatus(
  options: UseOfflineStatusOptions = {}
): NetworkStatus {
  const { onOffline, onOnline, performNetworkCheck = false, pingUrl } = options;

  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    lastChanged: null,
  }));

  // Update status and trigger callbacks
  const updateStatus = useCallback(
    (online: boolean) => {
      setStatus((prev) => {
        // Only update if status actually changed
        if (prev.isOnline === online) {
          return prev;
        }

        const newStatus: NetworkStatus = {
          isOnline: online,
          isOffline: !online,
          lastChanged: Date.now(),
        };

        // Trigger callbacks after state update
        if (online && onOnline) {
          // Use setTimeout to ensure callback runs after render
          setTimeout(onOnline, 0);
        } else if (!online && onOffline) {
          setTimeout(onOffline, 0);
        }

        return newStatus;
      });
    },
    [onOnline, onOffline]
  );

  // Perform actual network check via fetch
  const checkNetworkConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') {
      return true;
    }

    // Default ping URL
    const url = pingUrl || `${window.location.origin}/api/health`;

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        mode: 'no-cors', // Allow cross-origin
      });
      return response.ok || response.type === 'opaque'; // opaque = no-cors success
    } catch {
      return false;
    }
  }, [pingUrl]);

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return;
    }

    // Handler for online event
    const handleOnline = async () => {
      if (performNetworkCheck) {
        // Verify with actual network request
        const isActuallyOnline = await checkNetworkConnectivity();
        updateStatus(isActuallyOnline);
      } else {
        updateStatus(true);
      }
    };

    // Handler for offline event
    const handleOffline = () => {
      updateStatus(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check with network verification if requested
    if (performNetworkCheck && navigator.onLine) {
      checkNetworkConnectivity().then((isOnline) => {
        if (!isOnline) {
          updateStatus(false);
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateStatus, performNetworkCheck, checkNetworkConnectivity]);

  return status;
}

/**
 * Simple hook that just returns the isOnline boolean
 * For cases where you only need the basic online state
 *
 * @example
 * ```tsx
 * const isOnline = useIsOnline();
 *
 * return (
 *   <button disabled={!isOnline}>
 *     Save
 *   </button>
 * );
 * ```
 */
export function useIsOnline(): boolean {
  const { isOnline } = useOfflineStatus();
  return isOnline;
}

/**
 * Get current online status without setting up listeners
 * Useful for one-off checks
 */
export function getOnlineStatus(): boolean {
  if (typeof navigator === 'undefined') {
    return true; // Assume online during SSR
  }
  return navigator.onLine;
}

export default useOfflineStatus;
