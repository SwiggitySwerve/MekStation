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

import type {
  ISyncConflict,
  P2PConnectionState,
  ShareableContentType,
} from '@/types/vault';

import { useToast } from '@/components/shared/Toast';

import {
  buildConflictToast,
  buildConnectionChangedToast,
  buildShareReceivedToast,
  buildSyncCompleteToast,
  getNotificationKey,
  wasRecentlyShown as wasNotificationRecentlyShown,
} from './useSyncNotifications.helpers';

// =============================================================================
// Types
// =============================================================================

export interface SyncNotificationEvent {
  type:
    | 'share_received'
    | 'conflict_detected'
    | 'sync_complete'
    | 'connection_changed';
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
  onViewShare?: (
    itemId: string,
    itemType: ShareableContentType | 'folder',
  ) => void;
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
  options: UseSyncNotificationsOptions = {},
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
   * Check if notification was recently shown (dedupe)
   */
  const wasRecentlyShown = useCallback((key: string): boolean => {
    return wasNotificationRecentlyShown(recentNotifications.current, key);
  }, []);

  /**
   * Notify about a received share
   */
  const notifyShareReceived = useCallback(
    (data: ShareReceivedData) => {
      if (!enabled) return;

      const key = getNotificationKey(
        'share',
        data.itemName,
        data.fromContactName,
      );
      if (wasRecentlyShown(key)) return;

      showToast(buildShareReceivedToast(data, onViewShare));
    },
    [enabled, showToast, onViewShare, wasRecentlyShown],
  );

  /**
   * Notify about a detected conflict
   */
  const notifyConflictDetected = useCallback(
    (conflict: ISyncConflict) => {
      if (!enabled) return;

      const key = getNotificationKey('conflict', conflict.id);
      if (wasRecentlyShown(key)) return;

      showToast(buildConflictToast(conflict, onResolveConflict));
    },
    [enabled, showToast, onResolveConflict, wasRecentlyShown],
  );

  /**
   * Notify about sync completion
   */
  const notifySyncComplete = useCallback(
    (data: SyncCompleteData) => {
      if (!enabled) return;

      const toast = buildSyncCompleteToast(data, onViewSyncDetails);
      if (!toast) return;

      const totalChanges = data.changesReceived + data.changesSent;
      const key = getNotificationKey(
        'sync',
        data.peerName,
        String(totalChanges),
      );
      if (wasRecentlyShown(key)) return;

      showToast(toast);
    },
    [enabled, showToast, onViewSyncDetails, wasRecentlyShown],
  );

  /**
   * Notify about connection state changes
   */
  const notifyConnectionChanged = useCallback(
    (data: ConnectionChangedData) => {
      if (!enabled) return;

      const toast = buildConnectionChangedToast(data);
      if (!toast) return;

      const key = getNotificationKey('connection', data.peerName, data.state);
      if (wasRecentlyShown(key)) return;

      showToast(toast);
    },
    [enabled, showToast, wasRecentlyShown],
  );

  return {
    notifyShareReceived,
    notifyConflictDetected,
    notifySyncComplete,
    notifyConnectionChanged,
  };
}

export default useSyncNotifications;
