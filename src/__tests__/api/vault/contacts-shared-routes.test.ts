/**
 * Tests for vault contacts/shared API routes.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';

import contactsHandler from '@/pages/api/vault/contacts';
import contactHandler from '@/pages/api/vault/contacts/[id]';
import sharedHandler from '@/pages/api/vault/shared';
import sharedRevokeHandler from '@/pages/api/vault/shared/[scope]/[id]';
import syncHandler from '@/pages/api/vault/sync';

import { parseApiResponse, parseErrorResponse } from '../../helpers';

const mockContactService = {
  getAllContacts: jest.fn(),
  addContact: jest.fn(),
  getContact: jest.fn(),
  setNickname: jest.fn(),
  setNotes: jest.fn(),
  setTrusted: jest.fn(),
  removeContact: jest.fn(),
};

const mockIdentityRepository = {
  getActive: jest.fn(),
};

const mockPermissionService = {
  getGrantsForGrantee: jest.fn(),
  getAllGrants: jest.fn(),
  revoke: jest.fn(),
};

const mockVaultService = {
  getFolder: jest.fn(),
  unshareFolder: jest.fn(),
};

const mockSyncEngine = {
  getUnsyncedChanges: jest.fn(),
  getPendingConflicts: jest.fn(),
  getCurrentVersion: jest.fn(),
};

jest.mock('@/services/vault/ContactService', () => ({
  getContactService: () => mockContactService,
}));

jest.mock('@/services/vault/IdentityRepository', () => ({
  getIdentityRepository: () => mockIdentityRepository,
}));

jest.mock('@/services/vault/PermissionService', () => ({
  getPermissionService: () => mockPermissionService,
}));

jest.mock('@/services/vault/VaultService', () => ({
  getVaultService: () => mockVaultService,
}));

jest.mock('@/services/vault/SyncEngine', () => ({
  getSyncEngine: () => mockSyncEngine,
}));

const mockContact = {
  id: 'contact-1',
  friendCode: 'ABCD-EFGH-JKLM-NPQR',
  publicKey: 'abcd',
  nickname: 'Scout',
  displayName: 'Scout Contact',
  avatar: null,
  addedAt: '2026-06-28T00:00:00.000Z',
  lastSeenAt: null,
  isTrusted: false,
  notes: 'met at Outreach',
};

const activeIdentity = {
  id: 'identity-1',
  displayName: 'Commander',
  publicKey: 'public-key',
  friendCode: 'SELF-SELF-SELF-SELF',
  createdAt: '2026-06-28T00:00:00.000Z',
};

const incomingFolderGrant = {
  id: 'perm-incoming-folder',
  granteeId: activeIdentity.friendCode,
  scopeType: 'folder' as const,
  scopeId: 'folder-1',
  scopeCategory: null,
  level: 'read' as const,
  expiresAt: null,
  createdAt: '2026-06-28T01:00:00.000Z',
  granteeName: 'Commander',
};

const outgoingUnitGrant = {
  id: 'perm-outgoing-unit',
  granteeId: 'FRND-FRND-FRND-FRND',
  scopeType: 'item' as const,
  scopeId: 'unit:unit-1',
  scopeCategory: null,
  level: 'write' as const,
  expiresAt: null,
  createdAt: '2026-06-28T02:00:00.000Z',
  granteeName: 'Lancemate',
};

describe('vault contacts/shared API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContactService.getContact.mockResolvedValue(mockContact);
    mockContactService.setNickname.mockResolvedValue(true);
    mockContactService.setNotes.mockResolvedValue(true);
    mockContactService.setTrusted.mockResolvedValue(true);
    mockVaultService.getFolder.mockResolvedValue({
      id: 'folder-1',
      name: 'Campaign Intel',
      description: null,
      parentId: null,
      createdAt: '2026-06-28T00:00:00.000Z',
      updatedAt: '2026-06-28T00:00:00.000Z',
      itemCount: 1,
      isShared: true,
    });
  });

  describe('/api/vault/contacts', () => {
    it('lists contacts', async () => {
      mockContactService.getAllContacts.mockResolvedValue([mockContact]);
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await contactsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(
        parseApiResponse<{ contacts: (typeof mockContact)[] }>(res),
      ).toEqual({
        contacts: [mockContact],
      });
    });

    it('creates a contact from a friend code', async () => {
      mockContactService.addContact.mockResolvedValue({
        success: true,
        data: { contact: mockContact },
      });
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          friendCode: mockContact.friendCode,
          nickname: 'Scout ',
          notes: ' met at Outreach ',
        },
      });

      await contactsHandler(req, res);

      expect(mockContactService.addContact).toHaveBeenCalledWith({
        friendCode: mockContact.friendCode,
        nickname: 'Scout',
        notes: 'met at Outreach',
        trusted: undefined,
      });
      expect(res._getStatusCode()).toBe(201);
      expect(
        parseApiResponse<{ contact: typeof mockContact }>(res).contact,
      ).toStrictEqual(mockContact);
    });

    it('returns contact service validation errors', async () => {
      mockContactService.addContact.mockResolvedValue({
        success: false,
        error: {
          message: 'Invalid friend code format',
          errorCode: 'INVALID_CODE',
        },
      });
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { friendCode: 'bad-code' },
      });

      await contactsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(parseErrorResponse(res).error).toBe('Invalid friend code format');
    });
  });

  describe('/api/vault/contacts/[id]', () => {
    it('updates contact metadata', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
        query: { id: mockContact.id },
        body: {
          nickname: 'Updated',
          notes: null,
          isTrusted: true,
        },
      });

      await contactHandler(req, res);

      expect(mockContactService.setNickname).toHaveBeenCalledWith(
        mockContact.id,
        'Updated',
      );
      expect(mockContactService.setNotes).toHaveBeenCalledWith(
        mockContact.id,
        null,
      );
      expect(mockContactService.setTrusted).toHaveBeenCalledWith(
        mockContact.id,
        true,
      );
      expect(res._getStatusCode()).toBe(200);
      expect(
        parseApiResponse<{ contact: typeof mockContact }>(res).contact,
      ).toStrictEqual(mockContact);
    });

    it('deletes a contact', async () => {
      mockContactService.removeContact.mockResolvedValue(true);
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { id: mockContact.id },
      });

      await contactHandler(req, res);

      expect(mockContactService.removeContact).toHaveBeenCalledWith(
        mockContact.id,
      );
      expect(res._getStatusCode()).toBe(200);
      expect(parseApiResponse<{ success: true }>(res)).toEqual({
        success: true,
      });
    });
  });

  describe('/api/vault/shared', () => {
    it('lists incoming and outgoing shared items from permission grants', async () => {
      mockIdentityRepository.getActive.mockResolvedValue(activeIdentity);
      mockPermissionService.getGrantsForGrantee.mockResolvedValue([
        incomingFolderGrant,
      ]);
      mockPermissionService.getAllGrants.mockResolvedValue([outgoingUnitGrant]);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await sharedHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = parseApiResponse<{
        sharedWithMe: Array<{ id: string; name: string; type: string }>;
        mySharedItems: Array<{
          id: string;
          name: string;
          type: string;
          sharedWith?: Array<{ friendCode: string; name: string }>;
        }>;
      }>(res);
      expect(data.sharedWithMe).toMatchObject([
        {
          id: 'folder-1',
          name: 'Campaign Intel',
          type: 'folder',
        },
      ]);
      expect(data.mySharedItems).toMatchObject([
        {
          id: 'unit-1',
          name: 'Unit unit-1',
          type: 'unit',
          sharedWith: [
            {
              friendCode: 'FRND-FRND-FRND-FRND',
              name: 'Lancemate',
            },
          ],
        },
      ]);
    });
  });

  describe('/api/vault/shared/[scope]/[id]', () => {
    it('revokes a received item grant for the active identity', async () => {
      mockIdentityRepository.getActive.mockResolvedValue(activeIdentity);
      mockPermissionService.getGrantsForGrantee.mockResolvedValue([
        {
          ...outgoingUnitGrant,
          id: 'perm-incoming-unit',
          granteeId: activeIdentity.friendCode,
        },
      ]);
      mockPermissionService.revoke.mockResolvedValue({ success: true });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { scope: 'received', id: 'unit-1' },
      });

      await sharedRevokeHandler(req, res);

      expect(mockPermissionService.revoke).toHaveBeenCalledWith(
        'perm-incoming-unit',
      );
      expect(res._getStatusCode()).toBe(200);
      expect(parseApiResponse<{ revoked: number }>(res).revoked).toBe(1);
    });

    it('revokes all outgoing grants for an owned item', async () => {
      mockPermissionService.getAllGrants.mockResolvedValue([
        outgoingUnitGrant,
        { ...outgoingUnitGrant, id: 'perm-outgoing-unit-2' },
      ]);
      mockPermissionService.revoke.mockResolvedValue({ success: true });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
        query: { scope: 'mine', id: 'unit-1' },
      });

      await sharedRevokeHandler(req, res);

      expect(mockPermissionService.revoke).toHaveBeenCalledTimes(2);
      expect(res._getStatusCode()).toBe(200);
      expect(parseApiResponse<{ revoked: number }>(res).revoked).toBe(2);
    });
  });

  describe('/api/vault/sync', () => {
    it('reports sync state without marking peer delivery complete', async () => {
      mockSyncEngine.getUnsyncedChanges.mockResolvedValue([
        { id: 'change-1' },
        { id: 'change-2' },
      ]);
      mockSyncEngine.getPendingConflicts.mockResolvedValue([
        { id: 'conflict-1' },
      ]);
      mockSyncEngine.getCurrentVersion.mockResolvedValue(12);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      await syncHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(
        parseApiResponse<{ pendingOutbound: number; conflicts: number }>(res),
      ).toMatchObject({
        pendingOutbound: 2,
        conflicts: 1,
      });
      expect(mockSyncEngine).not.toHaveProperty('markSyncedToPeer');
    });
  });
});
