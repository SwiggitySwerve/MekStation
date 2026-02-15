import React, { useState, useCallback } from 'react';

import type { P2PConnectionState } from '@/types/vault';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatBytes, formatRelativeTime } from '@/utils/formatting';

import {
  truncateFriendCode,
  getConnectionStateLabel,
} from './SyncStatus.helpers';
import {
  UserIcon,
  PaperAirplaneIcon,
  ClockIcon,
  ArrowPathIcon,
} from './SyncStatus.icons';

export interface PeerSyncRowProps {
  peerId: string;
  peerName?: string;
  connectionState: P2PConnectionState;
  pendingCount: number;
  pendingSizeBytes?: number;
  failedCount?: number;
  lastSuccessAt?: string | null;
  isSyncing?: boolean;
  syncProgress?: number;
  onFlush?: () => Promise<void>;
  className?: string;
}

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
        <div className="relative flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gray-600/50 to-gray-700/50">
            <UserIcon className="h-5 w-5 text-gray-400" />
          </div>
          <span
            className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-gray-800 ${config.dotClass}`}
            title={getConnectionStateLabel(connectionState)}
          />
        </div>

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

              <div className="flex items-center gap-1.5 text-gray-500">
                <ClockIcon className="h-3.5 w-3.5" />
                <span>{formatRelativeTime(lastSuccessAt)}</span>
              </div>
            </div>
          )}
        </div>

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
