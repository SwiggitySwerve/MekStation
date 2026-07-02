/**
 * Co-op mission launch path (CO2).
 *
 * Per design D1, a co-op campaign mission launch is *composition* (build
 * one encounter from two rosters) plus *routing* (send it through the
 * existing `ServerMatchHost` server-authoritative combat loop) — NOT a
 * new combat path. This module is the routing step:
 *
 *   1. compose the co-op encounter from both players' force
 *      contributions via `composeCoopEncounter` — this is where a
 *      zero-`deploy` launch is BLOCKED (design D2);
 *   2. launch the composed encounter through the existing
 *      `add-campaign-combat-loop` launch path (`launchCampaignEncounter`
 *      → `EncounterService.launchEncounter` → `ServerMatchHost`), so the
 *      co-op encounter runs on the same authoritative combat host any
 *      campaign encounter uses (design D1 / spec "Co-op encounter runs
 *      through the existing combat host").
 *
 * The composed `ICoopEncounterComposition` is returned alongside the
 * launch result so the caller can route each deploying player to the
 * map and each `command-hq` player to the campaign-management surfaces
 * (design D2 / spec "Per-Mission Participation Choice").
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-coop-campaign-play/design.md (D1, D2)
 * @module lib/campaign/coop/launchCoopMission
 */

import type { IEncounter } from '@/types/encounter';

import { getEncounterService } from '@/services/encounter/EncounterService';

import type { ICampaignEncounterLauncherService } from '../encounter/launchCampaignEncounter';
import type {
  CoopCompositionRejection,
  ICoopEncounterComposition,
  ICoopForceContribution,
} from './composeCoopEncounter';

import { launchCampaignEncounter } from '../encounter/launchCampaignEncounter';
import { composeCoopEncounter } from './composeCoopEncounter';

// =============================================================================
// Result
// =============================================================================

/**
 * The outcome of a co-op mission launch — a discriminated union over
 * `ok`. A blocked composition (no deploying player) carries the typed
 * `CoopCompositionRejection`; a launch failure carries the encounter
 * service's error string.
 */
export type LaunchCoopMissionResult =
  | {
      readonly ok: true;
      /** The id of the launched `GameSession` running on `ServerMatchHost`. */
      readonly gameSessionId: string | undefined;
      /** The materialised encounter id. */
      readonly encounterId: string | undefined;
      /** The composed co-op encounter — drives map vs HQ routing. */
      readonly composition: ICoopEncounterComposition;
    }
  | {
      readonly ok: false;
      /** Set when the composition itself was rejected (design D2). */
      readonly compositionRejection?: CoopCompositionRejection;
      /** Human-readable failure reason. */
      readonly error: string;
    };

// =============================================================================
// Launch
// =============================================================================

/**
 * Launch a co-op campaign mission with both players' forces.
 *
 * @param baseEncounter - the single-force encounter from the
 *   `add-campaign-combat-loop` mission→encounter bridge
 *   (`buildEncounterFromScenario`)
 * @param contributions - one `ICoopForceContribution` per player,
 *   carrying the force and the player's `deploy` / `command-hq` choice
 * @param service - encounter service (injectable; defaults to singleton)
 */
export async function launchCoopMission(
  baseEncounter: IEncounter,
  contributions: readonly ICoopForceContribution[],
  service: ICampaignEncounterLauncherService = getEncounterService(),
): Promise<LaunchCoopMissionResult> {
  // Step 1 — compose the co-op encounter. A zero-`deploy` launch is
  // BLOCKED here with a typed rejection; no encounter is created
  // (design D2 / spec "Mission with no deploying player is blocked").
  const composed = composeCoopEncounter(baseEncounter, contributions);
  if (!composed.ok) {
    return {
      ok: false,
      compositionRejection: composed.reason,
      error: rejectionMessage(composed.reason),
    };
  }

  // Step 2 — route the composed encounter through the EXISTING campaign
  // encounter launch path. No new combat transport — co-op combat runs
  // on the same `ServerMatchHost` loop any campaign encounter uses
  // (design D1).
  const launched = await launchCampaignEncounter(
    composed.composition.encounter,
    service,
  );
  if (!launched.success) {
    return {
      ok: false,
      error: launched.error ?? 'Failed to launch co-op encounter',
    };
  }

  return {
    ok: true,
    gameSessionId: launched.gameSessionId,
    encounterId: launched.encounterId,
    composition: composed.composition,
  };
}

/**
 * Map a composition rejection to a clear, human-readable launch error.
 */
function rejectionMessage(reason: CoopCompositionRejection): string {
  switch (reason) {
    case 'no-deploying-player':
      return 'Co-op mission cannot launch: at least one player must deploy onto the map. A mission with both players in command HQ has no one to fight it.';
    case 'no-contributions':
      return 'Co-op mission cannot launch: no player forces were contributed.';
    case 'duplicate-player':
      return 'Co-op mission cannot launch: a player contributed a force more than once.';
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return 'Co-op mission cannot launch.';
    }
  }
}
