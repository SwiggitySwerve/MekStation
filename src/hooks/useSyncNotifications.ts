/**
 * Sync Notifications Hook
 *
 * Provides toast notifications for P2P sync events:
 * - Incoming shared items from contacts
 * - Sync conflicts detected
 * - Connection status changes
 * - Sync completion
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/shared/Toast';
import type {
  ISyncConflict,
  P2PConnectionState,
  ShareableContentType,
} from '@/types/vault';

// =============================================================================
// Types
// =============================================================================

export interface SyncNotificationEvent {
  type: 'share_received' | 'conflict_detected' | 'sync_complete' | 'connection_changed';
  data?: unknown;
}

export interface ShareReceivedData {
  itemName: string;
  itemType: ShareableContentType | 'folder';
  fromContactName: string;
  itemCount?: number;
}

export interface SyncCompleteData {
  peerName: string;
  changesReceived: number;
  changesSent: number;
}

export interface ConnectionChangedData {
  peerName: string;
  state: P2PConnectionState;
}

export interface UseSyncNotificationsOptions {
  /** Whether notifications are enabled */
  enabled?: boolean;
  /** Callback when user clicks to view shared item */
  onViewShare?: (itemId: string, itemType: ShareableContentType | 'folder') => void;
  /** Callback when user clicks to resolve conflict */
  onResolveConflict?: (conflict: ISyncConflict) => void;
  /** Callback when user clicks to view sync details */
  onViewSyncDetails?: () => void;
}

