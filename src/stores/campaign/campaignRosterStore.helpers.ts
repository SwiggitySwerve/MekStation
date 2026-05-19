/**
 * Campaign Roster Store — Pure Helper Functions
 *
 * Extracted from `useCampaignRosterStore.ts` as part of a behavior-preserving
 * decomposition: the store module was over the 600-LOC critical threshold.
 * Everything in this file is a pure function — no Zustand `set`/`get`, no
 * store coupling — so the store definition itself stays thin and these
 * derivations stay independently unit-testable.
 *
 * @see ./useCampaignRosterStore.ts
 */

import type {
  IDestroyedComponent,
  IUnitCombatState,
} from '@/types/campaign/UnitCombatState';

import {
  deriveRosterReadiness,
  type IRosterUnitProjection,
} from '@/types/campaign/RosterUnitProjection';

import type {
  IUnitDamageState,
  UnitReadiness,
} from './campaignRosterStore.types';

/**
 * Generate a short, collision-resistant id.
 *
 * Combines the current epoch millis with a random base-36 suffix. Used to
 * mint mission ids and the synthesized `matchId` for the legacy damage
 * carry-forward bridge — uniqueness only needs to hold within a single
 * client session, so a UUID dependency would be overkill.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Build a fresh canonical combat state from a carry-forward payload.
 *
 * The carry-forward shape only carries deltas (damage points lost) and
 * a destroyed-flag, so we construct the canonical state by:
 * - Starting from any pre-existing canonical state (preserves accumulated
 *   destruction history across multiple battles).
 * - Subtracting reported damage from current armor / structure (clamped at
 *   zero to avoid negative values).
 * - Appending newly destroyed component names as `IDestroyedComponent`
 *   entries with synthesized `slot=-1` / `componentType='unknown'` —
 *   the carry-forward shape doesn't carry crit-slot detail, so the
 *   placeholder marks "destroyed at this matchId" for audit purposes.
 *   The canonical post-battle processor (the new path) writes proper
 *   `IDestroyedComponent` entries with full crit-slot data; this
 *   roster-store path is the legacy game-session bridge.
 * - Flipping `combatReady` to false when the payload reports the unit
 *   as destroyed.
 *
 * @param prior Existing canonical state for this unit, if any.
 * @param damage Carry-forward payload from the game session layer.
 * @param matchId Mission id used as `lastCombatOutcomeId` and on
 *   destroyed-component `destroyedAt`.
 * @returns A fresh `IUnitCombatState` ready to overwrite the entry on
 *   `ICampaign.unitCombatStates`.
 */
