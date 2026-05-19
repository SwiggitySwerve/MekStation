/**
 * Co-op mission launch — two-force composition (CO2).
 *
 * Per design D1, a co-op campaign mission launch builds ONE `IEncounter`
 * whose force roster is the union of both players' selected forces, all
 * assigned to the SAME side against the encounter's OpFor. Co-op combat
 * is NOT a new combat path — the composed encounter is run through the
 * existing `ServerMatchHost` server-authoritative loop (D1).
 *
 * This module is the composition step: it extends the
 * `add-campaign-combat-loop` mission→encounter bridge to accept a
 * two-force composition rather than rebuilding it. The single-force
 * bridge (`buildEncounterFromScenario`) still produces the base
 * encounter; this layer composes the co-op force roster on top.
 *
 * Each player contributes a `ICoopForceContribution` (the force and the
 * player's `CoopParticipationChoice`). Only `deploy` players' forces
 * enter the encounter as commandable seats; a `command-hq` player's
 * force sits the mission out (design D2, configurable per mission).
 *
 * A launch where NO player chose `deploy` has no one to fight it and is
 * BLOCKED here with a typed error (design D2 / spec scenario "Mission
 * with no deploying player is blocked").
 *
 * Pure and sync — no IO, no random. A re-run with the same inputs
 * produces an identical composition, preserving the determinism the
 * campaign-combat-loop bridge guarantees.
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-coop-campaign-play/design.md (D1, D2)
 * @module lib/campaign/coop/composeCoopEncounter
 */

import type { CoopParticipationChoice } from '@/types/campaign/CoopCampaign';
import type { IForce } from '@/types/campaign/Force';
import type { IEncounter } from '@/types/encounter';

// =============================================================================
// Co-op force contribution
// =============================================================================

/**
 * One player's contribution to a co-op mission launch — the player, the
 * force they bring, and their per-mission participation choice.
 */
export interface ICoopForceContribution {
  /** The player making the contribution. */
  readonly playerId: string;
  /** Whether this is the campaign host or the guest. */
  readonly role: 'host' | 'guest';
  /** The force the player contributes (its units may join the encounter). */
  readonly force: IForce;
  /** The player's per-mission `deploy` / `command-hq` choice (design D2). */
  readonly participation: CoopParticipationChoice;
}

// =============================================================================
// Composed co-op force
// =============================================================================

/**
 * The deployed-side roster of one composed co-op encounter — every unit
 * fielded on the shared player side, each tagged with its owning player
 * so `ServerMatchHost` seat/unit-ownership validation can reject a
 * cross-player intent (design D1 / spec scenario "Cross-player unit
 * intent is rejected").
 */
export interface ICoopUnitSeat {
  /** Stable unit id (matches the campaign roster / vault id). */
  readonly unitId: string;
  /** The player who owns and commands this unit on the map. */
  readonly ownerPlayerId: string;
  /** The force the unit belongs to. */
  readonly forceId: string;
}

/**
 * The composed co-op encounter — the base single-force encounter from
 * the campaign-combat-loop bridge, extended with the union of both
 * players' deployed units on the shared side.
 */
export interface ICoopEncounterComposition {
  /**
   * The base `IEncounter` the co-op composition rides — carries the map
   * config, victory conditions, OpFor config, and campaign linkage. It
   * is run through `ServerMatchHost` unchanged for transport (D1).
   */
  readonly encounter: IEncounter;
  /**
   * Every unit on the shared player side, tagged with its owner. The
   * union of all `deploy` players' force units — a `command-hq`
   * player's units are absent (design D2).
   */
  readonly coopSeats: readonly ICoopUnitSeat[];
  /** The player ids that chose `deploy` — they command map seats. */
  readonly deployingPlayerIds: readonly string[];
  /** The player ids that chose `command-hq` — they keep campaign access. */
  readonly commandHqPlayerIds: readonly string[];
}

// =============================================================================
// Composition result
// =============================================================================

/**
 * Stable rejection reasons a co-op composition can fail with. Surfaced
 * so the launch UI and tests can branch on the cause.
 */
