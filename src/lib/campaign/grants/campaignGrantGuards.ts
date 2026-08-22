/**
 * Campaign-grant insert/row guards (design D5, task 2.1).
 *
 * Canonicalization is load-bearing: sort + dedupe on the way in so the
 * signed bytes and the stored row agree. Membership is exact-string;
 * team:/player: ids are not prefix wildcards. generateOpaqueGrantId
 * uses crypto randomness only; it MUST NOT hash participant or campaign.
 *
 * Share UI / replica / sync-channel wiring is owned by 2.2 / 2.3 / 3.3.
 */

import { randomBytes } from 'node:crypto';

import { isSqliteUniqueConstraintError } from '@/services/persistence/sqliteConstraintErrors';
import {
  isCampaignEventScope,
  type CampaignEventScope,
} from '@/types/campaign/CampaignSync';

import {
  CAMPAIGN_GRANT_ID_PATTERN,
  CampaignGrantError,
  GM_GRANT_BASE_SCOPES,
  type CampaignGrantScopes,
  type ICampaignGrant,
  type IIssueCampaignGrant,
} from './ICampaignGrantStore';

export interface ICampaignGrantRow {
  readonly grant_id: string;
  readonly campaign_id: string;
  readonly participant_id: string;
  readonly issuer_public_key: string;
  readonly scopes: string;
  readonly issued_at: string;
  readonly expires_at: string;
  readonly revoked_at: string | null;
  readonly created_at: string;
}

export const MAX_GRANT_ID_ATTEMPTS = 5;

/** True when a string has non-whitespace content. */
export function isNonempty(value: string): boolean {
  return value.trim().length > 0;
}

/** True when value is a 32-char lowercase hex opaque grant id. */
export function isOpaqueGrantId(value: string): boolean {
  return CAMPAIGN_GRANT_ID_PATTERN.test(value);
}

/**
 * True for SQLite UNIQUE failures on this table. Delegates to the shared
 * realm-safe predicate: an `instanceof Error` gate lets a cross-realm
 * constraint error escape untyped.
 */
export function isUniqueViolation(error: unknown): boolean {
  return isSqliteUniqueConstraintError(error);
}

/**
 * Mints a 32-char lowercase hex id from 16 cryptographically random
 * bytes. Constraint: never derived from participant or campaign identity.
 */
export function generateOpaqueGrantId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Sort + dedupe a scope list into the one canonical representation.
 * Rejects empty sets and values outside the closed CampaignEventScope
 * vocabulary. Stable ASCII order so JSON.stringify is byte-identical
 * for the same logical set.
 */
export function canonicalizeGrantScopes(
  scopes: readonly string[],
): CampaignGrantScopes {
  const unique = new Set<CampaignEventScope>();
  for (const scope of scopes) {
    if (!isCampaignEventScope(scope)) {
      throw new CampaignGrantError(
        'invalid-scopes',
        'Grant scopes must be closed-vocabulary campaign event scopes',
      );
    }
    unique.add(scope);
  }
  if (unique.size === 0) {
    throw new CampaignGrantError(
      'empty-scopes',
      'A grant must carry a non-empty scope set',
    );
  }
  const sorted = Array.from(unique).sort(compareScopes);
  return Object.freeze(sorted);
}

/**
 * GM/all-scopes constructor: gm AND campaign, plus any extra team/player
 * (or other closed-vocabulary) members. Extra values are canonicalized
 * with the base set so duplicates collapse.
 */
export function createGmGrantScopes(
  extra: readonly string[] = [],
): CampaignGrantScopes {
  const combined: string[] = [];
  for (const scope of GM_GRANT_BASE_SCOPES) combined.push(scope);
  for (const scope of extra) combined.push(scope);
  return canonicalizeGrantScopes(combined);
}

/**
 * Exact-string membership. A `team:` / `player:` event scope matches
 * only that exact grant member; `gm` in the set does not imply other
 * scopes, and `campaign` does not imply `gm`.
 */
export function grantAllowsScope(
  grant: Pick<ICampaignGrant, 'scopes'>,
  scope: CampaignEventScope,
): boolean {
  return grant.scopes.includes(scope);
}

/**
 * Compact JSON array of the canonical scope set. This string is both
 * the stored `scopes` column and the `scopes` value inside the signed
 * token payload.
 */
export function serializeGrantScopes(scopes: CampaignGrantScopes): string {
  return JSON.stringify(scopes);
}

/**
 * Parses a stored or signed scopes JSON array, then canonicalizes so a
 * non-canonical stored string cannot silently authorize.
 */
export function parseGrantScopes(raw: string): CampaignGrantScopes {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CampaignGrantError(
      'invalid-record',
      'Grant scopes must be a JSON array of campaign event scopes',
    );
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every((item) => typeof item === 'string')
  ) {
    throw new CampaignGrantError(
      'invalid-record',
      'Grant scopes must be a JSON array of campaign event scopes',
    );
  }
  return canonicalizeGrantScopes(parsed);
}

/**
 * Rejects issue input that would violate identity, time, or CHECK law
 * so callers get a typed error, not a raw SQL failure.
 */
export function assertIssueGrantInput(input: IIssueCampaignGrant): void {
  if (!isNonempty(input.campaignId) || !isNonempty(input.participantId)) {
    throw new CampaignGrantError(
      'invalid-identity',
      'Grant campaign id and participant id must be nonempty',
    );
  }
  if (!isNonempty(input.issuedAt) || !isNonempty(input.expiresAt)) {
    throw new CampaignGrantError(
      'invalid-identity',
      'Grant issuedAt and expiresAt must be nonempty ISO-8601 timestamps',
    );
  }
  const issuedMs = Date.parse(input.issuedAt);
  const expiresMs = Date.parse(input.expiresAt);
  if (!Number.isFinite(issuedMs) || !Number.isFinite(expiresMs)) {
    throw new CampaignGrantError(
      'invalid-identity',
      'Grant issuedAt and expiresAt must be parseable timestamps',
    );
  }
  if (expiresMs <= issuedMs) {
    throw new CampaignGrantError(
      'invalid-identity',
      'Grant expiresAt must be strictly after issuedAt',
    );
  }
}

/** True when the wire scopes array is already the canonical form. */
export function isCanonicalScopeArray(
  scopes: readonly unknown[],
): scopes is CampaignGrantScopes {
  if (!scopes.every((item) => typeof item === 'string')) return false;
  try {
    const canonical = canonicalizeGrantScopes(scopes as readonly string[]);
    return serializeGrantScopes(canonical) === JSON.stringify(scopes);
  } catch {
    return false;
  }
}

/** Hydrates a row; throws if stored scopes or ids are not closed/opaque. */
export function hydrateCampaignGrantRow(
  row: ICampaignGrantRow,
): ICampaignGrant {
  if (!isOpaqueGrantId(row.grant_id)) {
    throw new CampaignGrantError(
      'invalid-record',
      'Stored grant id is not an opaque 32-hex handle',
    );
  }
  return Object.freeze({
    grantId: row.grant_id,
    campaignId: row.campaign_id,
    participantId: row.participant_id,
    issuerPublicKey: row.issuer_public_key,
    scopes: parseGrantScopes(row.scopes),
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  });
}

/** ASCII ordering so canonical JSON does not depend on locale collations. */
function compareScopes(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
