/**
 * Shared test-only support for the group-5 fast-forward integration
 * suites (capstone, determinism, live-parity). NOT a `.test.ts`/`.spec.ts`
 * file — jest's `unit` project `testMatch` glob only picks up
 * `*.(test|spec).(js|ts|tsx)` (`jest.config.js`'s `unitJestConfig
 * .testMatch`), so importing this module never registers it as its own
 * suite.
 *
 * Centralizes what `fastForwardCombatRunner.test.ts` (groups 3/4)
 * pioneered so the three group-5 suites don't each hand-roll their own
 * copy:
 *  - the `CompendiumAdapter` catalog-lookup mock (drift correction, task
 *    4.1's doc comment: `CanonicalUnitService.getById()` always resolves
 *    `null` in a plain jest/node environment, so `adaptUnit` must be
 *    mocked at the catalog-lookup boundary — never at combat mechanics)
 *    using the SAME canonical armor/structure sheets for the SAME
 *    representative refs the fast-forward fixture deploys
 *    (`fastForwardFixture.ts`'s `CANONICAL_UNIT_REFS`).
 *  - the full singleton-reset sweep (`phase4CampaignRoundTrip.test.ts`'s
 *    pattern, design D8).
 *  - a battle-outcome-capturing wrapper around the real
 *    `runFastForwardBattle` runner, so suites that need to assert on the
 *    actual `ICombatOutcome` (invariant checks, cross-run comparison) can
 *    do so without writing to `campaign.pendingBattleOutcomes` directly
 *    (design D5's rejected alternative) — `deriveCombatOutcome` is a pure
 *    function (`combatOutcome.ts`'s own "Determinism rule" doc comment),
 *    so re-deriving it a second time from the SAME session here is a
 *    read-only capture, never a second mutation.
 *
 * @module __tests__/integration/fastForwardTestSupport
 */

import type { IAdaptedUnit } from '@/engine/types';
import type { FastForwardBattleRunner } from '@/lib/campaign/fastForward/fastForwardCampaign';
import type { IWeapon } from '@/simulation/ai/types';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { _resetCombatOutcomeBus } from '@/engine/combatOutcomeBus';
import { _resetContractFulfilledBus } from '@/lib/campaign/contractFulfillmentBus';
import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { runFastForwardBattle } from '@/lib/campaign/fastForward/fastForwardCombatRunner';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import { deriveCombatOutcome } from '@/lib/combat/outcome/combatOutcome';
import { resetEncounterRepository } from '@/services/encounter/EncounterRepository';
import { resetEncounterService } from '@/services/encounter/EncounterService';
import { resetForceRepository } from '@/services/forces/ForceRepository';
import { resetForceService } from '@/services/forces/ForceService';
import { resetSQLiteService } from '@/services/persistence/SQLiteService';
import { resetPilotRepository } from '@/services/pilots/PilotRepository';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { resetCampaignStore } from '@/stores/campaign/useCampaignStore';
import { Facing, GameSide, LockState, MovementType } from '@/types/gameplay';

// =============================================================================
// World reset (design D8's `phase4CampaignRoundTrip.test.ts` sweep, plus
// the SQLite/repository resets `fastForwardCombatRunner.test.ts` added —
// EncounterRepository needs its own reset symmetric with ForceRepository,
// see that file's `resetDatabaseState` doc comment).
// =============================================================================

/** Reset every singleton the group-5 suites touch. Call before AND after each test/run. */
export function resetWorld(): void {
  resetForceService();
  resetForceRepository();
  resetEncounterService();
  resetEncounterRepository();
  resetPilotRepository();
  resetSQLiteService();
  resetCampaignStore();
  _resetCombatOutcomeBus();
  _resetContractFulfilledBus();
  _resetDayPipeline();
  _resetBuiltinRegistration();
  useCampaignRosterStore.getState().reset();
}

// =============================================================================
// Catalog-lookup mock (drift correction from task 4.1 — see module doc)
// =============================================================================

/** Same four canonical refs `fastForwardFixture.ts` deploys, same sheets `fastForwardCombatRunner.test.ts` uses. */
export const CANONICAL_COMBAT_SHEETS: Record<
  string,
  {
    readonly armor: Record<string, number>;
    readonly structure: Record<string, number>;
    readonly tonnage: number;
  }
> = {
  'locust-lct-1v': {
    armor: { head: 9, center_torso: 20, left_torso: 10, right_torso: 10 },
    structure: { head: 3, center_torso: 10, left_torso: 5, right_torso: 5 },
    tonnage: 20,
  },
  'hunchback-hbk-4g': {
    armor: { head: 9, center_torso: 30, left_torso: 22, right_torso: 22 },
    structure: { head: 3, center_torso: 21, left_torso: 15, right_torso: 15 },
    tonnage: 50,
  },
  'marauder-mad-3r': {
    armor: { head: 9, center_torso: 36, left_torso: 26, right_torso: 26 },
    structure: { head: 3, center_torso: 23, left_torso: 16, right_torso: 16 },
    tonnage: 75,
  },
  'atlas-as7-d': {
    armor: { head: 9, center_torso: 47, left_torso: 32, right_torso: 32 },
    structure: { head: 3, center_torso: 31, left_torso: 21, right_torso: 21 },
    tonnage: 100,
  },
};

/** Real weapon data so `runToCompletion` genuinely inflicts damage (task 4.1's drift-correction rationale). */
function createTestWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

/** Build the mocked `adaptUnit` return value for one of the four canonical refs. Returns `null` for anything else. */
export function makeAdaptedUnit(
  unitRef: string,
  side: GameSide,
): IAdaptedUnit | null {
  const sheet = CANONICAL_COMBAT_SHEETS[unitRef];
  if (!sheet) return null;
  return {
    id: unitRef,
    side,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    heatSinks: 10,
    heatSinkType: 'single',
    armor: { ...sheet.armor },
    structure: { ...sheet.structure },
    startingInternalStructure: { ...sheet.structure },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    hasRetreated: false,
    hasEjected: false,
    tonnage: sheet.tonnage,
    weapons: [createTestWeapon(`${unitRef}-ml-1`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

// =============================================================================
// Outcome-capturing runner
// =============================================================================

/** One fought battle's identity plus its actually-derived-and-published `ICombatOutcome`. */
export interface CapturedBattleOutcome {
  readonly scenarioId: string;
  readonly contractId: string;
  readonly outcome: ICombatOutcome;
}

/**
 * Wrap the real `runFastForwardBattle` runner so every fought battle's
 * derived `ICombatOutcome` is captured into `sink`, in fight order — for
 * invariant assertions and cross-run comparison. Still drives the real
 * runner (real handlers, real engine, real bus publish) — this only ADDS
 * a read-only capture on top, never bypasses or replaces anything (design
 * D5: the runner never applies outcomes directly, and neither does this
 * wrapper).
 */
export function createCapturingRunner(
  sink: CapturedBattleOutcome[],
): FastForwardBattleRunner {
  return async (handoff) => {
    const detail = await runFastForwardBattle(handoff);
    if (!detail) return null;
    const outcome = deriveCombatOutcome(detail.session, {
      contractId: handoff.contractId,
      scenarioId: handoff.scenarioId,
    });
    sink.push({
      scenarioId: handoff.scenarioId,
      contractId: handoff.contractId,
      outcome,
    });
    return { matchId: detail.matchId, seed: detail.seed };
  };
}
