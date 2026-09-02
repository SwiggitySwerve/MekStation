/**
 * Launch-authority glue for the campaign dashboard (umbrella 10.3).
 *
 * Extracted from the page for the same reason the create page keeps
 * its submit in a sibling: the component owns rendering and state, and
 * this owns the launch decision. Keeping both in one file pushed it
 * past its size budget, which is the codebase noticing the split.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 */

import type { OwnedForceMaterializationResult } from '@/lib/campaign/encounter/campaignOwnedForceMaterialization';
import type { CampaignLaunchHeadRead } from '@/lib/campaign/encounter/readCampaignLaunchHead';
import type { ICampaignLaunchConflict } from '@/stores/campaign/useCampaignPersistenceStore';

import { CampaignOwnedForceStaleError } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import {
  CampaignLaunchAuthorityUnavailableError,
  ownedForcesFromAuthority,
  requestLaunchAuthority,
} from '@/lib/campaign/encounter/requestLaunchAuthority';

/**
 * Resolve the owned forces this launch may field, or throw.
 *
 * Sends the head held since hydration rather than reading a fresh one:
 * a head read a moment before it is sent always matches, and the
 * comparison it feeds would prove nothing. A campaign with no head yet
 * (or none at all) launches ungated, exactly as it does today.
 */
export async function resolveDashboardLaunchForces(input: {
  readonly campaignId: string;
  readonly missionId: string;
  readonly launchHead: CampaignLaunchHeadRead | null;
  readonly sessionId?: string;
}): Promise<OwnedForceMaterializationResult | undefined> {
  const { launchHead } = input;
  if (launchHead === null || launchHead.kind !== 'head') return undefined;
  return ownedForcesFromAuthority(
    await requestLaunchAuthority({
      campaignId: input.campaignId,
      missionId: input.missionId,
      // Send exactly the wire contract. `launchHead` also carries the
      // reader's own `kind` discriminant, and putting that on the wire
      // would ship a field whose name already means something different
      // in the route's RESPONSE vocabulary.
      expectedHead: {
        branchId: launchHead.branchId,
        revision: launchHead.revision,
        effectiveGeneration: launchHead.effectiveGeneration,
      },
      ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId }),
    }),
  );
}

/**
 * Classify a launch failure into the surface that can act on it.
 *
 * A stale head becomes a typed conflict with the head that IS current,
 * so the user can resync. An unavailable authority is retryable and
 * explicitly NOT a conflict - nobody answered, so there is no head to
 * resync to. Everything else keeps the generic message.
 */
export function classifyLaunchFailure(
  error: unknown,
):
  | { readonly kind: 'conflict'; readonly conflict: ICampaignLaunchConflict }
  | { readonly kind: 'message'; readonly message: string } {
  if (error instanceof CampaignOwnedForceStaleError) {
    return {
      kind: 'conflict',
      conflict: {
        code: error.code,
        reason: error.message,
        activeHead: error.activeHead,
        resyncAction: error.resyncAction,
      },
    };
  }
  if (error instanceof CampaignLaunchAuthorityUnavailableError) {
    return {
      kind: 'message',
      message: `Launch could not be authorised (${error.reason}). Retry in a moment.`,
    };
  }
  const message =
    error instanceof Error ? error.message : 'failed to generate mission';
  return {
    kind: 'message',
    message: `Mission could not be launched: ${message}`,
  };
}
