/**
 * Vault Shared Items API
 *
 * GET /api/vault/shared - List items shared with this vault and items this
 * vault has shared with contacts.
 *
 * @spec openspec/specs/unit-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type {
  ISharedItem,
  SharedItemsResponse,
} from '@/pages-modules/shared/types';
import type { IPermissionGrant, ShareableContentType } from '@/types/vault';

import {
  rejectUnexpectedMethod,
  sendLoggedApiError,
  type ApiErrorResponse,
} from '@/pages-modules/api/routeHelpers';
import { getIdentityRepository } from '@/services/vault/IdentityRepository';
import { getPermissionService } from '@/services/vault/PermissionService';
import { getVaultService } from '@/services/vault/VaultService';

const SHAREABLE_TYPES: readonly ShareableContentType[] = [
  'unit',
  'pilot',
  'force',
  'encounter',
];

interface ShareScope {
  id: string;
  type: ShareableContentType | 'folder';
  name: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SharedItemsResponse | ApiErrorResponse>,
): Promise<void> {
  if (
    rejectUnexpectedMethod(req, res, ['GET'], () => ({
      error: 'Method not allowed',
    }))
  )
    return;

  try {
    const identity = await getIdentityRepository().getActive();
    const myFriendCode = identity?.friendCode ?? null;
    const permissionService = getPermissionService();
    const vaultService = getVaultService();

    const [incomingGrants, allGrants] = await Promise.all([
      myFriendCode
        ? permissionService.getGrantsForGrantee(myFriendCode)
        : Promise.resolve([]),
      permissionService.getAllGrants(),
    ]);

    const sharedWithMe = await Promise.all(
      incomingGrants
        .filter((grant) => grant.granteeId !== 'public')
        .map((grant) => mapIncomingGrant(grant, vaultService)),
    );

    const mySharedItems = await mapOutgoingGrants(
      allGrants.filter(
        (grant) =>
          grant.granteeId !== 'public' && grant.granteeId !== myFriendCode,
      ),
      vaultService,
    );

    return res.status(200).json({
      sharedWithMe: sharedWithMe.filter(isSharedItem),
      mySharedItems,
    });
  } catch (error) {
    sendLoggedApiError(res, 'Shared items API error:', error);
  }
}

async function mapIncomingGrant(
  grant: IPermissionGrant,
  vaultService: ReturnType<typeof getVaultService>,
): Promise<ISharedItem | null> {
  const scope = await grantToScope(grant, vaultService);
  if (!scope) return null;

  return {
    id: scope.id,
    name: scope.name,
    type: scope.type,
    level: grant.level,
    ownerId: null,
    ownerName: 'Vault Owner',
    sharedAt: grant.createdAt,
    lastSyncAt: null,
    syncStatus: 'synced',
  };
}

async function mapOutgoingGrants(
  grants: IPermissionGrant[],
  vaultService: ReturnType<typeof getVaultService>,
): Promise<ISharedItem[]> {
  const grouped = new Map<string, ISharedItem>();

  for (const grant of grants) {
    const scope = await grantToScope(grant, vaultService);
    if (!scope) continue;

    const key = `${scope.type}:${scope.id}`;
    const existing = grouped.get(key);
    const sharedWith = {
      friendCode: grant.granteeId,
      name: grant.granteeName || grant.granteeId,
      level: grant.level,
    };

    if (existing) {
      grouped.set(key, {
        ...existing,
        sharedWith: [...(existing.sharedWith ?? []), sharedWith],
      });
      continue;
    }

    grouped.set(key, {
      id: scope.id,
      name: scope.name,
      type: scope.type,
      level: grant.level,
      ownerId: null,
      ownerName: 'You',
      sharedWith: [sharedWith],
      sharedAt: grant.createdAt,
      lastSyncAt: null,
      syncStatus: 'synced',
    });
  }

  return Array.from(grouped.values());
}

async function grantToScope(
  grant: IPermissionGrant,
  vaultService: ReturnType<typeof getVaultService>,
): Promise<ShareScope | null> {
  if (grant.scopeType === 'folder') {
    if (!grant.scopeId) return null;
    const folder = await vaultService.getFolder(grant.scopeId);
    return {
      id: grant.scopeId,
      type: 'folder',
      name: folder?.name ?? `Folder ${grant.scopeId}`,
    };
  }

  if (grant.scopeType !== 'item') return null;
  const parsed = parseItemScope(grant.scopeId);
  if (!parsed) return null;
  return {
    ...parsed,
    name: `${labelForType(parsed.type)} ${parsed.id}`,
  };
}

function parseItemScope(scopeId: string | null): {
  id: string;
  type: ShareableContentType;
} | null {
  if (!scopeId) return null;
  const separatorIndex = scopeId.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === scopeId.length - 1) {
    return null;
  }

  const type = scopeId.slice(0, separatorIndex);
  if (!isShareableContentType(type)) return null;

  return {
    type,
    id: scopeId.slice(separatorIndex + 1),
  };
}

function isShareableContentType(value: string): value is ShareableContentType {
  return SHAREABLE_TYPES.includes(value as ShareableContentType);
}

function labelForType(type: ShareableContentType): string {
  switch (type) {
    case 'unit':
      return 'Unit';
    case 'pilot':
      return 'Pilot';
    case 'force':
      return 'Force';
    case 'encounter':
      return 'Encounter';
  }
}

function isSharedItem(item: ISharedItem | null): item is ISharedItem {
  return item !== null;
}
