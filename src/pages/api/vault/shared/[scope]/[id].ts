/**
 * Vault Shared Item Revoke API
 *
 * DELETE /api/vault/shared/received/[id] - Remove this vault's grant
 * DELETE /api/vault/shared/mine/[id] - Revoke outgoing grants for an item
 *
 * @spec openspec/specs/unit-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type { IPermissionGrant, ShareableContentType } from '@/types/vault';

import {
  rejectMissingQueryString,
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

interface RevokeResponse {
  success: true;
  revoked: number;
}

type RevokeApiResponse = RevokeResponse | ApiErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RevokeApiResponse>,
): Promise<void> {
  const scope = rejectMissingQueryString(req, res, 'scope', 'Invalid scope');
  const id = rejectMissingQueryString(req, res, 'id', 'Invalid shared item ID');
  if (!scope || !id) return;

  if (
    rejectUnexpectedMethod(req, res, ['DELETE'], () => ({
      error: 'Method not allowed',
    }))
  )
    return;

  if (scope !== 'received' && scope !== 'mine') {
    return res.status(400).json({ error: 'Invalid shared item scope' });
  }

  try {
    const revoked =
      scope === 'received'
        ? await revokeReceivedItem(id)
        : await revokeOutgoingItem(id);

    if (revoked === 0) {
      return res.status(404).json({ error: 'Shared item not found' });
    }

    return res.status(200).json({ success: true, revoked });
  } catch (error) {
    sendLoggedApiError(res, 'Shared item revoke API error:', error);
  }
}

async function revokeReceivedItem(id: string): Promise<number> {
  const identity = await getIdentityRepository().getActive();
  if (!identity) return 0;

  const permissionService = getPermissionService();
  const vaultService = getVaultService();
  const grants = await permissionService.getGrantsForGrantee(
    identity.friendCode,
  );

  return revokeMatchingGrants(id, grants, {
    permissionService,
    vaultService,
  });
}

async function revokeOutgoingItem(id: string): Promise<number> {
  const permissionService = getPermissionService();
  const vaultService = getVaultService();
  const grants = (await permissionService.getAllGrants()).filter(
    (grant) => grant.granteeId !== 'public',
  );

  return revokeMatchingGrants(id, grants, {
    permissionService,
    vaultService,
  });
}

async function revokeMatchingGrants(
  id: string,
  grants: IPermissionGrant[],
  services: {
    permissionService: ReturnType<typeof getPermissionService>;
    vaultService: ReturnType<typeof getVaultService>;
  },
): Promise<number> {
  let revoked = 0;

  for (const grant of grants) {
    if (!grantMatchesItemId(grant, id)) continue;

    if (grant.scopeType === 'folder' && grant.scopeId) {
      const unshared = await services.vaultService.unshareFolder(
        grant.scopeId,
        grant.granteeId,
      );
      if (unshared) revoked += 1;
      continue;
    }

    const result = await services.permissionService.revoke(grant.id);
    if (result.success) revoked += 1;
  }

  return revoked;
}

function grantMatchesItemId(grant: IPermissionGrant, id: string): boolean {
  if (grant.scopeType === 'folder') return grant.scopeId === id;
  if (grant.scopeType !== 'item') return false;

  const parsed = parseItemScope(grant.scopeId);
  return parsed?.id === id;
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
  if (!SHAREABLE_TYPES.includes(type as ShareableContentType)) return null;

  return {
    type: type as ShareableContentType,
    id: scopeId.slice(separatorIndex + 1),
  };
}
