/**
 * Campaign instance authority (design D2).
 *
 * `authority` is a stored fact on the campaign envelope, never inferred
 * from sockets or session mode. Commands execute only at a `source`
 * instance. Replica writes reuse the replica-store refusal shape
 * (`kind: 'refused'` vs `kind: 'failed'`) so UI can tell "this is a
 * replica" from a generic error.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D2)
 */

import type {
  CampaignAuthority,
  IReplicaCampaignAuthority,
  ISourceCampaignAuthority,
} from '@/types/campaign/SerializedCampaign';

import {
  isCampaignEventScope,
  type CampaignEventScope,
} from '@/types/campaign/CampaignSync';

/** Replica local-mutation refusal. Distinct from `failed`. */
export const REPLICA_NOT_SOURCE_REFUSAL_REASON = 'replica-not-source' as const;

/** Unknown or malformed role. Distinct from replica refusal. */
export const UNKNOWN_AUTHORITY_ROLE_REASON = 'unknown-authority-role' as const;

export type CampaignSourceMutationResult =
  | { readonly kind: 'ok' }
  | {
      readonly kind: 'refused';
      readonly reason: typeof REPLICA_NOT_SOURCE_REFUSAL_REASON;
    }
  | {
      readonly kind: 'failed';
      readonly reason: typeof UNKNOWN_AUTHORITY_ROLE_REASON;
    };

export type CampaignAuthorityParseResult =
  | { readonly kind: 'ok'; readonly authority: CampaignAuthority }
  | {
      readonly kind: 'failed';
      readonly reason: typeof UNKNOWN_AUTHORITY_ROLE_REASON;
    };

const SOURCE_AUTHORITY: ISourceCampaignAuthority = { role: 'source' };

/**
 * Source authority singleton. New source writes stamp this explicitly;
 * parsers never invent it for an unknown role.
 */
export function sourceCampaignAuthority(): ISourceCampaignAuthority {
  return SOURCE_AUTHORITY;
}

/**
 * True when `authority` is the source role. The default branch is
 * `never` so a new role cannot compile as "probably source".
 */
export function isSourceInstance(authority: CampaignAuthority): boolean {
  switch (authority.role) {
    case 'source':
      return true;
    case 'replica':
      return false;
    default: {
      const exhaustive: never = authority;
      return exhaustive;
    }
  }
}

/**
 * Gate for a mutation against a parsed authority. Reuses the replica
 * vocabulary: replica is `refused`, unknown is `failed`, source is `ok`.
 */
export function assertSourceAuthority(
  authority: CampaignAuthority,
): CampaignSourceMutationResult {
  if (isSourceInstance(authority)) {
    return { kind: 'ok' };
  }
  return {
    kind: 'refused',
    reason: REPLICA_NOT_SOURCE_REFUSAL_REASON,
  };
}

/**
 * Parse stored/incoming authority. Absent, null, and unknown `role`
 * values fail closed — they are never treated as source.
 */
export function parseCampaignAuthority(
  value: unknown,
): CampaignAuthorityParseResult {
  if (typeof value !== 'object' || value === null) {
    return { kind: 'failed', reason: UNKNOWN_AUTHORITY_ROLE_REASON };
  }
  const record = value as { readonly role?: unknown };
  if (record.role === 'source') {
    return { kind: 'ok', authority: SOURCE_AUTHORITY };
  }
  if (record.role === 'replica') {
    const replica = parseReplicaAuthority(value);
    if (!replica) {
      return { kind: 'failed', reason: UNKNOWN_AUTHORITY_ROLE_REASON };
    }
    return { kind: 'ok', authority: replica };
  }
  return { kind: 'failed', reason: UNKNOWN_AUTHORITY_ROLE_REASON };
}

/**
 * Gate a mutation when authority may be missing or corrupt. Unknown
 * roles fail; replicas refuse; only `source` is `ok`.
 */
export function evaluateSourceMutationGate(
  value: unknown,
): CampaignSourceMutationResult {
  const parsed = parseCampaignAuthority(value);
  if (parsed.kind === 'failed') {
    return parsed;
  }
  return assertSourceAuthority(parsed.authority);
}

/**
 * True when a snapshot already carries a fully parsed authority plus
 * a non-empty instanceId. Migration leaves that pair untouched.
 */
export function snapshotCarriesAuthority(snapshot: {
  // Deliberately the LOOSE shape: this guard exists to interrogate a
  // record read from storage that may predate D2 entirely, so requiring
  // the fields it is checking for would defeat the purpose.
  readonly instanceId?: string;
  readonly authority?: unknown;
}): boolean {
  if (
    typeof snapshot.instanceId !== 'string' ||
    snapshot.instanceId.length === 0
  ) {
    return false;
  }
  return parseCampaignAuthority(snapshot.authority).kind === 'ok';
}

/**
 * Narrow a replica payload. All required replica fields must be present
 * and well-typed; a half-filled replica is not a source.
 */
function parseReplicaAuthority(
  value: unknown,
): IReplicaCampaignAuthority | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as {
    readonly sourceInstanceId?: unknown;
    readonly grantId?: unknown;
    readonly scopes?: unknown;
    readonly revokedAt?: unknown;
  };
  if (!isNonemptyString(record.sourceInstanceId)) {
    return null;
  }
  if (!isNonemptyString(record.grantId)) {
    return null;
  }
  if (!Array.isArray(record.scopes)) {
    return null;
  }
  const scopes: CampaignEventScope[] = [];
  for (const scope of record.scopes) {
    if (!isCampaignEventScope(scope)) {
      return null;
    }
    scopes.push(scope);
  }
  if (record.revokedAt === undefined) {
    return {
      role: 'replica',
      sourceInstanceId: record.sourceInstanceId,
      grantId: record.grantId,
      scopes,
    };
  }
  if (!isNonemptyString(record.revokedAt)) {
    return null;
  }
  return {
    role: 'replica',
    sourceInstanceId: record.sourceInstanceId,
    grantId: record.grantId,
    scopes,
    revokedAt: record.revokedAt,
  };
}

/**
 * True for a non-empty string. Used so replica identity fields cannot
 * be blank and still parse as a replica.
 */
function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
