/**
 * Client transport for the launch-authority decision (umbrella 10.3).
 *
 * The launch holds a head it was given when the campaign hydrated and
 * sends THAT head here - not a freshly read one. Re-reading immediately
 * before launching would make the comparison vacuous, because it would
 * always match; the window between hydration and launch is exactly where
 * another client can advance the campaign, and catching that is the job.
 *
 * Like `readCampaignLaunchHead`, this never fabricates. A transport
 * failure, a non-JSON body and an unrecognised payload all resolve to
 * `unavailable`, and the caller refuses the launch rather than falling
 * back to an ungated one - a silent fallback would turn every outage
 * into an ungated launch, which is the opposite of what the gate is for.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 */

import type {
  IOwnedSlotForce,
  OwnedForceMaterializationResult,
} from '@/lib/campaign/encounter/campaignOwnedForceMaterialization';
import type {
  IActiveBranchHead,
  IExpectedBranchHead,
} from '@/lib/events/journal/EventHistoryExpectedHead';

export type LaunchAuthorityRefusalCode = string;

export type LaunchAuthority =
  /** Head is current; no co-op session, so the flat roster launches. */
  | { readonly kind: 'current'; readonly head: IActiveBranchHead }
  /** Head is current and both tactical slots resolved. */
  | {
      readonly kind: 'materialized';
      readonly head: IActiveBranchHead;
      readonly slots: readonly IOwnedSlotForce[];
    }
  /** No journal stream: launch proceeds ungated, exactly as today. */
  | { readonly kind: 'no-authoritative-stream' }
  /** The authority refused. Carries the head that IS current. */
  | {
      readonly kind: 'refused';
      readonly code: LaunchAuthorityRefusalCode;
      readonly reason: string;
      readonly activeHead: IActiveBranchHead;
      readonly resyncAction: string;
    }
  /** The decision could not be obtained. Never a licence to proceed. */
  | { readonly kind: 'unavailable'; readonly reason: string };

function unavailable(reason: string): LaunchAuthority {
  return { kind: 'unavailable', reason };
}

/** Narrow the authority's answer, or null when it is not one we know. */
function parseAuthority(payload: unknown): LaunchAuthority | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const body = payload as Record<string, unknown>;
  switch (body.kind) {
    case 'no-authoritative-stream':
      return { kind: 'no-authoritative-stream' };
    case 'current':
    case 'materialized':
    case 'refused':
      // The server owns these shapes and this client only relays them;
      // re-validating every nested slot here would duplicate the route's
      // contract in a second place that could drift from it.
      return body as unknown as LaunchAuthority;
    default:
      return null;
  }
}

export interface IRequestLaunchAuthorityInput {
  readonly campaignId: string;
  readonly missionId: string;
  /** The head held since hydration - deliberately not re-read here. */
  readonly expectedHead: IExpectedBranchHead;
  /** Present only for a co-op campaign; absent means no owned forces. */
  readonly sessionId?: string;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Ask whether this launch may proceed, and with whose forces.
 *
 * Returns rather than throws so the caller can distinguish "refused"
 * (show the conflict, offer resync) from "unavailable" (retryable) from
 * "proceed" - three different things a thrown error would flatten into
 * one.
 */
export async function requestLaunchAuthority({
  campaignId,
  missionId,
  expectedHead,
  sessionId,
  fetchImpl = fetch,
}: IRequestLaunchAuthorityInput): Promise<LaunchAuthority> {
  let response: Response;
  try {
    response = await fetchImpl(
      `/api/campaigns/${encodeURIComponent(campaignId)}/launch-authority`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedHead,
          missionId,
          ...(sessionId === undefined ? {} : { sessionId }),
        }),
      },
    );
  } catch (error) {
    return unavailable(
      error instanceof Error ? error.message : 'launch authority unreachable',
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return unavailable('launch authority response was not JSON');
  }

  const parsed = parseAuthority(payload);
  if (parsed === null) {
    // A 4xx/5xx that is not a typed refusal is still not permission.
    return unavailable(
      response.ok
        ? 'launch authority response was malformed'
        : `launch authority returned ${response.status}`,
    );
  }
  return parsed;
}

/**
 * A launch that could not obtain a decision.
 *
 * Distinct from a refusal on purpose. A refusal means the authority
 * answered and said no, and the recovery is to resync. This means
 * nobody answered, and the recovery is to retry - so it must never be
 * rendered as a stale-head conflict, and must never be treated as
 * permission.
 */
export class CampaignLaunchAuthorityUnavailableError extends Error {
  public constructor(public readonly reason: string) {
    super(`Launch authority unavailable: ${reason}`);
    this.name = 'CampaignLaunchAuthorityUnavailableError';
  }
}

/**
 * Turn an authority answer into the materializer input.
 *
 * The single decision point both launch paths share, so the dashboard
 * and the fast-forward runner cannot drift into two different readings
 * of the same four answers:
 *
 * - `materialized` and `refused` pass STRAIGHT THROUGH. The materializer
 *   already gates on a refusal before its first POST and throws the
 *   typed stale error, so relaying it here reuses that gate instead of
 *   building a second one.
 * - `current` and `no-authoritative-stream` become `undefined`: the head
 *   is fine and there are no owned forces to field, which is the flat
 *   roster path exactly as it behaves today.
 * - `unavailable` THROWS. Returning `undefined` for it would silently
 *   convert every outage into an ungated launch.
 */
export function ownedForcesFromAuthority(
  authority: LaunchAuthority,
): OwnedForceMaterializationResult | undefined {
  if (authority.kind === 'unavailable') {
    throw new CampaignLaunchAuthorityUnavailableError(authority.reason);
  }
  if (authority.kind === 'materialized' || authority.kind === 'refused') {
    return authority as OwnedForceMaterializationResult;
  }
  return undefined;
}