export function applyDamageToCanonicalState(
  prior: IUnitCombatState | undefined,
  damage: IUnitDamageState,
  matchId: string,
): IUnitCombatState {
  // Start from prior canonical state (preserves multi-battle accumulation)
  // or seed an empty baseline for units with no prior state. The legacy
  // game-session bridge does not have construction max values handy, so
  // empty maps are the only safe baseline.
  const priorArmor = prior?.currentArmorPerLocation ?? {};
  const priorStructure = prior?.currentStructurePerLocation ?? {};
  const priorDestroyedComponents = prior?.destroyedComponents ?? [];
  const priorDestroyedLocations = prior?.destroyedLocations ?? [];

  // Apply armor deltas (clamp at zero — carry-forward damage values are
  // points-lost, not absolute remaining values).
  const nextArmor: Record<string, number> = { ...priorArmor };
  for (const [loc, dmg] of Object.entries(damage.armorDamage)) {
    const current = nextArmor[loc] ?? 0;
    nextArmor[loc] = Math.max(0, current - dmg);
  }

  // Same treatment for structure.
  const nextStructure: Record<string, number> = { ...priorStructure };
  for (const [loc, dmg] of Object.entries(damage.structureDamage)) {
    const current = nextStructure[loc] ?? 0;
    nextStructure[loc] = Math.max(0, current - dmg);
  }

  // Append newly destroyed components. Dedupe by name+matchId so the same
  // outcome applied twice won't double-grow the array — full slot+location
  // dedupe would require crit-slot info the carry-forward shape doesn't
  // carry.
  const seen = new Set(
    priorDestroyedComponents.map((c) => `${c.name}|${c.destroyedAt}`),
  );
  const nextDestroyedComponents: IDestroyedComponent[] = [
    ...priorDestroyedComponents,
  ];
  for (const name of damage.destroyedComponents) {
    const key = `${name}|${matchId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    nextDestroyedComponents.push({
      // Synthesized placeholder fields — the legacy bridge can't recover
      // crit-slot detail. Audit consumers reading `destroyedAt` get the
      // matchId; consumers needing slot-level detail should switch to the
      // canonical postBattleProcessor path.
      location: 'UNKNOWN',
      slot: -1,
      componentType: 'unknown',
      name,
      destroyedAt: matchId,
    });
  }

  return {
    unitId: damage.unitId,
    currentArmorPerLocation: nextArmor,
    currentStructurePerLocation: nextStructure,
    destroyedLocations: priorDestroyedLocations,
    destroyedComponents: nextDestroyedComponents,
    heatEnd: prior?.heatEnd ?? 0,
    ammoRemaining: prior?.ammoRemaining ?? {},
    combatReady: damage.destroyed ? false : (prior?.combatReady ?? true),
    lastCombatOutcomeId: matchId,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Derive a roster unit's refreshed `readiness` from a carry-forward payload.
 *
 * Builds a synthetic `IUnitCombatState` shell to feed `deriveRosterReadiness`
 * — only `combatReady` + destroyed-component count matter to that helper, so
 * the armor/structure maps stay empty. When the helper returns 'Ready' but the
 * payload reports armor or structure damage, the result is bumped to 'Damaged'
 * (the helper can't see armor deltas without a max-state companion, so this
 * bridges that gap). Pure: returns the readiness, the store applies it.
 *
 * @param unitId The roster unit being refreshed.
 * @param damage Carry-forward payload for that unit.
 * @param matchId Mission id stamped onto synthesized destroyed-component
 *   entries and `lastCombatOutcomeId`.
 * @returns The derived `UnitReadiness` for the projection.
 */
export function deriveReadinessFromCarryForward(
  unitId: string,
  damage: IUnitDamageState,
  matchId: string,
): UnitReadiness {
  // Build a synthetic combat state shell to feed `deriveRosterReadiness` —
  // we don't need the canonical state's full detail for the readiness
  // derivation, just `combatReady` + destroyed component count.
  const synthState: IUnitCombatState = {
    unitId,
    currentArmorPerLocation: {},
    currentStructurePerLocation: {},
    destroyedLocations: [],
    destroyedComponents: damage.destroyedComponents.map((name) => ({
      location: 'UNKNOWN',
      slot: -1,
      componentType: 'unknown',
      name,
      destroyedAt: matchId,
    })),
    heatEnd: 0,
    ammoRemaining: {},
    combatReady: !damage.destroyed,
    lastCombatOutcomeId: matchId,
    lastUpdated: null,
  };

  const totalArmorDmg = Object.values(damage.armorDamage).reduce(
    (sum, v) => sum + v,
    0,
  );
  const totalStructDmg = Object.values(damage.structureDamage).reduce(
    (sum, v) => sum + v,
    0,
  );
  const tookDamage = totalArmorDmg > 0 || totalStructDmg > 0;

  // Derive readiness — when the unit is destroyed, `deriveRosterReadiness`
  // returns 'Destroyed' from `combatReady=false`. When alive but with
  // destroyed components, it returns 'Damaged'. When alive without destroyed
  // components but with armor/structure damage, the helper would return
  // 'Ready' (since it can't see armor deltas without a max-state companion)
  // — bridge that gap by checking damage totals here.
  let readiness = deriveRosterReadiness(synthState);
  if (readiness === 'Ready' && tookDamage) {
    readiness = 'Damaged';
  }
  return readiness;
}

/**
 * Refresh the `readiness` field of each roster projection from a batch of
 * carry-forward payloads.
 *
 * Pure list transform: units with a matching payload get a new object with
 * the derived readiness; units without a payload pass through by reference.
 * The store wraps this in `set` — keeping the projection update independent
 * of the canonical-state write so the two paths stay cleanly decoupled.
 *
 * @param units Current roster projection list.
 * @param damageStates Carry-forward payloads from the battle result.
 * @param matchId Mission id used for the synthetic-state derivation.
 * @returns A new projection list with refreshed `readiness` values.
 */
export function refreshUnitsReadiness(
  units: readonly IRosterUnitProjection[],
  damageStates: readonly IUnitDamageState[],
  matchId: string,
): IRosterUnitProjection[] {
  return units.map((unit) => {
    const damage = damageStates.find((d) => d.unitId === unit.unitId);
    if (!damage) return unit;
    const readiness = deriveReadinessFromCarryForward(
      unit.unitId,
      damage,
      matchId,
    );
    return { ...unit, readiness };
  });
}

/**
 * Compute the next canonical `unitCombatStates` map from a prior map plus a
 * batch of carry-forward payloads.
 *
 * Pure: copies the prior map, then overwrites each affected unit's entry with
 * the result of `applyDamageToCanonicalState`. The store passes the result to
 * `useCampaignStore.updateCampaign`.
 *
 * @param priorMap The campaign's current `unitCombatStates` map.
 * @param damageStates Carry-forward payloads from the battle result.
 * @param matchId Mission id stamped onto each rebuilt combat state.
 * @returns A new `unitCombatStates` map ready to write back to the campaign.
 */
export function buildNextCombatStateMap(
  priorMap: Readonly<Record<string, IUnitCombatState>>,
  damageStates: readonly IUnitDamageState[],
  matchId: string,
): Record<string, IUnitCombatState> {
  const nextMap: Record<string, IUnitCombatState> = { ...priorMap };
  for (const damage of damageStates) {
    nextMap[damage.unitId] = applyDamageToCanonicalState(
      priorMap[damage.unitId],
      damage,
      matchId,
    );
  }
  return nextMap;
}
