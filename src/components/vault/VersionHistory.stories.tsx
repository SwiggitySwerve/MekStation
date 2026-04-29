import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';
import { useEffect } from 'react';

import type {
  IVersionDiff,
  IVersionHistorySummary,
  IVersionSnapshot,
  ShareableContentType,
} from '@/types/vault';

import {
  VersionDiffView,
  VersionHistoryPanel,
  VersionPreview,
  VersionRollbackDialog,
} from './VersionHistory';

const itemId = 'unit-atlas-as7-d';
const contentType: ShareableContentType = 'unit';

const versions: IVersionSnapshot[] = [
  {
    id: 'version-3',
    contentType,
    itemId,
    version: 3,
    contentHash: 'f2d624d5e1a44f60b99ceef24c6272a8',
    content: JSON.stringify(
      {
        name: 'Atlas AS7-D',
        battleValue: 1897,
        armor: { head: 9, centerTorso: 47, leftTorso: 32, rightTorso: 32 },
        weapons: ['AC/20', 'LRM 20', 'Medium Laser', 'SRM 6'],
      },
      null,
      2,
    ),
    createdAt: '2026-04-29T04:30:00.000Z',
    createdBy: 'local',
    message: 'Rebalanced torso armor after refit',
    sizeBytes: 2846,
  },
  {
    id: 'version-2',
    contentType,
    itemId,
    version: 2,
    contentHash: 'a06a44e8b8fb4c6f9fca76f9ed67b422',
    content: JSON.stringify(
      {
        name: 'Atlas AS7-D',
        battleValue: 1884,
        armor: { head: 9, centerTorso: 45, leftTorso: 31, rightTorso: 31 },
        weapons: ['AC/20', 'LRM 20', 'Medium Laser', 'SRM 6'],
      },
      null,
      2,
    ),
    createdAt: '2026-04-28T21:15:00.000Z',
    createdBy: 'peer-kestrel-713f',
    message: 'Imported campaign refit',
    sizeBytes: 2798,
  },
  {
    id: 'version-1',
    contentType,
    itemId,
    version: 1,
    contentHash: '6e1ec2f23dc64a7ca31f8fe18f9d34af',
    content: JSON.stringify(
      {
        name: 'Atlas AS7-D',
        battleValue: 1872,
        armor: { head: 9, centerTorso: 44, leftTorso: 30, rightTorso: 30 },
        weapons: ['AC/20', 'LRM 20', 'Medium Laser', 'SRM 6'],
      },
      null,
      2,
    ),
    createdAt: '2026-04-27T18:00:00.000Z',
    createdBy: 'local',
    message: 'Initial vault save',
    sizeBytes: 2719,
  },
];

const summary: IVersionHistorySummary = {
  itemId,
  contentType,
  currentVersion: 3,
  totalVersions: versions.length,
  oldestVersion: versions[versions.length - 1].createdAt,
  newestVersion: versions[0].createdAt,
  totalSizeBytes: versions.reduce(
    (total, version) => total + version.sizeBytes,
    0,
  ),
};

const diff: IVersionDiff = {
  fromVersion: 2,
  toVersion: 3,
  contentType,
  itemId,
  changedFields: ['battleValue', 'armor.centerTorso', 'armor.leftTorso'],
  additions: {
    tags: ['campaign-ready'],
  },
  deletions: {},
  modifications: {
    battleValue: { from: 1884, to: 1897 },
    'armor.centerTorso': { from: 45, to: 47 },
    'armor.leftTorso': { from: 31, to: 32 },
  },
};

function createJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const VersionFetchDecorator: Decorator = (Story) => {
  useEffect(() => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const url = String(input);

      if (url.includes('/api/vault/versions/diff')) {
        return createJsonResponse(diff);
      }

      if (url.includes('/api/vault/versions/rollback')) {
        return createJsonResponse({ ok: true });
      }

      if (url.includes('/api/vault/versions')) {
        return createJsonResponse({ versions, summary });
      }

      return originalFetch.call(globalThis, input, init);
    };

    return () => {
      globalThis.fetch = originalFetch;
    };
  }, []);

  return <Story />;
};

const meta: Meta<typeof VersionHistoryPanel> = {
  title: 'Vault/VersionHistory',
  component: VersionHistoryPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    VersionFetchDecorator,
    (Story) => (
      <div className="w-[760px] max-w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    itemId,
    contentType,
    onVersionSelect: fn(),
    onRollback: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof VersionHistoryPanel>;

export const HistoryPanel: Story = {};

export const DiffView: Story = {
  render: () => (
    <VersionDiffView
      itemId={itemId}
      contentType={contentType}
      versions={versions}
      initialFromVersion={2}
      initialToVersion={3}
    />
  ),
};

export const PreviewModal: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <div className="min-h-[640px] bg-gray-950">
      <VersionPreview
        isOpen
        onClose={fn()}
        version={versions[0]}
        onRollback={fn()}
      />
    </div>
  ),
};

export const RollbackDialog: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <div className="min-h-[540px] bg-gray-950">
      <VersionRollbackDialog
        isOpen
        onClose={fn()}
        version={versions[1]}
        currentVersion={3}
        onConfirm={fn()}
      />
    </div>
  ),
};
