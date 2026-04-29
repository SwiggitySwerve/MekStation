import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';

import type { IPeerQueueSummary, IQueueStats } from '@/types/vault';

import {
  PeerSyncRow,
  SyncStatusIndicator,
  SyncStatusPanel,
} from './SyncStatus';

const queueStats: IQueueStats = {
  totalMessages: 19,
  byStatus: {
    pending: 11,
    sending: 2,
    sent: 3,
    failed: 2,
    expired: 1,
  },
  totalSizeBytes: 148872,
  targetPeerCount: 3,
  expiringSoon: 4,
};

const peerSummaries: IPeerQueueSummary[] = [
  {
    peerId: 'KSTL-713F-VAULT-01',
    pendingCount: 5,
    pendingSizeBytes: 48216,
    oldestPending: '2026-04-29T02:12:00.000Z',
    failedCount: 0,
    lastSuccessAt: '2026-04-29T04:18:00.000Z',
  },
  {
    peerId: 'NOVA-422B-VAULT-09',
    pendingCount: 6,
    pendingSizeBytes: 100656,
    oldestPending: '2026-04-29T01:03:00.000Z',
    failedCount: 2,
    lastSuccessAt: '2026-04-28T21:41:00.000Z',
  },
];

const meta: Meta<typeof SyncStatusPanel> = {
  title: 'Vault/SyncStatus',
  component: SyncStatusPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    isOpen: true,
    onClose: fn(),
    stats: queueStats,
    peerSummaries,
    peerStates: {
      'KSTL-713F-VAULT-01': 'connected',
      'NOVA-422B-VAULT-09': 'failed',
    },
    peerNames: {
      'KSTL-713F-VAULT-01': 'Kestrel Lance',
      'NOVA-422B-VAULT-09': 'Nova Relay',
    },
    onFlushAll: fn(async () => undefined),
    onClearExpired: fn(async () => undefined),
    onFlushPeer: fn(async () => undefined),
  },
};

export default meta;
type Story = StoryObj<typeof SyncStatusPanel>;

export const PanelWithPeers: Story = {};

export const LoadingPanel: Story = {
  args: {
    isLoading: true,
    stats: null,
    peerSummaries: [],
  },
};

export const ErrorPanel: Story = {
  args: {
    error: 'Signaling relay timed out while loading queue state.',
    peerSummaries: [],
  },
};

export const Indicators: Story = {
  parameters: {
    layout: 'centered',
  },
  render: () => (
    <div className="flex items-center gap-4 rounded-lg bg-gray-900 p-6">
      <SyncStatusIndicator state="online" showLabel />
      <SyncStatusIndicator state="syncing" pendingCount={3} showLabel />
      <SyncStatusIndicator state="offline" showLabel />
      <SyncStatusIndicator state="error" pendingCount={12} showLabel />
    </div>
  ),
};

export const PeerRows: Story = {
  parameters: {
    layout: 'centered',
  },
  render: () => (
    <div className="w-[520px] divide-y divide-gray-700 rounded-lg bg-gray-800">
      <PeerSyncRow
        peerId="KSTL-713F-VAULT-01"
        peerName="Kestrel Lance"
        connectionState="connected"
        pendingCount={5}
        pendingSizeBytes={48216}
        lastSuccessAt="2026-04-29T04:18:00.000Z"
        onFlush={fn(async () => undefined)}
      />
      <PeerSyncRow
        peerId="NOVA-422B-VAULT-09"
        peerName="Nova Relay"
        connectionState="connecting"
        pendingCount={0}
        isSyncing
        syncProgress={63}
        lastSuccessAt="2026-04-29T03:44:00.000Z"
      />
    </div>
  ),
};
