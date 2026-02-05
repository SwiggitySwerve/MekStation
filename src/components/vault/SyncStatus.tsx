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

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  formatBytes,
  formatNumber,
  formatRelativeTime,
} from '@/utils/formatting';

// =============================================================================
// Types
// =============================================================================

export type SyncConnectionState = 'online' | 'syncing' | 'offline' | 'error';

export interface SyncStatusIndicatorProps {
  /** Current connection state */
  state: SyncConnectionState;
  /** Number of pending messages */
  pendingCount?: number;
  /** Show label next to icon */
  showLabel?: boolean;
  /** Click handler to expand details */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
}

export interface SyncStatusPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Close the panel */
  onClose: () => void;
  /** Queue statistics */
  stats?: IQueueStats | null;
  /** Per-peer sync summaries */
  peerSummaries?: IPeerQueueSummary[];
  /** Peer connection states (keyed by peerId) */
  peerStates?: Record<string, P2PConnectionState>;
  /** Peer display names (keyed by peerId) */
  peerNames?: Record<string, string>;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when flush all is requested */
  onFlushAll?: () => Promise<void>;
  /** Callback when clear expired is requested */
  onClearExpired?: () => Promise<void>;
  /** Callback when flush for a specific peer is requested */
  onFlushPeer?: (peerId: string) => Promise<void>;
  /** Custom class name */
  className?: string;
}

export interface PeerSyncRowProps {
  /** Peer's friend code */
  peerId: string;
  /** Peer display name (optional) */
  peerName?: string;
  /** Connection state */
  connectionState: P2PConnectionState;
  /** Number of pending messages */
  pendingCount: number;
  /** Pending size in bytes */
  pendingSizeBytes?: number;
  /** Failed message count */
  failedCount?: number;
  /** Last successful sync timestamp */
  lastSuccessAt?: string | null;
  /** Whether currently syncing */
  isSyncing?: boolean;
  /** Sync progress (0-100) */
  syncProgress?: number;
  /** Callback when flush is requested */
  onFlush?: () => Promise<void>;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

function CloudIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
      />
    </svg>
  );
}

function CloudArrowUpIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
      />
    </svg>
  );
}

function CloudOffIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
      />
    </svg>
  );
}

