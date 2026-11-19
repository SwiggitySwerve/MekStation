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

import type { IUnitCombatState } from '@/types/campaign/UnitCombatState';

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
 * The store wraps this in `set`. Canonical combat state is written only by
 * `postBattleProcessor` (T1).
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
