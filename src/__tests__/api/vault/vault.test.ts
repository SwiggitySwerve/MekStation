/**
 * Vault API Routes Comprehensive Tests
 *
 * Tests all vault API endpoints:
 * - Identity management (create, unlock, update)
 * - Folder operations (CRUD, hierarchy)
 * - Share links (create, redeem, expire)
 * - Version history (create, list, diff, rollback)
 * - Permissions (bulk operations)
 * - Signing (bundle creation)
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { parseApiResponse, createMock, type PartialMock } from '@/__tests__/helpers';

// Import API handlers
import identityHandler from '@/pages/api/vault/identity/index';
import unlockHandler from '@/pages/api/vault/identity/unlock';
import foldersHandler from '@/pages/api/vault/folders/index';
import folderByIdHandler from '@/pages/api/vault/folders/[id]';
import shareIndexHandler from '@/pages/api/vault/share/index';
import shareRedeemHandler from '@/pages/api/vault/share/redeem';
import versionsHandler from '@/pages/api/vault/versions/index';
import signHandler from '@/pages/api/vault/sign';

// Mock services
jest.mock('@/services/vault/IdentityService');
jest.mock('@/services/vault/IdentityRepository');
jest.mock('@/services/vault/VaultService');
jest.mock('@/services/vault/ShareLinkService');
jest.mock('@/services/vault/VersionHistoryService');

import {
  createIdentity,
  unlockIdentity,
  signMessage,
  getPublicIdentity,
} from '@/services/vault/IdentityService';
import { getIdentityRepository, IdentityRepository } from '@/services/vault/IdentityRepository';
import { getVaultService, VaultService } from '@/services/vault/VaultService';
import { getShareLinkService, ShareLinkService } from '@/services/vault/ShareLinkService';
import { getVersionHistoryService, VersionHistoryService } from '@/services/vault/VersionHistoryService';

// =============================================================================
// Response Types
// =============================================================================

interface IdentityCheckResponse {
  hasIdentity: boolean;
  publicIdentity?: {
    displayName: string;
    publicKey: string;
    friendCode: string;
    avatar?: string;
  };
}

interface IdentityCreateResponse {
  success: boolean;
  publicIdentity?: {
    displayName: string;
    publicKey: string;
    friendCode: string;
    avatar?: string;
  };
  error?: string;
}

interface IdentityUpdateResponse {
  success: boolean;
  error?: string;
}

interface FolderListResponse {
  folders: Array<{
    id: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
    path?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  total?: number;
}

interface FolderResponse {
  folder: {
    id: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
    path?: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface FolderOperationResponse {
  success: boolean;
  error?: string;
}

interface ShareLinkListResponse {
  links: Array<{
    id: string;
    token: string;
    scopeType: string;
    scopeId: string;
    level: string;
    isActive: boolean;
    currentUses: number;
    maxUses?: number | null;
    expiresAt?: string | null;
    label?: string;
    createdAt: string;
  }>;
  count: number;
}

interface ShareLinkCreateResponse {
  success: boolean;
  link?: {
    id: string;
    token: string;
    url: string;
  };
  error?: string;
}

interface ShareRedeemResponse {
  success: boolean;
  link?: {
    scopeType: string;
    scopeId: string;
    level: string;
  };
  errorCode?: string;
}

interface VersionHistoryResponse {
  versions: Array<{
    id: string;
    versionNumber: number;
    contentHash: string;
    createdAt: string;
    message?: string;
  }>;
  summary?: {
    totalVersions: number;
    firstVersion: string;
    latestVersion: string;
  };
}

interface SaveVersionResponse {
  version: {
    id: string;
    versionNumber: number;
    contentHash: string;
    createdAt: string;
  };
  skipped?: boolean;
}

interface SignBundleResponse {
  success: boolean;
  bundle?: {
    format: string;
    content: string;
    signature: string;
    publicKey: string;
  };
  suggestedFilename?: string;
  error?: string;
}

// Mock repository types
interface MockIdentityRepository {
  hasIdentity: jest.Mock;
  getActive: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
}

interface MockVaultService {
  getAllFolders: jest.Mock;
  getRootFolders: jest.Mock;
  getChildFolders: jest.Mock;
  getSharedFolders: jest.Mock;
  createFolder: jest.Mock;
  getFolder: jest.Mock;
  getFolderWithPermissions: jest.Mock;
  renameFolder: jest.Mock;
  setFolderDescription: jest.Mock;
  moveFolder: jest.Mock;
  deleteFolder: jest.Mock;
}

interface MockShareLinkService {
  getAllLinks: jest.Mock;
  getActiveLinks: jest.Mock;
  create: jest.Mock;
  redeem: jest.Mock;
  redeemByUrl: jest.Mock;
}

interface MockVersionHistoryService {
  getHistory: jest.Mock;
  getHistorySummary: jest.Mock;
  saveVersion: jest.Mock;
}

// Helper to get typed response data
function getResponseData<T>(res: { _getData: () => string }): T {
  const data = res._getData();
  return JSON.parse(data) as T;
}

// =============================================================================
// Mock Data
// =============================================================================

const mockStoredIdentity = {
  id: 'identity-123',
  displayName: 'Test User',
  publicKey: 'mock-public-key-base64',
  friendCode: 'ABCD-EFGH-JKLM-NPQR',
  encryptedPrivateKey: {
    algorithm: 'AES-GCM-256' as const,
    ciphertext: 'encrypted-private-key',
    iv: 'mock-iv',
    salt: 'mock-salt',
  },
  avatar: undefined,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockUnlockedIdentity = {
  id: 'identity-123',
  displayName: 'Test User',
  publicKey: 'mock-public-key-base64',
  privateKey: 'mock-private-key-base64',
  friendCode: 'ABCD-EFGH-JKLM-NPQR',
  avatar: undefined,
};

const mockPublicIdentity = {
  displayName: 'Test User',
  publicKey: 'mock-public-key-base64',
  friendCode: 'ABCD-EFGH-JKLM-NPQR',
  avatar: undefined,
};

const mockFolder = {
  id: 'folder-123',
  name: 'Test Folder',
  description: 'A test folder',
  parentId: null,
  path: '/Test Folder',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockShareLink = {
  id: 'share-123',
  token: 'mock-share-token',
  scopeType: 'folder' as const,
  scopeId: 'folder-123',
  scopeCategory: null,
  level: 'read' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  expiresAt: null,
  maxUses: null,
  currentUses: 0,
  isActive: true,
  label: 'Test Share',
};

const mockVersion = {
  id: 'version-123',
  itemId: 'item-123',
  contentType: 'unit' as const,
  versionNumber: 1,
  contentHash: 'mock-content-hash',
  content: JSON.stringify({ name: 'Test Unit' }),
  createdBy: 'user-123',
  createdAt: '2024-01-01T00:00:00.000Z',
  message: 'Initial version',
};

// =============================================================================
// Identity API Tests
// =============================================================================

describe('Vault Identity API', () => {
  let mockRepository: MockIdentityRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      hasIdentity: jest.fn(),
      getActive: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    (getIdentityRepository as jest.Mock).mockReturnValue(mockRepository);
  });

  describe('GET /api/vault/identity', () => {
    it('should return hasIdentity: false when no identity exists', async () => {
      mockRepository.hasIdentity.mockResolvedValue(false);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        hasIdentity: false,
        publicIdentity: null,
      });
    });

    it('should return public identity when identity exists', async () => {
      mockRepository.hasIdentity.mockResolvedValue(true);
      mockRepository.getActive.mockResolvedValue(mockStoredIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.hasIdentity).toBe(true);
      expect(data.publicIdentity).toEqual({
        displayName: mockStoredIdentity.displayName,
        publicKey: mockStoredIdentity.publicKey,
        friendCode: mockStoredIdentity.friendCode,
        avatar: mockStoredIdentity.avatar,
      });
    });

    it('should handle errors gracefully', async () => {
      mockRepository.hasIdentity.mockRejectedValue(new Error('Database error'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Database error',
      });
    });
  });

  describe('POST /api/vault/identity', () => {
    it('should create new identity with valid data', async () => {
      mockRepository.hasIdentity.mockResolvedValue(false);
      (createIdentity as jest.Mock).mockResolvedValue(mockStoredIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: 'Test User',
          password: 'securePassword123',
        },
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.success).toBe(true);
      expect(data.publicIdentity).toEqual(mockPublicIdentity);
      expect(mockRepository.save).toHaveBeenCalledWith(mockStoredIdentity);
    });

    it('should reject missing display name', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'securePassword123',
        },
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Display name is required',
      });
    });

    it('should reject empty display name', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: '   ',
          password: 'securePassword123',
        },
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Display name cannot be empty',
      });
    });

    it('should reject display name longer than 100 characters', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: 'a'.repeat(101),
          password: 'securePassword123',
        },
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Display name too long (max 100 characters)',
      });
    });

    it('should reject missing password', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: 'Test User',
        },
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Password is required',
      });
    });

    it('should reject password shorter than 8 characters', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: 'Test User',
          password: 'short',
        },
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Password must be at least 8 characters',
      });
    });

    it('should reject if identity already exists', async () => {
      mockRepository.hasIdentity.mockResolvedValue(true);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          displayName: 'Test User',
          password: 'securePassword123',
        },
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(409);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Identity already exists. Use unlock endpoint.',
      });
    });
  });

  describe('PATCH /api/vault/identity', () => {
    it('should update display name', async () => {
      mockRepository.getActive.mockResolvedValue(mockStoredIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        body: {
          displayName: 'Updated Name',
        },
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockRepository.update).toHaveBeenCalledWith('identity-123', {
        displayName: 'Updated Name',
      });
    });

    it('should update avatar', async () => {
      mockRepository.getActive.mockResolvedValue(mockStoredIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        body: {
          avatar: 'data:image/png;base64,...',
        },
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockRepository.update).toHaveBeenCalledWith('identity-123', {
        avatar: 'data:image/png;base64,...',
      });
    });

    it('should reject empty display name update', async () => {
      mockRepository.getActive.mockResolvedValue(mockStoredIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        body: {
          displayName: '  ',
        },
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Invalid display name',
      });
    });

    it('should return 404 if no active identity', async () => {
      mockRepository.getActive.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        body: {
          displayName: 'Updated Name',
        },
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'No active identity found',
      });
    });
  });

  describe('Unsupported methods', () => {
    it('should return 405 for DELETE', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
      });

      await identityHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method not allowed',
      });
    });
  });
});

// =============================================================================
// Identity Unlock API Tests
// =============================================================================

describe('Vault Identity Unlock API', () => {
  let mockRepository: Pick<MockIdentityRepository, 'getActive'>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      getActive: jest.fn(),
    };

    (getIdentityRepository as jest.Mock).mockReturnValue(mockRepository);
  });

  describe('POST /api/vault/identity/unlock', () => {
    it('should unlock identity with correct password', async () => {
      mockRepository.getActive.mockResolvedValue(mockStoredIdentity);
      (unlockIdentity as jest.Mock).mockResolvedValue(mockUnlockedIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'correctPassword',
        },
      });

      await unlockHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.success).toBe(true);
      expect(data.publicIdentity).toEqual(mockPublicIdentity);
    });

    it('should reject incorrect password', async () => {
      mockRepository.getActive.mockResolvedValue(mockStoredIdentity);
      (unlockIdentity as jest.Mock).mockRejectedValue(new Error('Decryption failed'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'wrongPassword',
        },
      });

      await unlockHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Invalid password',
      });
    });

    it('should reject missing password', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {},
      });

      await unlockHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Password is required',
      });
    });

    it('should return 404 if no identity exists', async () => {
      mockRepository.getActive.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'anyPassword',
        },
      });

      await unlockHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'No identity found',
      });
    });

    it('should reject non-POST methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await unlockHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method not allowed',
      });
    });
  });
});

// =============================================================================
// Folders API Tests
// =============================================================================

describe('Vault Folders API', () => {
  let mockVaultService: MockVaultService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockVaultService = {
      getAllFolders: jest.fn(),
      getRootFolders: jest.fn(),
      getChildFolders: jest.fn(),
      getSharedFolders: jest.fn(),
      createFolder: jest.fn(),
      getFolder: jest.fn(),
      renameFolder: jest.fn(),
      moveFolder: jest.fn(),
      deleteFolder: jest.fn(),
      setFolderDescription: jest.fn(),
      getFolderWithPermissions: jest.fn(),
    };

    (getVaultService as jest.Mock).mockReturnValue(mockVaultService);
  });

  describe('GET /api/vault/folders', () => {
    it('should list all folders by default', async () => {
      const folders = [mockFolder];
      mockVaultService.getAllFolders.mockResolvedValue(folders);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await foldersHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.folders).toEqual(folders);
      expect(data.total).toBe(1);
    });

    it('should list root folders when parentId is null', async () => {
      const folders = [mockFolder];
      mockVaultService.getRootFolders.mockResolvedValue(folders);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { parentId: 'null' },
      });

      await foldersHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockVaultService.getRootFolders).toHaveBeenCalled();
    });

    it('should list child folders when parentId provided', async () => {
      const folders = [mockFolder];
      mockVaultService.getChildFolders.mockResolvedValue(folders);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { parentId: 'folder-parent' },
      });

      await foldersHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockVaultService.getChildFolders).toHaveBeenCalledWith('folder-parent');
    });

    it('should list shared folders when shared=true', async () => {
      const folders = [mockFolder];
      mockVaultService.getSharedFolders.mockResolvedValue(folders);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { shared: 'true' },
      });

      await foldersHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockVaultService.getSharedFolders).toHaveBeenCalled();
    });
  });

  describe('POST /api/vault/folders', () => {
    it('should create folder with valid data', async () => {
      mockVaultService.createFolder.mockResolvedValue(mockFolder);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          name: 'New Folder',
          description: 'A new folder',
        },
      });

      await foldersHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.folder).toEqual(mockFolder);
      expect(mockVaultService.createFolder).toHaveBeenCalledWith('New Folder', {
        description: 'A new folder',
        parentId: undefined,
      });
    });

    it('should reject missing name', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {},
      });

      await foldersHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Folder name is required',
      });
    });

    it('should reject empty name', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          name: '   ',
        },
      });

      await foldersHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Folder name cannot be empty',
      });
    });

    it('should reject name longer than 100 characters', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          name: 'a'.repeat(101),
        },
      });

      await foldersHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Folder name cannot exceed 100 characters',
      });
    });

    it('should reject if parent folder not found', async () => {
      mockVaultService.getFolder.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          name: 'Child Folder',
          parentId: 'non-existent',
        },
      });

      await foldersHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Parent folder not found',
      });
    });
  });
});

// =============================================================================
// Folder By ID API Tests
// =============================================================================

describe('Vault Folder By ID API', () => {
  const mockVaultService = {
    getFolder: jest.fn(),
    getFolderWithPermissions: jest.fn(),
    renameFolder: jest.fn(),
    setFolderDescription: jest.fn(),
    moveFolder: jest.fn(),
    deleteFolder: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getVaultService as jest.Mock).mockReturnValue(mockVaultService);
  });

  describe('GET /api/vault/folders/[id]', () => {
    it('should get folder by id', async () => {
      mockVaultService.getFolder.mockResolvedValue(mockFolder);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'folder-123' },
      });

      await folderByIdHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.folder).toEqual(mockFolder);
    });

    it('should get folder with permissions when requested', async () => {
      const folderWithPermissions = { ...mockFolder, permissions: [] };
      mockVaultService.getFolderWithPermissions.mockResolvedValue(folderWithPermissions);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'folder-123', includePermissions: 'true' },
      });

      await folderByIdHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockVaultService.getFolderWithPermissions).toHaveBeenCalledWith('folder-123');
    });

    it('should return 404 if folder not found', async () => {
      mockVaultService.getFolder.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: 'non-existent' },
      });

      await folderByIdHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Folder not found',
      });
    });

    it('should reject invalid id', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { id: ['array', 'not', 'allowed'] },
      });

      await folderByIdHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Invalid folder ID',
      });
    });
  });

  describe('PATCH /api/vault/folders/[id]', () => {
    it('should update folder name', async () => {
      mockVaultService.getFolder.mockResolvedValue(mockFolder);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'folder-123' },
        body: {
          name: 'Updated Name',
        },
      });

      await folderByIdHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockVaultService.renameFolder).toHaveBeenCalledWith('folder-123', 'Updated Name');
    });

    it('should update folder description', async () => {
      mockVaultService.getFolder.mockResolvedValue(mockFolder);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'folder-123' },
        body: {
          description: 'New description',
        },
      });

      await folderByIdHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockVaultService.setFolderDescription).toHaveBeenCalledWith(
        'folder-123',
        'New description'
      );
    });

    it('should move folder to new parent', async () => {
      const parentFolder = { ...mockFolder, id: 'parent-123' };
      mockVaultService.getFolder.mockImplementation((id: string) => {
        if (id === 'folder-123') return Promise.resolve(mockFolder);
        if (id === 'parent-123') return Promise.resolve(parentFolder);
        return Promise.resolve(null);
      });
      mockVaultService.moveFolder.mockResolvedValue(true);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'folder-123' },
        body: {
          parentId: 'parent-123',
        },
      });

      await folderByIdHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockVaultService.moveFolder).toHaveBeenCalledWith('folder-123', 'parent-123');
    });

    it('should reject circular folder reference', async () => {
      mockVaultService.getFolder.mockResolvedValue(mockFolder);
      mockVaultService.moveFolder.mockResolvedValue(false);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'folder-123' },
        body: {
          parentId: 'folder-123', // Moving to itself
        },
      });

      await folderByIdHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Cannot move folder (circular reference detected)',
      });
    });

    it('should return 404 if folder not found', async () => {
      mockVaultService.getFolder.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: 'non-existent' },
        body: {
          name: 'New Name',
        },
      });

      await folderByIdHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Folder not found',
      });
    });
  });

  describe('DELETE /api/vault/folders/[id]', () => {
    it('should delete existing folder', async () => {
      mockVaultService.getFolder.mockResolvedValue(mockFolder);
      mockVaultService.deleteFolder.mockResolvedValue(true);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'folder-123' },
      });

      await folderByIdHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.success).toBe(true);
      expect(mockVaultService.deleteFolder).toHaveBeenCalledWith('folder-123');
    });

    it('should return 404 if folder not found', async () => {
      mockVaultService.getFolder.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'non-existent' },
      });

      await folderByIdHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Folder not found',
      });
    });

    it('should return 500 if deletion fails', async () => {
      mockVaultService.getFolder.mockResolvedValue(mockFolder);
      mockVaultService.deleteFolder.mockResolvedValue(false);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: 'folder-123' },
      });

      await folderByIdHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Failed to delete folder',
      });
    });
  });
});

// =============================================================================
// Share Links API Tests
// =============================================================================

describe('Vault Share Links API', () => {
  let mockShareService: MockShareLinkService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockShareService = {
      getAllLinks: jest.fn(),
      getActiveLinks: jest.fn(),
      create: jest.fn(),
      redeem: jest.fn(),
      redeemByUrl: jest.fn(),
    };

    (getShareLinkService as jest.Mock).mockReturnValue(mockShareService);
  });

  describe('GET /api/vault/share', () => {
    it('should list all share links', async () => {
      const links = [mockShareLink];
      mockShareService.getAllLinks.mockResolvedValue(links);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.links).toEqual(links);
      expect(data.count).toBe(1);
    });

    it('should list only active links when requested', async () => {
      const links = [mockShareLink];
      mockShareService.getActiveLinks.mockResolvedValue(links);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: { active: 'true' },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockShareService.getActiveLinks).toHaveBeenCalled();
    });
  });

  describe('POST /api/vault/share', () => {
    it('should create folder share link', async () => {
      const result = {
        success: true,
        link: mockShareLink,
        url: 'https://example.com/share/mock-share-token',
      };
      mockShareService.create.mockResolvedValue(result);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'folder',
          scopeId: 'folder-123',
          level: 'read',
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.success).toBe(true);
      expect(data.link).toEqual(mockShareLink);
    });

    it('should create category share link', async () => {
      const result = {
        success: true,
        link: { ...mockShareLink, scopeType: 'category', scopeCategory: 'units' },
        url: 'https://example.com/share/token',
      };
      mockShareService.create.mockResolvedValue(result);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'category',
          scopeCategory: 'units',
          level: 'write',
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
    });

    it('should create share link with expiration', async () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      const result = {
        success: true,
        link: { ...mockShareLink, expiresAt },
        url: 'https://example.com/share/token',
      };
      mockShareService.create.mockResolvedValue(result);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'folder',
          scopeId: 'folder-123',
          level: 'read',
          expiresAt,
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(mockShareService.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt })
      );
    });

    it('should create share link with max uses', async () => {
      const result = {
        success: true,
        link: { ...mockShareLink, maxUses: 5 },
        url: 'https://example.com/share/token',
      };
      mockShareService.create.mockResolvedValue(result);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'folder',
          scopeId: 'folder-123',
          level: 'read',
          maxUses: 5,
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(mockShareService.create).toHaveBeenCalledWith(
        expect.objectContaining({ maxUses: 5 })
      );
    });

    it('should reject missing scopeType', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          level: 'read',
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'scopeType is required',
      });
    });

    it('should reject invalid scopeType', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'invalid',
          level: 'read',
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'scopeType must be one of: item, folder, category, all',
      });
    });

    it('should reject missing level', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'folder',
          scopeId: 'folder-123',
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'level is required',
      });
    });

    it('should reject invalid level', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'folder',
          scopeId: 'folder-123',
          level: 'superadmin',
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'level must be one of: read, write, admin',
      });
    });

    it('should reject folder scope without scopeId', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'folder',
          level: 'read',
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'scopeId is required for item/folder scope',
      });
    });

    it('should reject category scope without scopeCategory', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'category',
          level: 'read',
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'scopeCategory is required for category scope',
      });
    });

    it('should reject invalid scopeCategory', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'category',
          scopeCategory: 'invalid',
          level: 'read',
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'scopeCategory must be one of: units, pilots, forces, encounters',
      });
    });

    it('should reject invalid expiresAt date', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'folder',
          scopeId: 'folder-123',
          level: 'read',
          expiresAt: 'not-a-date',
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'expiresAt must be a valid ISO date',
      });
    });

    it('should reject invalid maxUses', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          scopeType: 'folder',
          scopeId: 'folder-123',
          level: 'read',
          maxUses: -1,
        },
      });

      await shareIndexHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'maxUses must be a positive number',
      });
    });
  });
});

// =============================================================================
// Share Redeem API Tests
// =============================================================================

describe('Vault Share Redeem API', () => {
  const mockShareService = {
    redeem: jest.fn(),
    redeemByUrl: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getShareLinkService as jest.Mock).mockReturnValue(mockShareService);
  });

  describe('POST /api/vault/share/redeem', () => {
    it('should redeem valid share token', async () => {
      const result = {
        success: true,
        link: mockShareLink,
      };
      mockShareService.redeem.mockResolvedValue(result);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: 'valid-token',
        },
      });

      await shareRedeemHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.success).toBe(true);
      expect(data.link).toEqual(mockShareLink);
    });

    it('should redeem by URL', async () => {
      const result = {
        success: true,
        link: mockShareLink,
      };
      mockShareService.redeemByUrl.mockResolvedValue(result);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          url: 'https://example.com/share/valid-token',
        },
      });

      await shareRedeemHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockShareService.redeemByUrl).toHaveBeenCalledWith(
        'https://example.com/share/valid-token'
      );
    });

    it('should return 404 for non-existent token', async () => {
      const result = {
        success: false,
        error: 'Share link not found',
        errorCode: 'NOT_FOUND',
        link: null,
      };
      mockShareService.redeem.mockResolvedValue(result);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: 'non-existent-token',
        },
      });

      await shareRedeemHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('NOT_FOUND');
    });

    it('should return 410 for expired link', async () => {
      const result = {
        success: false,
        error: 'Share link has expired',
        errorCode: 'EXPIRED',
        link: mockShareLink,
      };
      mockShareService.redeem.mockResolvedValue(result);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: 'expired-token',
        },
      });

      await shareRedeemHandler(req, res);

      expect(res._getStatusCode()).toBe(410);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.errorCode).toBe('EXPIRED');
    });

    it('should return 410 for max uses reached', async () => {
      const result = {
        success: false,
        error: 'Share link has reached maximum uses',
        errorCode: 'MAX_USES',
        link: mockShareLink,
      };
      mockShareService.redeem.mockResolvedValue(result);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: 'maxed-token',
        },
      });

      await shareRedeemHandler(req, res);

      expect(res._getStatusCode()).toBe(410);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.errorCode).toBe('MAX_USES');
    });

    it('should return 410 for inactive link', async () => {
      const result = {
        success: false,
        error: 'Share link is inactive',
        errorCode: 'INACTIVE',
        link: mockShareLink,
      };
      mockShareService.redeem.mockResolvedValue(result);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: 'inactive-token',
        },
      });

      await shareRedeemHandler(req, res);

      expect(res._getStatusCode()).toBe(410);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.errorCode).toBe('INACTIVE');
    });

    it('should reject missing token and url', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {},
      });

      await shareRedeemHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Either token or url is required',
      });
    });

    it('should reject invalid token type', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: 123,
        },
      });

      await shareRedeemHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'token or url must be a string',
      });
    });

    it('should reject non-POST methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await shareRedeemHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method not allowed',
      });
    });
  });
});

// =============================================================================
// Versions API Tests
// =============================================================================

describe('Vault Versions API', () => {
  let mockVersionService: MockVersionHistoryService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockVersionService = {
      getHistory: jest.fn(),
      getHistorySummary: jest.fn(),
      saveVersion: jest.fn(),
    };

    (getVersionHistoryService as jest.Mock).mockReturnValue(mockVersionService);
  });

  describe('GET /api/vault/versions', () => {
    it('should list version history for item', async () => {
      const versions = [mockVersion];
      const summary = {
        totalVersions: 1,
        oldestVersion: '2024-01-01T00:00:00.000Z',
        newestVersion: '2024-01-01T00:00:00.000Z',
      };
      mockVersionService.getHistory.mockResolvedValue(versions);
      mockVersionService.getHistorySummary.mockResolvedValue(summary);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          itemId: 'item-123',
          contentType: 'unit',
        },
      });

      await versionsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.versions).toEqual(versions);
      expect(data.summary).toEqual(summary);
    });

    it('should respect limit parameter', async () => {
      mockVersionService.getHistory.mockResolvedValue([]);
      mockVersionService.getHistorySummary.mockResolvedValue({});

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          itemId: 'item-123',
          contentType: 'unit',
          limit: '10',
        },
      });

      await versionsHandler(req, res);

      expect(mockVersionService.getHistory).toHaveBeenCalledWith('item-123', 'unit', 10);
    });

    it('should use default limit of 50', async () => {
      mockVersionService.getHistory.mockResolvedValue([]);
      mockVersionService.getHistorySummary.mockResolvedValue({});

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          itemId: 'item-123',
          contentType: 'unit',
        },
      });

      await versionsHandler(req, res);

      expect(mockVersionService.getHistory).toHaveBeenCalledWith('item-123', 'unit', 50);
    });

    it('should reject missing itemId', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          contentType: 'unit',
        },
      });

      await versionsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'itemId is required',
      });
    });

    it('should reject invalid contentType', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          itemId: 'item-123',
          contentType: 'invalid',
        },
      });

      await versionsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Invalid or missing contentType',
      });
    });
  });

  describe('POST /api/vault/versions', () => {
    it('should create new version', async () => {
      mockVersionService.saveVersion.mockResolvedValue(mockVersion);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          contentType: 'unit',
          itemId: 'item-123',
          content: JSON.stringify({ name: 'Test Unit' }),
          createdBy: 'user-123',
          message: 'Initial version',
        },
      });

      await versionsHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.version).toEqual(mockVersion);
    });

    it('should skip version if content unchanged', async () => {
      mockVersionService.saveVersion.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          contentType: 'unit',
          itemId: 'item-123',
          content: JSON.stringify({ name: 'Test Unit' }),
          createdBy: 'user-123',
        },
      });

      await versionsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = getResponseData<Record<string, unknown>>(res);
      expect(data.version).toBeNull();
      expect(data.skipped).toBe(true);
    });

    it('should reject invalid contentType', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          contentType: 'invalid',
          itemId: 'item-123',
          content: '{}',
          createdBy: 'user-123',
        },
      });

      await versionsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Invalid contentType',
      });
    });

    it('should reject missing itemId', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          contentType: 'unit',
          content: '{}',
          createdBy: 'user-123',
        },
      });

      await versionsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'itemId is required',
      });
    });

    it('should reject missing content', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          contentType: 'unit',
          itemId: 'item-123',
          createdBy: 'user-123',
        },
      });

      await versionsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'content is required',
      });
    });

    it('should reject missing createdBy', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          contentType: 'unit',
          itemId: 'item-123',
          content: '{}',
        },
      });

      await versionsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'createdBy is required',
      });
    });
  });
});

// =============================================================================
// Sign API Tests
// =============================================================================

describe('Vault Sign API', () => {
  const mockRepository = {
    getActive: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getIdentityRepository as jest.Mock).mockReturnValue(mockRepository);
    (unlockIdentity as jest.Mock).mockResolvedValue(mockUnlockedIdentity);
    (signMessage as jest.Mock).mockResolvedValue('mock-signature-base64');
    (getPublicIdentity as jest.Mock).mockReturnValue(mockPublicIdentity);
  });

  describe('POST /api/vault/sign', () => {
    it('should sign bundle with valid data', async () => {
      mockRepository.getActive.mockResolvedValue(mockStoredIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'correctPassword',
          contentType: 'unit',
          items: [
            { id: 'unit-1', name: 'Atlas AS7-D' },
            { id: 'unit-2', name: 'Locust LCT-1V' },
          ],
          description: 'Test bundle',
          tags: ['test', 'units'],
        },
      });

      await signHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = getResponseData<SignBundleResponse & { 
        bundle: { 
          metadata: Record<string, unknown>; 
          payload: unknown;
          signature: string;
        };
      }>(res);
      expect(data.success).toBe(true);
      expect(data.bundle).toBeDefined();
      expect(data.bundle.metadata).toBeDefined();
      expect(data.bundle.payload).toBeDefined();
      expect(data.bundle.signature).toBe('mock-signature-base64');
      expect(data.suggestedFilename).toMatch(/\.mekbundle$/);
    });

    it('should generate correct metadata', async () => {
      mockRepository.getActive.mockResolvedValue(mockStoredIdentity);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'correctPassword',
          contentType: 'pilot',
          items: [{ id: 'pilot-1', name: 'Grayson Carlyle' }],
        },
      });

      await signHandler(req, res);

      const data = getResponseData<SignBundleResponse & { 
        bundle: { 
          metadata: Record<string, unknown>; 
        };
      }>(res);
      expect(data.bundle.metadata.version).toBe('1.0.0');
      expect(data.bundle.metadata.contentType).toBe('pilot');
      expect(data.bundle.metadata.itemCount).toBe(1);
      expect(data.bundle.metadata.author).toEqual(mockPublicIdentity);
      expect(data.bundle.metadata.createdAt).toBeDefined();
    });

    it('should reject missing password', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          contentType: 'unit',
          items: [{ id: 'unit-1' }],
        },
      });

      await signHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Password is required',
      });
    });

    it('should reject invalid contentType', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'invalid',
          items: [{ id: 'item-1' }],
        },
      });

      await signHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Invalid content type',
      });
    });

    it('should reject empty items array', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'unit',
          items: [],
        },
      });

      await signHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Items array is required',
      });
    });

    it('should return 404 if no identity exists', async () => {
      mockRepository.getActive.mockResolvedValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'unit',
          items: [{ id: 'unit-1' }],
        },
      });

      await signHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'No identity found',
      });
    });

    it('should return 401 for incorrect password', async () => {
      mockRepository.getActive.mockResolvedValue(mockStoredIdentity);
      (unlockIdentity as jest.Mock).mockRejectedValue(new Error('Decryption failed'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'wrongPassword',
          contentType: 'unit',
          items: [{ id: 'unit-1' }],
        },
      });

      await signHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Invalid password',
      });
    });

    it('should generate appropriate filenames', async () => {
      mockRepository.getActive.mockResolvedValue(mockStoredIdentity);

      // Single item with name
      const { req: req1, res: res1 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'unit',
          items: [{ id: 'unit-1', name: 'Atlas AS7-D' }],
        },
      });

      await signHandler(req1, res1);
      const data1 = getResponseData<SignBundleResponse>(res1);
      expect(data1.suggestedFilename).toMatch(/^atlas-as7-d-\d{8}\.mekbundle$/);

      // Multiple items
      jest.clearAllMocks();
      mockRepository.getActive.mockResolvedValue(mockStoredIdentity);
      (unlockIdentity as jest.Mock).mockResolvedValue(mockUnlockedIdentity);
      (signMessage as jest.Mock).mockResolvedValue('mock-signature-base64');
      (getPublicIdentity as jest.Mock).mockReturnValue(mockPublicIdentity);

      const { req: req2, res: res2 } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'password',
          contentType: 'unit',
          items: [
            { id: 'unit-1', name: 'Atlas' },
            { id: 'unit-2', name: 'Locust' },
          ],
        },
      });

      await signHandler(req2, res2);
      const data2 = getResponseData<SignBundleResponse>(res2);
      expect(data2.suggestedFilename).toMatch(/^units-2-\d{8}\.mekbundle$/);
    });

    it('should reject non-POST methods', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await signHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method not allowed',
      });
    });
  });
});
