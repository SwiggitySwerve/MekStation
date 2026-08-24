/**
 * Cache identity and the replace-not-merge rule (task 1.3, design D2).
 *
 * Client storage is a cache, never a source. These rows pin what gives a
 * cached copy an identity, and pin that the answer to a disagreement is
 * always "take the server's copy whole" rather than any reconciliation.
 */

import { campaignCacheKeyOf, evaluateCampaignCache } from '../campaignCacheKey';

const HOST_A = 'instance-host-a';
const HOST_B = 'instance-host-b';

describe('campaign cache identity', () => {
  it('trusts a copy naming the same instance at the same revision', () => {
    expect(
      evaluateCampaignCache(
        { instanceId: HOST_A, revision: 7 },
        { instanceId: HOST_A, revision: 7 },
      ),
    ).toEqual({ kind: 'usable' });
  });

  it('replaces a copy written before caches carried an identity', () => {
    // Unkeyed is not "probably fine" - the copy cannot say what it is,
    // and an unknowable claim is not a weaker version of a true one.
    expect(
      evaluateCampaignCache(null, { instanceId: HOST_A, revision: 1 }),
    ).toEqual({ kind: 'replace', reason: 'unkeyed' });
  });

  it('replaces a copy from a different server at the same revision', () => {
    // The exact trap revision-only keying falls into: two servers both
    // have this campaign at revision 7 and they are not the same
    // campaign. Contents can look identical and still be a different
    // lineage.
    expect(
      evaluateCampaignCache(
        { instanceId: HOST_B, revision: 7 },
        { instanceId: HOST_A, revision: 7 },
      ),
    ).toEqual({ kind: 'replace', reason: 'instance-changed' });
  });

  it('replaces a copy that cannot say which server it came from', () => {
    expect(
      evaluateCampaignCache(
        { instanceId: null, revision: 7 },
        { instanceId: HOST_A, revision: 7 },
      ),
    ).toEqual({ kind: 'replace', reason: 'instance-changed' });
  });

  it('replaces a stale copy', () => {
    expect(
      evaluateCampaignCache(
        { instanceId: HOST_A, revision: 3 },
        { instanceId: HOST_A, revision: 9 },
      ),
    ).toEqual({ kind: 'replace', reason: 'revision-diverged' });
  });

  it('replaces a copy that claims to be AHEAD of its own source', () => {
    // Tempting to read as "local work worth keeping". It is not: a cache
    // cannot outrun its source unless the record was rolled back,
    // restored, or the copy came from another lineage wearing the same
    // id - and the server is the authority in every one of those. Unsaved
    // work is protected by the dirty-state exemption at the call site,
    // which is a fact about the session, not a claim about the cache.
    expect(
      evaluateCampaignCache(
        { instanceId: HOST_A, revision: 12 },
        { instanceId: HOST_A, revision: 9 },
      ),
    ).toEqual({ kind: 'replace', reason: 'revision-diverged' });
  });

  it('never answers with anything a caller could read as merge', () => {
    // The verdict is binary by construction. A third variant would be an
    // invitation to reconcile, which is the thing this rule forbids.
    const verdicts = [
      evaluateCampaignCache(null, { instanceId: HOST_A, revision: 1 }),
      evaluateCampaignCache(
        { instanceId: HOST_A, revision: 1 },
        { instanceId: HOST_A, revision: 1 },
      ),
      evaluateCampaignCache(
        { instanceId: HOST_B, revision: 1 },
        { instanceId: HOST_A, revision: 2 },
      ),
    ];

    for (const verdict of verdicts) {
      expect(['usable', 'replace']).toContain(verdict.kind);
    }
  });

  it('reads its key off a stored record, defaulting a missing instance to null', () => {
    expect(campaignCacheKeyOf({ instanceId: HOST_A, version: 4 })).toEqual({
      instanceId: HOST_A,
      revision: 4,
    });
    // A pre-D2 record has no instance. Defaulting it to null keeps it
    // UNTRUSTED rather than inventing an identity for it.
    expect(campaignCacheKeyOf({ version: 4 })).toEqual({
      instanceId: null,
      revision: 4,
    });
  });
});
