/**
 * Vault Test Fixtures
 *
 * Mock data for vault sharing system tests.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IVaultIdentity,
  IPublicIdentity,
  IContact,
  IVaultFolder,
  IFolderItem,
  IPermissionGrant,
  IShareLink,
  IChangeLogEntry,
  IVersionSnapshot,
  IQueuedMessage,
} from '@/types/vault';

// =============================================================================
// Identity Fixtures
// =============================================================================

export const mockIdentity: IVaultIdentity = {
  id: 'identity-test-1',
  displayName: 'Test User',
  publicKey: 'dGVzdC1wdWJsaWMta2V5LWJhc2U2NA==',
  privateKey: 'dGVzdC1wcml2YXRlLWtleS1iYXNlNjQ=',
  friendCode: 'TEST-1234-ABCD',
  createdAt: '2025-01-01T00:00:00.000Z',
  avatar: 'default',
};

export const mockPublicIdentity: IPublicIdentity = {
  displayName: 'Test User',
  publicKey: 'dGVzdC1wdWJsaWMta2V5LWJhc2U2NA==',
  friendCode: 'TEST-1234-ABCD',
  avatar: 'default',
};

export const mockContact: IContact = {
  id: 'contact-1',
  friendCode: 'PEER-5678-EFGH',
  publicKey: 'cGVlci1wdWJsaWMta2V5LWJhc2U2NA==',
  nickname: null,
  displayName: 'Peer User',
  avatar: null,
  addedAt: '2025-01-02T00:00:00.000Z',
  lastSeenAt: null,
  isTrusted: false,
  notes: null,
};

export const mockContact2: IContact = {
  id: 'contact-2',
  friendCode: 'PEER-9999-IJKL',
  publicKey: 'cGVlci0yLXB1YmxpYy1rZXk=',
  nickname: 'Friend',
  displayName: 'Another Peer',
  avatar: 'avatar-2',
  addedAt: '2025-01-03T00:00:00.000Z',
  lastSeenAt: '2025-01-15T12:00:00.000Z',
  isTrusted: true,
  notes: 'Trusted gaming buddy',
};

// =============================================================================
// Folder Fixtures
// =============================================================================

export const mockFolder: IVaultFolder = {
  id: 'folder-1',
  name: 'My Mechs',
  description: 'Collection of custom mechs',
  parentId: null,
  createdAt: '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z',
  itemCount: 0,
  isShared: false,
};

export const mockFolder2: IVaultFolder = {
  id: 'folder-2',
  name: 'Assault Mechs',
  description: 'Heavy hitters',
  parentId: 'folder-1',
  createdAt: '2025-01-02T10:00:00.000Z',
  updatedAt: '2025-01-02T10:00:00.000Z',
  itemCount: 3,
  isShared: true,
};

export const mockFolderItem: IFolderItem = {
  folderId: 'folder-1',
  itemId: 'unit-atlas-1',
  itemType: 'unit',
  assignedAt: '2025-01-01T11:00:00.000Z',
};

export const mockFolderItems: IFolderItem[] = [
  {
    folderId: 'folder-2',
    itemId: 'unit-atlas-1',
    itemType: 'unit',
    assignedAt: '2025-01-02T11:00:00.000Z',
  },
  {
    folderId: 'folder-2',
    itemId: 'unit-dire-wolf-1',
    itemType: 'unit',
    assignedAt: '2025-01-02T11:05:00.000Z',
  },
  {
    folderId: 'folder-2',
    itemId: 'unit-timber-wolf-1',
    itemType: 'unit',
    assignedAt: '2025-01-02T11:10:00.000Z',
  },
];

// =============================================================================
// Permission Fixtures
// =============================================================================

export const mockPermission: IPermissionGrant = {
  id: 'perm-1',
  granteeId: 'PEER-5678-EFGH',
  scopeType: 'item',
  scopeId: 'unit-atlas-1',
  scopeCategory: null,
  level: 'read',
  expiresAt: null,
  createdAt: '2025-01-05T00:00:00.000Z',
  granteeName: 'Peer User',
};

export const mockFolderPermission: IPermissionGrant = {
  id: 'perm-2',
  granteeId: 'PEER-5678-EFGH',
  scopeType: 'folder',
  scopeId: 'folder-2',
  scopeCategory: null,
  level: 'write',
  expiresAt: '2025-06-01T00:00:00.000Z',
  createdAt: '2025-01-05T00:00:00.000Z',
  granteeName: 'Peer User',
};

export const mockPublicPermission: IPermissionGrant = {
  id: 'perm-3',
  granteeId: 'public',
  scopeType: 'item',
  scopeId: 'unit-public-mech',
  scopeCategory: null,
  level: 'read',
  expiresAt: null,
  createdAt: '2025-01-06T00:00:00.000Z',
};

// =============================================================================
// Share Link Fixtures
// =============================================================================

export const mockShareLink: IShareLink = {
  id: 'link-1',
  token: 'abc123def456',
  scopeType: 'item',
  scopeId: 'unit-atlas-1',
  scopeCategory: null,
  level: 'read',
  expiresAt: null,
  maxUses: null,
  useCount: 5,
  createdAt: '2025-01-07T00:00:00.000Z',
  label: 'Public Atlas link',
  isActive: true,
};

export const mockExpiredShareLink: IShareLink = {
  id: 'link-2',
  token: 'expired999',
  scopeType: 'folder',
  scopeId: 'folder-1',
  scopeCategory: null,
  level: 'read',
  expiresAt: '2024-12-31T23:59:59.000Z', // Past date
  maxUses: null,
  useCount: 0,
  createdAt: '2024-12-01T00:00:00.000Z',
  isActive: true,
};

// =============================================================================
// Version History Fixtures
// =============================================================================

export const mockUnitContent = JSON.stringify({
  id: 'unit-atlas-1',
  chassis: 'Atlas',
  model: 'AS7-D',
  tonnage: 100,
  techBase: 'Inner Sphere',
  armor: { total: 304 },
  weapons: [
    { name: 'AC/20', location: 'RT' },
    { name: 'LRM 20', location: 'LT' },
  ],
});

export const mockUnitContentV2 = JSON.stringify({
  id: 'unit-atlas-1',
  chassis: 'Atlas',
  model: 'AS7-D-DC',
  tonnage: 100,
  techBase: 'Inner Sphere',
  armor: { total: 304 },
  weapons: [
    { name: 'AC/20', location: 'RT' },
    { name: 'LRM 20', location: 'LT' },
    { name: 'Medium Laser', location: 'CT' },
  ],
  notes: 'Command variant',
});

export const mockVersionSnapshot: IVersionSnapshot = {
  id: 'version-1',
  contentType: 'unit',
  itemId: 'unit-atlas-1',
  version: 1,
  contentHash: 'abc123hash',
  content: mockUnitContent,
  createdAt: '2025-01-10T10:00:00.000Z',
  createdBy: 'local',
  message: 'Initial version',
  sizeBytes: mockUnitContent.length,
};

export const mockVersionSnapshot2: IVersionSnapshot = {
  id: 'version-2',
  contentType: 'unit',
  itemId: 'unit-atlas-1',
  version: 2,
  contentHash: 'def456hash',
  content: mockUnitContentV2,
  createdAt: '2025-01-10T11:00:00.000Z',
  createdBy: 'PEER-5678-EFGH',
  message: 'Added command variant upgrades',
  sizeBytes: mockUnitContentV2.length,
};

export function createVersionSnapshot(
  overrides: Partial<IVersionSnapshot> = {},
): IVersionSnapshot {
  const content = overrides.content ?? mockUnitContent;
  return {
    id: `version-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    contentType: 'unit',
    itemId: 'unit-test',
    version: 1,
    contentHash: `hash-${Date.now()}`,
    content,
    createdAt: new Date().toISOString(),
    createdBy: 'local',
    message: null,
    sizeBytes: content.length,
    ...overrides,
  };
}

// =============================================================================
// Change Log Fixtures
// =============================================================================

export const mockChangeLogEntry: IChangeLogEntry = {
  id: 'change-1',
  changeType: 'create',
  contentType: 'unit',
  itemId: 'unit-atlas-1',
  timestamp: '2025-01-10T10:00:00.000Z',
  version: 1,
  contentHash: 'abc123hash',
  data: mockUnitContent,
  synced: false,
  sourceId: null,
};

export const mockUpdateChangeLogEntry: IChangeLogEntry = {
  id: 'change-2',
  changeType: 'update',
  contentType: 'unit',
  itemId: 'unit-atlas-1',
  timestamp: '2025-01-10T11:00:00.000Z',
  version: 2,
  contentHash: 'def456hash',
  data: mockUnitContentV2,
  synced: false,
  sourceId: null,
};

export const mockDeleteChangeLogEntry: IChangeLogEntry = {
  id: 'change-3',
  changeType: 'delete',
  contentType: 'unit',
  itemId: 'unit-old-1',
  timestamp: '2025-01-10T12:00:00.000Z',
  version: 3,
  contentHash: null,
  data: null,
  synced: true,
  sourceId: null,
};

// =============================================================================
// Offline Queue Fixtures
// =============================================================================

export const mockQueuedMessage: IQueuedMessage = {
  id: 'queue-1',
  targetPeerId: 'PEER-5678-EFGH',
  messageType: 'change',
  payload: JSON.stringify({
    type: 'change',
    messageId: 'msg-123',
    senderId: 'TEST-1234-ABCD',
    timestamp: '2025-01-10T10:00:00.000Z',
    payload: mockChangeLogEntry,
  }),
  queuedAt: '2025-01-10T10:01:00.000Z',
  expiresAt: '2025-01-17T10:01:00.000Z',
  attempts: 0,
  lastAttemptAt: null,
  status: 'pending',
  priority: 0,
  sizeBytes: 512,
};

export const mockFailedQueuedMessage: IQueuedMessage = {
  id: 'queue-2',
  targetPeerId: 'PEER-5678-EFGH',
  messageType: 'change',
  payload: JSON.stringify({ type: 'change', data: 'some-data' }),
  queuedAt: '2025-01-08T10:00:00.000Z',
  expiresAt: '2025-01-15T10:00:00.000Z',
  attempts: 3,
  lastAttemptAt: '2025-01-10T10:00:00.000Z',
  status: 'failed',
  priority: 0,
  sizeBytes: 100,
};

export const mockExpiredQueuedMessage: IQueuedMessage = {
  id: 'queue-3',
  targetPeerId: 'PEER-9999-IJKL',
  messageType: 'sync_request',
  payload: JSON.stringify({ type: 'sync_request', fromVersion: 0 }),
  queuedAt: '2024-12-01T10:00:00.000Z',
  expiresAt: '2024-12-08T10:00:00.000Z', // Past date
  attempts: 2,
  lastAttemptAt: '2024-12-05T10:00:00.000Z',
  status: 'expired',
  priority: 0,
  sizeBytes: 50,
};

export function createQueuedMessage(
  overrides: Partial<IQueuedMessage> = {},
): IQueuedMessage {
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const payload = overrides.payload ?? JSON.stringify({ type: 'ping' });
  return {
    id: `queue-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    targetPeerId: 'PEER-5678-EFGH',
    messageType: 'ping',
    payload,
    queuedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    attempts: 0,
    lastAttemptAt: null,
    status: 'pending',
    priority: 0,
    sizeBytes: payload.length,
    ...overrides,
  };
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a mock folder with optional overrides
 */