function ExclamationCircleIcon({
  className = 'w-5 h-5',
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

function ArrowPathIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function TrashIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function XMarkIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function UserIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function SpinnerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function SignalIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function ClockIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PaperAirplaneIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Truncate friend code for display
 */
function truncateFriendCode(code: string): string {
  if (code.length <= 12) return code;
  return code.slice(0, 4) + '...' + code.slice(-4);
}

/**
 * Get connection state label
 */
function getConnectionStateLabel(state: P2PConnectionState): string {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting';
    case 'disconnected':
      return 'Offline';
    case 'failed':
      return 'Failed';
    default:
      return 'Unknown';
  }
}

// =============================================================================
// SyncStatusIndicator Component
// =============================================================================

/**
 * Compact sync status indicator for header/sidebar use.
 * Shows connection state with optional pending count badge.
 */
export function SyncStatusIndicator({
  state,
  pendingCount = 0,
  showLabel = false,
  onClick,
  className = '',
}: SyncStatusIndicatorProps): React.ReactElement {
  // State-specific styling
  const stateConfig: Record<
    SyncConnectionState,
    {
      icon: React.ReactNode;
      bgClass: string;
      dotClass: string;
      textClass: string;
      label: string;
      pulseClass?: string;
    }
  > = {
    online: {
      icon: <CloudIcon className="h-4 w-4" />,
      bgClass:
        'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-400',
      label: 'Synced',
    },
    syncing: {
      icon: <CloudArrowUpIcon className="h-4 w-4" />,
      bgClass: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30',
      dotClass: 'bg-blue-500',
      textClass: 'text-blue-400',
      label: 'Syncing',
      pulseClass: 'animate-pulse',
    },
    offline: {
      icon: <CloudOffIcon className="h-4 w-4" />,
      bgClass: 'bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/30',
      dotClass: 'bg-gray-500',
      textClass: 'text-gray-400',
      label: 'Offline',
    },
    error: {
      icon: <ExclamationCircleIcon className="h-4 w-4" />,
      bgClass: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30',
      dotClass: 'bg-red-500',
      textClass: 'text-red-400',
      label: 'Error',
    },
  };

  const config = stateConfig[state];
  const hasPending = pendingCount > 0;

  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all duration-200 ${config.bgClass} ${onClick ? 'cursor-pointer' : 'cursor-default'} ${className} `}
      title={`${config.label}${hasPending ? ` • ${pendingCount} pending` : ''}`}
    >
      {/* Status dot with pulse animation for syncing */}
      <span className="relative flex h-2 w-2">
        {config.pulseClass && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.dotClass} opacity-75 ${config.pulseClass}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${config.dotClass}`}
        />
      </span>

      {/* Icon */}
      <span className={config.textClass}>{config.icon}</span>

      {/* Optional label */}
      {showLabel && (
        <span className={`text-xs font-medium ${config.textClass}`}>
          {config.label}
        </span>
      )}

      {/* Pending count badge */}
      {hasPending && (
        <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-amber-500/30">
          {formatNumber(pendingCount)}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// PeerSyncRow Component
// =============================================================================

/**
 * Individual peer sync status row with actions.
 */
export function PeerSyncRow({
  peerId,
  peerName,
  connectionState,
  pendingCount,
  pendingSizeBytes,
  failedCount = 0,
  lastSuccessAt,
  isSyncing = false,
  syncProgress,
  onFlush,
  className = '',
}: PeerSyncRowProps): React.ReactElement {
  const [isFlushing, setIsFlushing] = useState(false);

  const handleFlush = useCallback(async () => {
    if (!onFlush) return;
    setIsFlushing(true);
    try {
      await onFlush();
    } finally {
      setIsFlushing(false);
    }
  }, [onFlush]);

  // Connection state styling
  const connectionConfig: Record<
    P2PConnectionState,
    { dotClass: string; textClass: string }
  > = {
    connected: {
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-400',
    },
    connecting: {
      dotClass: 'bg-blue-500 animate-pulse',
      textClass: 'text-blue-400',
    },
    disconnected: {
      dotClass: 'bg-gray-500',
      textClass: 'text-gray-400',
    },
    failed: {
      dotClass: 'bg-red-500',
      textClass: 'text-red-400',
    },
  };

  const config = connectionConfig[connectionState];
  const displayName = peerName || truncateFriendCode(peerId);
  const showProgress = isSyncing && syncProgress !== undefined;

  return (
    <div
      className={`group relative p-4 transition-all duration-200 hover:bg-gray-700/30 ${className} `}
    >
      <div className="flex items-center gap-4">
        {/* Peer avatar / identifier */}
        <div className="relative flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gray-600/50 to-gray-700/50">
            <UserIcon className="h-5 w-5 text-gray-400" />
          </div>
          {/* Connection dot */}
          <span
            className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-gray-800 ${config.dotClass}`}
            title={getConnectionStateLabel(connectionState)}
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-white" title={peerId}>
              {displayName}
            </span>
            {failedCount > 0 && (
              <Badge variant="red" size="sm">
                {failedCount} failed
              </Badge>
            )}
          </div>

          {/* Progress bar or status */}
          {showProgress ? (
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
                <span>Syncing...</span>
                <span>{syncProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-4 text-sm">
              {/* Pending count */}
              <div className="flex items-center gap-1.5 text-gray-500">
                <PaperAirplaneIcon className="h-3.5 w-3.5" />
                <span>
                  {pendingCount} pending
                  {pendingSizeBytes !== undefined && pendingSizeBytes > 0 && (
                    <span className="text-gray-600">
                      {' '}
                      ({formatBytes(pendingSizeBytes)})
                    </span>
                  )}
                </span>
              </div>

              {/* Last sync */}
              <div className="flex items-center gap-1.5 text-gray-500">
                <ClockIcon className="h-3.5 w-3.5" />
                <span>{formatRelativeTime(lastSuccessAt)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onFlush && pendingCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFlush}
              isLoading={isFlushing}
              disabled={isFlushing || connectionState !== 'connected'}
              leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              className="!px-2"
              title={
                connectionState === 'connected'
                  ? 'Flush pending messages'
                  : 'Connect to flush'
              }
            >
              Flush
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SyncStatusPanel Component
// =============================================================================

/**
 * Detailed sync status panel with queue stats and per-peer status.
 */
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
