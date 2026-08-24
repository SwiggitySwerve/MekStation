/**
 * The identity of a cached campaign copy (task 1.3; design D2).
 *
 * Client storage is a cache, never a source. A cache needs an identity,
 * or "is this copy the same thing the server has?" can only be guessed
 * at. Until now the guess was a session-level proxy - a copy that had not
 * been validated this session got refetched - which is right about WHEN
 * to check but says nothing about WHAT the copy is.
 *
 * The identity is the D2 pair: the hosting instance that wrote the copy,
 * and the revision it was at. Both are needed. Revision alone is
 * meaningless across hosts, because two different servers both have a
 * campaign at revision 7 and they are not the same campaign; instance
 * alone cannot tell a current copy from a stale one.
 *
 * The verdict is deliberately binary - usable, or replace. There is no
 * merge, and that is the point: reconciling a cached copy field by field
 * against the server would produce a campaign that never existed on
 * either side, assembled from two different points in its history. When
 * they disagree, the source wins whole.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D2)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
 */

/** What a cached copy claims to be. */
export interface ICampaignCacheKey {
  /** The hosting server instance that wrote it (D2). */
  readonly instanceId: string | null;
  /** Monotonic write version of the record it was taken from. */
  readonly revision: number;
}

export type CampaignCacheReplaceReason =
  /** Written before copies carried an identity: unknowable, so untrusted. */
  | 'unkeyed'
  /** Written by a different server than the one answering now. */
  | 'instance-changed'
  /** Same server, different point in the campaign's history. */
  | 'revision-diverged';

export type CampaignCacheVerdict =
  | { readonly kind: 'usable' }
  | { readonly kind: 'replace'; readonly reason: CampaignCacheReplaceReason };

/**
 * Decides whether a cached copy may stand.
 *
 * A cache is usable only when it names the SAME instance at the SAME
 * revision as the record the server just returned. Everything else is
 * replaced whole.
 *
 * Note what is deliberately NOT special-cased: a cache whose revision is
 * AHEAD of the server's is replaced like any other divergence. It is
 * tempting to treat that as "local work worth keeping", but a cache
 * cannot be ahead of its own source unless something has gone wrong -
 * the record was rolled back, restored from a backup, or the copy came
 * from a different lineage wearing the same id - and in every one of
 * those cases the server is the authority. Unsaved local work is
 * protected by the dirty-state exemption at the call site, which is a
 * fact about the SESSION, not a claim about the cache.
 */
export function evaluateCampaignCache(
  cached: ICampaignCacheKey | null,
  server: ICampaignCacheKey,
): CampaignCacheVerdict {
  if (cached === null) {
    return { kind: 'replace', reason: 'unkeyed' };
  }
  if (cached.instanceId === null || cached.instanceId !== server.instanceId) {
    // A copy with no instance cannot say which server it came from, and
    // one naming a different server is a different campaign lineage
    // regardless of how similar its contents look.
    return { kind: 'replace', reason: 'instance-changed' };
  }
  if (cached.revision !== server.revision) {
    return { kind: 'replace', reason: 'revision-diverged' };
  }
  return { kind: 'usable' };
}

/** Reads the cache key off a stored server record. */
export function campaignCacheKeyOf(record: {
  readonly instanceId?: string | null;
  readonly version: number;
}): ICampaignCacheKey {
  return {
    instanceId: record.instanceId ?? null,
    revision: record.version,
  };
}
