import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';

import type {
  IContact,
  IFolderItem,
  IPermissionGrant,
  IVaultFolder,
} from '@/types/vault';

import {
  FolderCreateDialog,
  FolderEditDialog,
  FolderItemsPanel,
  FolderList,
  FolderSharePanel,
} from './FolderManager';

const folders: IVaultFolder[] = [
  {
    id: 'folder-command',
    name: 'Command Lance',
    description: 'Front-line machines and veteran pilots',
    parentId: null,
    createdAt: '2026-04-24T17:00:00.000Z',
    updatedAt: '2026-04-29T02:00:00.000Z',
    itemCount: 8,
    isShared: true,
  },
  {
    id: 'folder-command-mechs',
    name: 'BattleMechs',
    description: 'Current deployment roster',
    parentId: 'folder-command',
    createdAt: '2026-04-25T17:00:00.000Z',
    updatedAt: '2026-04-29T02:00:00.000Z',
    itemCount: 4,
    isShared: true,
  },
  {
    id: 'folder-command-pilots',
    name: 'Pilots',
    description: 'Gunnery and SPA notes',
    parentId: 'folder-command',
    createdAt: '2026-04-25T18:00:00.000Z',
    updatedAt: '2026-04-28T23:00:00.000Z',
    itemCount: 4,
    isShared: false,
  },
  {
    id: 'folder-contracts',
    name: 'Contract Prep',
    description: 'Forces staged for the next sortie',
    parentId: null,
    createdAt: '2026-04-26T15:00:00.000Z',
    updatedAt: '2026-04-28T14:00:00.000Z',
    itemCount: 5,
    isShared: false,
  },
];

const contacts: IContact[] = [
  {
    id: 'contact-1',
    friendCode: 'KSTL-713F-VAULT-01',
    publicKey: 'kestrel-public-key',
    nickname: 'Kestrel',
    displayName: 'Kestrel Lance',
    avatar: null,
    addedAt: '2026-04-20T15:00:00.000Z',
    lastSeenAt: '2026-04-29T03:45:00.000Z',
    isTrusted: true,
    notes: 'Campaign co-op partner',
  },
  {
    id: 'contact-2',
    friendCode: 'NOVA-422B-VAULT-09',
    publicKey: 'nova-public-key',
    nickname: null,
    displayName: 'Nova Relay',
    avatar: null,
    addedAt: '2026-04-21T15:00:00.000Z',
    lastSeenAt: '2026-04-28T22:12:00.000Z',
    isTrusted: false,
    notes: null,
  },
];

const shares: IPermissionGrant[] = [
  {
    id: 'grant-1',
    granteeId: 'KSTL-713F-VAULT-01',
    scopeType: 'folder',
    scopeId: 'folder-command',
    scopeCategory: null,
    level: 'write',
    expiresAt: null,
    createdAt: '2026-04-27T13:00:00.000Z',
    granteeName: 'Kestrel Lance',
  },
];

const items: IFolderItem[] = [
  {
    folderId: 'folder-command',
    itemId: 'Atlas AS7-D',
    itemType: 'unit',
    assignedAt: '2026-04-29T01:00:00.000Z',
  },
  {
    folderId: 'folder-command',
    itemId: 'Major Tamsin Vale',
    itemType: 'pilot',
    assignedAt: '2026-04-29T01:05:00.000Z',
  },
  {
    folderId: 'folder-command',
    itemId: 'First Crucis Lancers',
    itemType: 'force',
    assignedAt: '2026-04-29T01:10:00.000Z',
  },
];

const meta: Meta<typeof FolderList> = {
  title: 'Vault/FolderManager',
  component: FolderList,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[720px] max-w-full rounded-lg bg-gray-900 p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    folders,
    selectedFolderId: 'folder-command',
    expandedFolderIds: new Set(['folder-command']),
    onSelectFolder: fn(),
    onToggleExpand: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof FolderList>;

export const FolderTree: Story = {};

export const Loading: Story = {
  args: {
    folders: [],
    isLoading: true,
  },
};

export const CreateDialog: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <div className="min-h-[520px] bg-gray-950">
      <FolderCreateDialog
        isOpen
        onClose={fn()}
        parentFolders={folders}
        onCreated={fn()}
      />
    </div>
  ),
};

export const EditDialog: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <div className="min-h-[540px] bg-gray-950">
      <FolderEditDialog
        isOpen
        onClose={fn()}
        folder={folders[0]}
        onUpdated={fn()}
        onDeleted={fn()}
      />
    </div>
  ),
};

export const SharingAndContents: Story = {
  render: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <FolderSharePanel
        folder={folders[0]}
        shares={shares}
        contacts={contacts}
        onAddShare={fn()}
        onRemoveShare={fn()}
      />
      <FolderItemsPanel
        folder={folders[0]}
        items={items}
        onAddItem={fn()}
        onRemoveItem={fn()}
      />
    </div>
  ),
};
