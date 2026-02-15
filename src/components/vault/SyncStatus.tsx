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

import { Button } from '@/components/ui/Button';
import { formatBytes, formatNumber } from '@/utils/formatting';

import {
  SignalIcon,
  XMarkIcon,
  SpinnerIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  TrashIcon,
  UserIcon,
} from './SyncStatus.icons';
import { SyncStatusIndicator } from './SyncStatusIndicator';
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

  const totalPending = stats?.byStatus?.pending ?? 0;
  const totalFailed = stats?.byStatus?.failed ?? 0;
  const totalExpired = stats?.byStatus?.expired ?? 0;
  const expiringSoon = stats?.expiringSoon ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className={`mx-4 flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-800 shadow-2xl shadow-black/50 ${className}`}
      >
        {/* Header with gradient */}
        <div className="relative flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-400/10 via-transparent to-transparent" />
          <div className="relative border-b border-gray-700/50 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/20 shadow-lg shadow-cyan-500/10">
                  <SignalIcon className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    Sync Status
                  </h2>
                  <p className="text-sm text-gray-400">
                    Message queue & peer connections
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <SpinnerIcon className="h-8 w-8 text-cyan-400" />
            <span className="ml-3 font-medium text-gray-400">
              Loading sync status...
            </span>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="p-6">
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-900/30 p-4">
              <ExclamationCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
              <div>
                <p className="font-medium text-red-300">
                  Failed to load sync status
                </p>
                <p className="mt-1 text-sm text-red-400/70">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <>
            {/* Queue Stats */}
            <div className="grid flex-shrink-0 grid-cols-4 gap-px bg-gray-700/30">
              <div className="bg-gray-800/80 p-4 text-center">
                <div className="text-2xl font-bold text-amber-400 tabular-nums">
                  {formatNumber(totalPending)}
                </div>
                <div className="mt-1 text-xs tracking-wider text-gray-500 uppercase">
                  Pending
                </div>
              </div>
              <div className="bg-gray-800/80 p-4 text-center">
                <div className="text-2xl font-bold text-red-400 tabular-nums">
                  {formatNumber(totalFailed)}
                </div>
                <div className="mt-1 text-xs tracking-wider text-gray-500 uppercase">
                  Failed
                </div>
              </div>
              <div className="bg-gray-800/80 p-4 text-center">
                <div className="text-2xl font-bold text-gray-400 tabular-nums">
                  {formatNumber(totalExpired)}
                </div>
                <div className="mt-1 text-xs tracking-wider text-gray-500 uppercase">
                  Expired
                </div>
              </div>
              <div className="bg-gray-800/80 p-4 text-center">
                <div className="text-2xl font-bold text-orange-400 tabular-nums">
                  {formatNumber(expiringSoon)}
                </div>
                <div className="mt-1 text-xs tracking-wider text-gray-500 uppercase">
                  Expiring
                </div>
              </div>
            </div>

            {/* Storage info */}
            {stats && stats.totalSizeBytes > 0 && (
              <div className="flex items-center justify-between border-b border-gray-700/50 bg-gray-800/50 px-5 py-3 text-sm">
                <span className="text-gray-400">Queue storage used</span>
                <span className="font-medium text-white tabular-nums">
                  {formatBytes(stats.totalSizeBytes)}
                </span>
              </div>
            )}

            {/* Global actions */}
            {(onFlushAll || onClearExpired) && (
              <div className="flex items-center gap-3 border-b border-gray-700/50 bg-gray-800/30 px-5 py-3">
                {onFlushAll && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleFlushAll}
                    isLoading={isFlushingAll}
                    disabled={isFlushingAll || totalPending === 0}
                    leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                  >
                    Flush All
                  </Button>
                )}
                {onClearExpired && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearExpired}
                    isLoading={isClearingExpired}
                    disabled={isClearingExpired || totalExpired === 0}
                    leftIcon={<TrashIcon className="h-4 w-4" />}
                  >
                    Clear Expired
                  </Button>
                )}
              </div>
            )}

            {/* Peer list */}
            <div className="flex-1 overflow-y-auto">
              {peerSummaries.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-700/50">
                    <UserIcon className="h-8 w-8 text-gray-500" />
                  </div>
                  <p className="font-medium text-gray-400">
                    No peers connected
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Peer sync status will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {peerSummaries.map((summary) => (
                    <PeerSyncRow
                      key={summary.peerId}
                      peerId={summary.peerId}
                      peerName={peerNames[summary.peerId]}
                      connectionState={
                        peerStates[summary.peerId] ?? 'disconnected'
                      }
                      pendingCount={summary.pendingCount}
                      pendingSizeBytes={summary.pendingSizeBytes}
                      failedCount={summary.failedCount}
                      lastSuccessAt={summary.lastSuccessAt}
                      onFlush={
                        onFlushPeer
                          ? async () => {
                              await onFlushPeer(summary.peerId);
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
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