export type CoopCompositionRejection =
  | 'no-deploying-player'
  | 'no-contributions'
  | 'duplicate-player';

/**
 * The result of composing a co-op encounter — either the composition or
 * a typed rejection. A rejection creates NO encounter (spec scenario
 * "Mission with no deploying player is blocked": "no encounter SHALL be
 * created").
 */
export type CoopCompositionResult =
  | { readonly ok: true; readonly composition: ICoopEncounterComposition }
  | { readonly ok: false; readonly reason: CoopCompositionRejection };

// =============================================================================
// Composition
// =============================================================================

/**
 * Compose a co-op encounter from a base encounter and both players'
 * force contributions.
 *
 * The base encounter (from `buildEncounterFromScenario`) supplies map,
 * victory conditions, OpFor, and campaign linkage. This function:
 *
 *   1. validates that at least one player chose `deploy` — a launch with
 *      both players in HQ is BLOCKED here (design D2);
 *   2. collects every `deploy` player's force units into the shared-side
 *      `coopSeats` roster, each tagged with its owner so `ServerMatchHost`
 *      can reject a cross-player intent (design D1);
 *   3. records the deploying vs command-HQ player split so the launch
 *      path can route each player to the map or the HQ surfaces.
 *
 * `command-hq` players' forces are deliberately NOT added to `coopSeats`
 * — they sit the mission out (design D2 default). The command-HQ
 * player still receives the co-op campaign events the battle produces
 * through their CO1 mirror (post-battle reconciliation, D8).
 *
 * @param baseEncounter - the single-force encounter from the bridge
 * @param contributions - one entry per player
 */
export function composeCoopEncounter(
  baseEncounter: IEncounter,
  contributions: readonly ICoopForceContribution[],
): CoopCompositionResult {
  // A composition needs at least one contribution.
  if (contributions.length === 0) {
    return { ok: false, reason: 'no-contributions' };
  }

  // A player may contribute exactly once — a duplicate player id is a
  // malformed launch request.
  const seenPlayers = new Set<string>();
  for (const contribution of contributions) {
    if (seenPlayers.has(contribution.playerId)) {
      return { ok: false, reason: 'duplicate-player' };
    }
    seenPlayers.add(contribution.playerId);
  }

  const deploying = contributions.filter(
    (entry) => entry.participation === 'deploy',
  );
  const commandHq = contributions.filter(
    (entry) => entry.participation === 'command-hq',
  );

  // Design D2 — at least one player MUST deploy or the mission has no
  // one to fight it. Blocked at launch, no encounter created.
  if (deploying.length === 0) {
    return { ok: false, reason: 'no-deploying-player' };
  }

  // Collect every deploying player's force units onto the shared side,
  // each tagged with its owner for `ServerMatchHost` ownership checks.
  const coopSeats: ICoopUnitSeat[] = [];
  for (const contribution of deploying) {
    for (const unitId of contribution.force.unitIds) {
      coopSeats.push({
        unitId,
        ownerPlayerId: contribution.playerId,
        forceId: contribution.force.id,
      });
    }
  }

  return {
    ok: true,
    composition: {
      encounter: baseEncounter,
      coopSeats,
      deployingPlayerIds: deploying.map((entry) => entry.playerId),
      commandHqPlayerIds: commandHq.map((entry) => entry.playerId),
    },
  };
}

// =============================================================================
// Ownership validation
// =============================================================================

/**
 * Check whether `playerId` owns `unitId` in a composed co-op encounter.
 *
 * `ServerMatchHost` already validates unit ownership for any seated
 * match; this helper expresses the co-op-specific ownership map so a
 * co-op combat-intent gate can reject an intent for a unit a player does
 * not own (design D1 / spec scenario "Cross-player unit intent is
 * rejected"). A unit absent from the composition is owned by no player,
 * so the helper returns `false` — an intent for it is rejected.
 */
export function ownsCoopUnit(
  composition: ICoopEncounterComposition,
  playerId: string,
  unitId: string,
): boolean {
  const seat = composition.coopSeats.find((entry) => entry.unitId === unitId);
  return seat !== undefined && seat.ownerPlayerId === playerId;
}