export function createFolder(
  overrides: Partial<IVaultFolder> = {},
): IVaultFolder {
  const now = new Date().toISOString();
  return {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: 'Test Folder',
    description: null,
    parentId: null,
    createdAt: now,
    updatedAt: now,
    itemCount: 0,
    isShared: false,
    ...overrides,
  };
}

/**
 * Create a mock contact with optional overrides
 */
export function createContact(overrides: Partial<IContact> = {}): IContact {
  const id = `contact-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const friendCode = `PEER-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  return {
    id,
    friendCode,
    publicKey: Buffer.from(`pubkey-${friendCode}`).toString('base64'),
    nickname: null,
    displayName: `User ${friendCode.slice(5, 9)}`,
    avatar: null,
    addedAt: new Date().toISOString(),
    lastSeenAt: null,
    isTrusted: false,
    notes: null,
    ...overrides,
  };
}

/**
 * Create a mock permission grant with optional overrides
 */
export function createPermission(
  overrides: Partial<IPermissionGrant> = {},
): IPermissionGrant {
  return {
    id: `perm-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    granteeId: 'PEER-5678-EFGH',
    scopeType: 'item',
    scopeId: 'unit-test',
    scopeCategory: null,
    level: 'read',
    expiresAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock share link with optional overrides
 */
export function createShareLink(
  overrides: Partial<IShareLink> = {},
): IShareLink {
  return {
    id: `link-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    token:
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
    scopeType: 'item',
    scopeId: 'unit-test',
    scopeCategory: null,
    level: 'read',
    expiresAt: null,
    maxUses: null,
    useCount: 0,
    createdAt: new Date().toISOString(),
    isActive: true,
    ...overrides,
  };
}