export interface UseSyncNotificationsReturn {
  /** Notify about a received share */
  notifyShareReceived: (data: ShareReceivedData) => void;
  /** Notify about a detected conflict */
  notifyConflictDetected: (conflict: ISyncConflict) => void;
  /** Notify about sync completion */
  notifySyncComplete: (data: SyncCompleteData) => void;
  /** Notify about connection state change */
  notifyConnectionChanged: (data: ConnectionChangedData) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function getContentTypeLabel(type: ShareableContentType | 'folder'): string {
  switch (type) {
    case 'unit':
      return 'unit';
    case 'pilot':
      return 'pilot';
    case 'force':
      return 'force';
    case 'encounter':
      return 'encounter';
    case 'folder':
      return 'folder';
    default:
      return 'item';
  }
}

function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for displaying sync-related toast notifications
 *
 * @example
 * ```tsx
 * const {
 *   notifyShareReceived,
 *   notifyConflictDetected,
 *   notifySyncComplete,
 * } = useSyncNotifications({
 *   onViewShare: (itemId, itemType) => router.push(`/${itemType}s/${itemId}`),
 *   onResolveConflict: (conflict) => setConflictToResolve(conflict),
 * });
 *
 * // In P2P message handler:
 * notifyShareReceived({
 *   itemName: 'Atlas AS7-D',
 *   itemType: 'unit',
 *   fromContactName: 'John',
 * });
 * ```
 */
export function useSyncNotifications(
  options: UseSyncNotificationsOptions = {}
): UseSyncNotificationsReturn {
  const {
    enabled = true,
    onViewShare,
    onResolveConflict,
    onViewSyncDetails,
  } = options;

  const { showToast } = useToast();

  // Track recent notifications to avoid duplicates
  const recentNotifications = useRef<Set<string>>(new Set());

  // Clean up old notification IDs periodically
  useEffect(() => {
    const interval = setInterval(() => {
      recentNotifications.current.clear();
    }, 60000); // Clear every minute

    return () => clearInterval(interval);
  }, []);

  /**
   * Generate a unique key for deduplication
   */
  const getNotificationKey = useCallback(
    (type: string, ...args: string[]): string => {
      return `${type}:${args.join(':')}`;
    },
    []
  );

  /**
   * Check if notification was recently shown (dedupe)
   */
  const wasRecentlyShown = useCallback((key: string): boolean => {
    if (recentNotifications.current.has(key)) {
      return true;
    }
    recentNotifications.current.add(key);
    return false;
  }, []);

  /**
   * Notify about a received share
   */
  const notifyShareReceived = useCallback(
    (data: ShareReceivedData) => {
      if (!enabled) return;

      const key = getNotificationKey('share', data.itemName, data.fromContactName);
      if (wasRecentlyShown(key)) return;

      const typeLabel = getContentTypeLabel(data.itemType);
      const message = data.itemCount && data.itemCount > 1
        ? `${data.fromContactName} shared ${data.itemCount} ${pluralize(data.itemCount, typeLabel)} with you`
        : `${data.fromContactName} shared "${data.itemName}" with you`;

      showToast({
        message,
        variant: 'info',
        duration: 5000,
        action: onViewShare
          ? {
              label: 'View',
              onClick: () => onViewShare('', data.itemType),
            }
          : undefined,
      });
    },
    [enabled, showToast, onViewShare, getNotificationKey, wasRecentlyShown]
  );

  /**
   * Notify about a detected conflict
   */
  const notifyConflictDetected = useCallback(
    (conflict: ISyncConflict) => {
      if (!enabled) return;

      const key = getNotificationKey('conflict', conflict.id);
      if (wasRecentlyShown(key)) return;

      const typeLabel = getContentTypeLabel(conflict.contentType);

      showToast({
        message: `Sync conflict detected for ${typeLabel} "${conflict.itemName}"`,
        variant: 'warning',
        duration: 8000,
        action: onResolveConflict
          ? {
              label: 'Resolve',
              onClick: () => onResolveConflict(conflict),
            }
          : undefined,
      });
    },
    [enabled, showToast, onResolveConflict, getNotificationKey, wasRecentlyShown]
  );

  /**
   * Notify about sync completion
   */
  const notifySyncComplete = useCallback(
    (data: SyncCompleteData) => {
      if (!enabled) return;

      // Only notify if there were actual changes
      const totalChanges = data.changesReceived + data.changesSent;
      if (totalChanges === 0) return;

      const key = getNotificationKey('sync', data.peerName, String(totalChanges));
      if (wasRecentlyShown(key)) return;

      const parts: string[] = [];
      if (data.changesReceived > 0) {
        parts.push(`received ${data.changesReceived}`);
      }
      if (data.changesSent > 0) {
        parts.push(`sent ${data.changesSent}`);
      }

      showToast({
        message: `Synced with ${data.peerName}: ${parts.join(', ')} ${pluralize(totalChanges, 'change')}`,
        variant: 'success',
        duration: 4000,
        action: onViewSyncDetails
          ? {
              label: 'Details',
              onClick: onViewSyncDetails,
            }
          : undefined,
      });
    },
    [enabled, showToast, onViewSyncDetails, getNotificationKey, wasRecentlyShown]
  );

  /**
   * Notify about connection state changes
   */
  const notifyConnectionChanged = useCallback(
    (data: ConnectionChangedData) => {
      if (!enabled) return;

      // Only notify for significant state changes
      if (data.state === 'connecting') return;

      const key = getNotificationKey('connection', data.peerName, data.state);
      if (wasRecentlyShown(key)) return;

      let message: string;
      let variant: 'success' | 'warning' | 'info';

      switch (data.state) {
        case 'connected':
          message = `Connected to ${data.peerName}`;
          variant = 'success';
          break;
        case 'disconnected':
          message = `Disconnected from ${data.peerName}`;
          variant = 'info';
          break;
        case 'failed':
          message = `Failed to connect to ${data.peerName}`;
          variant = 'warning';
          break;
        default:
          return;
      }

      showToast({
        message,
        variant,
        duration: 3000,
      });
    },
    [enabled, showToast, getNotificationKey, wasRecentlyShown]
  );

  return {
    notifyShareReceived,
    notifyConflictDetected,
    notifySyncComplete,
    notifyConnectionChanged,
  };
}

export default useSyncNotifications;
