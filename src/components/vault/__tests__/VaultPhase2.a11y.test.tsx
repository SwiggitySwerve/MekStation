import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import React from 'react';

import type {
  IPeerQueueSummary,
  IQueueStats,
  ISyncConflict,
  IVaultFolder,
} from '@/types/vault';

import { ConflictResolutionDialog } from '@/components/vault/ConflictResolutionDialog';
import { FolderList } from '@/components/vault/FolderManager';
import { SyncStatusPanel } from '@/components/vault/SyncStatus';

const queueStats: IQueueStats = {
  totalMessages: 9,
  byStatus: {
    pending: 5,
    sending: 1,
    sent: 1,
    failed: 1,
    expired: 1,
  },
  totalSizeBytes: 64000,
  targetPeerCount: 2,
  expiringSoon: 2,
};

const peerSummaries: IPeerQueueSummary[] = [
  {
    peerId: 'KSTL-713F-VAULT-01',
    pendingCount: 5,
    pendingSizeBytes: 64000,
    oldestPending: '2026-04-29T02:12:00.000Z',
    failedCount: 1,
    lastSuccessAt: '2026-04-29T04:18:00.000Z',
  },
];

const folders: IVaultFolder[] = [
  {
    id: 'folder-command',
    name: 'Command Lance',
    description: 'Front-line roster',
    parentId: null,
    createdAt: '2026-04-24T17:00:00.000Z',
    updatedAt: '2026-04-29T02:00:00.000Z',
    itemCount: 4,
    isShared: true,
  },
  {
    id: 'folder-command-pilots',
    name: 'Pilots',
    description: 'Pilot notes',
    parentId: 'folder-command',
    createdAt: '2026-04-25T17:00:00.000Z',
    updatedAt: '2026-04-29T02:00:00.000Z',
    itemCount: 4,
    isShared: false,
  },
];

const conflict: ISyncConflict = {
  id: 'conflict-unit-atlas',
  contentType: 'unit',
  itemId: 'unit-atlas-as7-d',
  itemName: 'Atlas AS7-D',
  localVersion: 12,
  localHash: 'local-a06a44e8b8fb4c6f9fca76f9ed67b422',
  remoteVersion: 13,
  remoteHash: 'remote-f2d624d5e1a44f60b99ceef24c6272a8',
  remotePeerId: 'KSTL-713F-VAULT-01',
  detectedAt: '2026-04-29T04:22:00.000Z',
  resolution: 'pending',
};

describe('Vault Phase 2 a11y', () => {
  it('has no axe violations for the sync status panel', async () => {
    const { container } = render(
      <SyncStatusPanel
        isOpen
        onClose={() => undefined}
        stats={queueStats}
        peerSummaries={peerSummaries}
        peerStates={{ 'KSTL-713F-VAULT-01': 'connected' }}
        peerNames={{ 'KSTL-713F-VAULT-01': 'Kestrel Lance' }}
        onFlushAll={async () => undefined}
        onClearExpired={async () => undefined}
        onFlushPeer={async () => undefined}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations for the folder tree', async () => {
    const { container } = render(
      <div className="bg-gray-900 p-4">
        <FolderList
          folders={folders}
          selectedFolderId="folder-command"
          expandedFolderIds={new Set(['folder-command'])}
          onSelectFolder={() => undefined}
          onToggleExpand={() => undefined}
        />
      </div>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations for the conflict resolution modal', async () => {
    const { container } = render(
      <ConflictResolutionDialog
        isOpen
        onClose={() => undefined}
        conflict={conflict}
        onResolved={() => undefined}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
