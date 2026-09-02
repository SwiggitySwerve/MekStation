/**
 * Client reader for the authoritative launch head.
 *
 * The browser cannot know its branch or revision on its own, so it asks.
 * What comes back is held on LAUNCH STATE by the caller - never written
 * into `SerializedCampaign`. Putting a head on the persisted envelope
 * would mean a schema-version bump, the map/date drift test, and a
 * stored-payload migration, all to cache a value that is stale the
 * moment it is written. The head is read per launch, used once, and
 * discarded.
 *
 * IT NEVER FABRICATES A HEAD. A malformed payload, a transport failure
 * and a non-OK status all resolve to `unavailable`, because the failure
 * this guards against is a client that sends a plausible-looking
 * `{branchId: 'root', revision: 0}` it invented and gets admitted by a
 * comparison that was supposed to catch exactly that.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 */

import type { ICampaignLaunchHead } from '@/lib/campaign/authority/campaignLaunchHead';

/** Injected in tests; the browser passes nothing and gets `fetch`. */
export type LaunchHeadFetch = typeof fetch;

export type CampaignLaunchHeadRead =
  | ICampaignLaunchHead
  /** The campaign has no journal stream - launch proceeds ungated. */
  | { readonly kind: 'no-authoritative-stream' }
  /** The head could not be established. The caller must not invent one. */
  | { readonly kind: 'unavailable'; readonly reason: string };

function unavailable(reason: string): CampaignLaunchHeadRead {
  return { kind: 'unavailable', reason };
}

/**
 * Narrow an unknown payload to a head, or null.
 *
 * Every field is checked. A response missing `effectiveGeneration`, or
 * carrying a revision as a string, is not a head that happens to need
 * coercing - it is a payload this client does not understand, and
 * guessing at it would defeat the comparison it feeds.
 *
 * The `Number.isFinite` halves are DEFENCE IN DEPTH and knowingly
 * unreachable from the transport: `JSON.parse` cannot yield `NaN` or
 * `Infinity`, so no HTTP payload reaches those branches. They are kept
 * because this parser is the only thing standing between an arbitrary
 * object and a head the gate will trust, and a future caller handing it
 * an already-parsed object (a cache, a test fixture, a postMessage) has
 * no such guarantee. There is deliberately no test row for them; a row
 * would have to fabricate a value the network cannot produce.
 */
function parseLaunchHead(payload: unknown): CampaignLaunchHeadRead | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const body = payload as Record<string, unknown>;
  if (body.kind === 'no-authoritative-stream') {
    return { kind: 'no-authoritative-stream' };
  }
  if (body.kind !== 'head') return null;
  const { branchId, revision, effectiveGeneration } = body;
  if (typeof branchId !== 'string' || branchId.length === 0) return null;
  if (typeof revision !== 'number' || !Number.isFinite(revision)) return null;
  if (
    typeof effectiveGeneration !== 'number' ||
    !Number.isFinite(effectiveGeneration)
  ) {
    return null;
  }
  return { kind: 'head', branchId, revision, effectiveGeneration };
}

/**
 * Ask the authority which head this launch may name.
 *
 * Returns rather than throws: a launch that cannot establish its head
 * has a decision to make (proceed ungated, or refuse), and an exception
 * would collapse that decision into the caller's generic error path.
 */
export async function readCampaignLaunchHead(
  campaignId: string,
  fetchImpl: LaunchHeadFetch = fetch,
): Promise<CampaignLaunchHeadRead> {
  let response: Response;
  try {
    response = await fetchImpl(
      `/api/campaigns/${encodeURIComponent(campaignId)}/head`,
      { method: 'GET' },
    );
  } catch (error) {
    return unavailable(
      error instanceof Error ? error.message : 'launch head request failed',
    );
  }
  if (!response.ok) {
    return unavailable(`launch head request returned ${response.status}`);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return unavailable('launch head response was not JSON');
  }
  return (
    parseLaunchHead(payload) ??
    unavailable('launch head response was malformed')
  );
}