/**
 * Create a mock change log entry with optional overrides
 */
export function createChangeLogEntry(
  overrides: Partial<IChangeLogEntry> = {},
): IChangeLogEntry {
  return {
    id: `change-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    changeType: 'create',
    contentType: 'unit',
    itemId: 'unit-test',
    timestamp: new Date().toISOString(),
    version: 1,
    contentHash: `hash-${Date.now()}`,
    data: JSON.stringify({ test: true }),
    synced: false,
    sourceId: null,
    ...overrides,
  };
}

// =============================================================================
// Batch Generators
// =============================================================================

/**
 * Generate multiple folders with hierarchy
 */
export function generateFolderHierarchy(): IVaultFolder[] {
  const root1 = createFolder({ id: 'root-1', name: 'Mechs' });
  const root2 = createFolder({ id: 'root-2', name: 'Forces' });
  const child1 = createFolder({
    id: 'child-1',
    name: 'Light Mechs',
    parentId: 'root-1',
  });
  const child2 = createFolder({
    id: 'child-2',
    name: 'Heavy Mechs',
    parentId: 'root-1',
  });
  const grandchild1 = createFolder({
    id: 'grandchild-1',
    name: 'Inner Sphere Light',
    parentId: 'child-1',
  });

  return [root1, root2, child1, child2, grandchild1];
}

/**
 * Generate version history for an item
 */
export function generateVersionHistory(
  itemId: string,
  count: number,
): IVersionSnapshot[] {
  const versions: IVersionSnapshot[] = [];
  const baseTime = new Date('2025-01-01T00:00:00.000Z').getTime();

  for (let i = 1; i <= count; i++) {
    const content = JSON.stringify({
      id: itemId,
      version: i,
      data: `Version ${i} data`,
    });
    versions.push({
      id: `version-${itemId}-${i}`,
      contentType: 'unit',
      itemId,
      version: i,
      contentHash: `hash-${i}-${Date.now()}`,
      content,
      createdAt: new Date(baseTime + i * 3600000).toISOString(),
      createdBy: i % 2 === 0 ? 'PEER-5678-EFGH' : 'local',
      message: `Change ${i}`,
      sizeBytes: content.length,
    });
  }

  return versions;
}

/**
 * Generate queue messages for multiple peers
 */
export function generateQueueMessages(
  peerCount: number,
  messagesPerPeer: number,
): IQueuedMessage[] {
  const messages: IQueuedMessage[] = [];

  for (let p = 0; p < peerCount; p++) {
    const peerId = `PEER-${String(p).padStart(4, '0')}-TEST`;
    for (let m = 0; m < messagesPerPeer; m++) {
      messages.push(
        createQueuedMessage({
          id: `queue-${p}-${m}`,
          targetPeerId: peerId,
          status: m % 3 === 0 ? 'failed' : 'pending',
          priority: m % 5,
        }),
      );
    }
  }

  return messages;
}
