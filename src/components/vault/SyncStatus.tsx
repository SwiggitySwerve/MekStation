/**
 * Sync Status Components
 *
 * Components for displaying sync status and pending message queue.
 * Includes a compact indicator for headers and a detailed status panel.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useState, useCallback } from 'react';

import type {
  IQueueStats,
  IPeerQueueSummary,
  P2PConnectionState,
} from '@/types/vault';

import { SyncStatusIndicator } from './SyncStatusIndicator';
import { SyncStatusPanelContent } from './SyncStatusPanelContent';
import { PeerSyncRow } from './SyncStatusPeerRow';

// Re-export types and sub-components for backward compatibility
export type { SyncConnectionState } from './SyncStatus.helpers';
export type { SyncStatusIndicatorProps } from './SyncStatusIndicator';
export type { PeerSyncRowProps } from './SyncStatusPeerRow';
export { SyncStatusIndicator } from './SyncStatusIndicator';
export { PeerSyncRow } from './SyncStatusPeerRow';

// =============================================================================
// Types
// =============================================================================

export interface SyncStatusPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: IQueueStats | null;
  peerSummaries?: IPeerQueueSummary[];
  peerStates?: Record<string, P2PConnectionState>;
  peerNames?: Record<string, string>;
  isLoading?: boolean;
  error?: string | null;
  onFlushAll?: () => Promise<void>;
  onClearExpired?: () => Promise<void>;
  onFlushPeer?: (peerId: string) => Promise<void>;
  className?: string;
}

// =============================================================================
// SyncStatusPanel Component
// =============================================================================

export function SyncStatusPanel({
  isOpen,
  onClose,
  stats,
  peerSummaries = [],
  peerStates = {},
  peerNames = {},
  isLoading = false,
  error,
  onFlushAll,
  onClearExpired,
  onFlushPeer,
  className = '',
}: SyncStatusPanelProps): React.ReactElement | null {
  const [isFlushingAll, setIsFlushingAll] = useState(false);
  const [isClearingExpired, setIsClearingExpired] = useState(false);

  const handleFlushAll = useCallback(async () => {
    if (!onFlushAll) return;
    setIsFlushingAll(true);
    try {
      await onFlushAll();
    } finally {
      setIsFlushingAll(false);
    }
  }, [onFlushAll]);

  const handleClearExpired = useCallback(async () => {
    if (!onClearExpired) return;
    setIsClearingExpired(true);
    try {
      await onClearExpired();
    } finally {
      setIsClearingExpired(false);
    }
  }, [onClearExpired]);

  if (!isOpen) return null;

  return (
    <SyncStatusPanelContent
      stats={stats}
      peerSummaries={peerSummaries}
      peerStates={peerStates}
      peerNames={peerNames}
      isLoading={isLoading}
      error={error}
      className={className}
      isFlushingAll={isFlushingAll}
      isClearingExpired={isClearingExpired}
      onClose={onClose}
      onFlushAll={onFlushAll}
      onClearExpired={onClearExpired}
      onFlushPeer={onFlushPeer}
      onFlushAllClick={handleFlushAll}
      onClearExpiredClick={handleClearExpired}
    />
  );
}

// =============================================================================
// Exports
// =============================================================================

export const SyncStatus = {
  SyncStatusIndicator,
  SyncStatusPanel,
  PeerSyncRow,
};

export default SyncStatus;
