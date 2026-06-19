import React from 'react';

import type {
  IQueueStats,
  IPeerQueueSummary,
  P2PConnectionState,
} from '@/types/vault';

import {
  SyncErrorState,
  SyncLoadingState,
  SyncStatusHeader,
} from './SyncStatusPanelChrome';
import {
  GlobalQueueActions,
  PeerList,
  QueueStatsGrid,
  QueueStorageInfo,
} from './SyncStatusPanelSections';

interface SyncStatusPanelContentProps {
  stats?: IQueueStats | null;
  peerSummaries: IPeerQueueSummary[];
  peerStates: Record<string, P2PConnectionState>;
  peerNames: Record<string, string>;
  isLoading: boolean;
  error?: string | null;
  className: string;
  isFlushingAll: boolean;
  isClearingExpired: boolean;
  onClose: () => void;
  onFlushAll?: () => Promise<void>;
  onClearExpired?: () => Promise<void>;
  onFlushPeer?: (peerId: string) => Promise<void>;
  onFlushAllClick: () => void | Promise<void>;
  onClearExpiredClick: () => void | Promise<void>;
}

export function SyncStatusPanelContent({
  stats,
  peerSummaries,
  peerStates,
  peerNames,
  isLoading,
  error,
  className,
  isFlushingAll,
  isClearingExpired,
  onClose,
  onFlushAll,
  onClearExpired,
  onFlushPeer,
  onFlushAllClick,
  onClearExpiredClick,
}: SyncStatusPanelContentProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className={`mx-4 flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-800 shadow-2xl shadow-black/50 ${className}`}
      >
        <SyncStatusHeader onClose={onClose} />
        <SyncStatusBody
          stats={stats}
          peerSummaries={peerSummaries}
          peerStates={peerStates}
          peerNames={peerNames}
          isLoading={isLoading}
          error={error}
          isFlushingAll={isFlushingAll}
          isClearingExpired={isClearingExpired}
          onFlushAll={onFlushAll}
          onClearExpired={onClearExpired}
          onFlushPeer={onFlushPeer}
          onFlushAllClick={onFlushAllClick}
          onClearExpiredClick={onClearExpiredClick}
        />
      </div>
    </div>
  );
}

interface SyncStatusBodyProps {
  stats?: IQueueStats | null;
  peerSummaries: IPeerQueueSummary[];
  peerStates: Record<string, P2PConnectionState>;
  peerNames: Record<string, string>;
  isLoading: boolean;
  error?: string | null;
  isFlushingAll: boolean;
  isClearingExpired: boolean;
  onFlushAll?: () => Promise<void>;
  onClearExpired?: () => Promise<void>;
  onFlushPeer?: (peerId: string) => Promise<void>;
  onFlushAllClick: () => void | Promise<void>;
  onClearExpiredClick: () => void | Promise<void>;
}

function SyncStatusBody({
  stats,
  peerSummaries,
  peerStates,
  peerNames,
  isLoading,
  error,
  isFlushingAll,
  isClearingExpired,
  onFlushAll,
  onClearExpired,
  onFlushPeer,
  onFlushAllClick,
  onClearExpiredClick,
}: SyncStatusBodyProps): React.ReactElement {
  if (isLoading) {
    return <SyncLoadingState />;
  }

  if (error) {
    return <SyncErrorState error={error} />;
  }

  return (
    <SyncReadyContent
      stats={stats}
      peerSummaries={peerSummaries}
      peerStates={peerStates}
      peerNames={peerNames}
      isFlushingAll={isFlushingAll}
      isClearingExpired={isClearingExpired}
      onFlushAll={onFlushAll}
      onClearExpired={onClearExpired}
      onFlushPeer={onFlushPeer}
      onFlushAllClick={onFlushAllClick}
      onClearExpiredClick={onClearExpiredClick}
    />
  );
}

interface SyncReadyContentProps {
  stats?: IQueueStats | null;
  peerSummaries: IPeerQueueSummary[];
  peerStates: Record<string, P2PConnectionState>;
  peerNames: Record<string, string>;
  isFlushingAll: boolean;
  isClearingExpired: boolean;
  onFlushAll?: () => Promise<void>;
  onClearExpired?: () => Promise<void>;
  onFlushPeer?: (peerId: string) => Promise<void>;
  onFlushAllClick: () => void | Promise<void>;
  onClearExpiredClick: () => void | Promise<void>;
}

function SyncReadyContent({
  stats,
  peerSummaries,
  peerStates,
  peerNames,
  isFlushingAll,
  isClearingExpired,
  onFlushAll,
  onClearExpired,
  onFlushPeer,
  onFlushAllClick,
  onClearExpiredClick,
}: SyncReadyContentProps): React.ReactElement {
  const totalPending = stats?.byStatus?.pending ?? 0;
  const totalFailed = stats?.byStatus?.failed ?? 0;
  const totalExpired = stats?.byStatus?.expired ?? 0;
  const expiringSoon = stats?.expiringSoon ?? 0;

  return (
    <>
      <QueueStatsGrid
        totalPending={totalPending}
        totalFailed={totalFailed}
        totalExpired={totalExpired}
        expiringSoon={expiringSoon}
      />
      <QueueStorageInfo stats={stats} />
      <GlobalQueueActions
        onFlushAll={onFlushAll}
        onClearExpired={onClearExpired}
        onFlushAllClick={onFlushAllClick}
        onClearExpiredClick={onClearExpiredClick}
        isFlushingAll={isFlushingAll}
        isClearingExpired={isClearingExpired}
        totalPending={totalPending}
        totalExpired={totalExpired}
      />
      <PeerList
        peerSummaries={peerSummaries}
        peerStates={peerStates}
        peerNames={peerNames}
        onFlushPeer={onFlushPeer}
      />
    </>
  );
}
