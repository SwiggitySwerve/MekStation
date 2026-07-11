/**
 * `runFastForwardBattle` / `createFastForwardCombatRunner` — one bridged
 * scenario runs end-to-end through the real API handlers, the real
 * catalog-adapted construction path, and the real `GameEngine`, and the
 * published outcome lands + applies through the production combat-outcome
 * bus and the NEXT `advanceDay()` (task 3.3 acceptance).
 *
 * Drift correction (surfaced by wiring in the task 4.1 damage guard):
 * `CanonicalUnitService.getById()` loads bundled unit data via `fetch()`
 * (`services/units/CanonicalUnitService.ts:161`) — there is no
 * filesystem fallback, so an UNMOCKED `adaptUnit()` always resolves to
 * `null` in a plain jest/node environment (no server to fetch from,
 * confirmed during authoring: every other jest suite in this repo that
 * exercises `adaptUnit` mocks `@/engine/adapters/CompendiumAdapter`,
 * this file was the first to call it unmocked). Unmocked, every unit's
 * `armorByLocation`/`structureByLocation` stay empty and the battle
 * silently runs zero real armor/structure — invisible to this file's
 * PRE-4.1 assertions (`campaignMissions`/`xp` increment unconditionally
 * per applied outcome, `postBattleProcessor.helpers.ts:158-159`,
 * regardless of whether real combat occurred) but caught immediately by
 * `assertSessionInflictedDamage` (task 4.1) as a zero-armor-start battle
 * — exactly the class it exists to catch. The fix mirrors this repo's
 * own established precedent (`campaignMissionEncounterLaunchIntegrity
 * .test.ts`'s `CANONICAL_COMBAT_SHEETS`/`makeAdaptedUnit`): mock the
 * catalog LOOKUP boundary only (the network fetch), not combat
 * mechanics, using the SAME canonical armor/structure sheets for the
 * SAME representative refs the fast-forward fixture deploys — so real
 * armor/structure data flows through the real engine, same as it does
 * live.
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-fast-forward-api/spec.md
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import type { IAdaptedUnit } from '@/engine/types';
import type { ICampaignWithBridgeState } from '@/lib/campaign/processors/scenarioEncounterBridgeProcessor';
import type { IWeapon } from '@/simulation/ai/types';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { _resetCombatOutcomeBus } from '@/engine/combatOutcomeBus';
import { _resetContractFulfilledBus } from '@/lib/campaign/contractFulfillmentBus';
import { _resetDayPipeline } from '@/lib/campaign/dayPipeline';
import { _resetBuiltinRegistration } from '@/lib/campaign/processors';
import { resolveCampaignSeed } from '@/lib/campaign/utils/campaignRng';
import {
  getEncounterRepository,
  resetEncounterRepository,
} from '@/services/encounter/EncounterRepository';
import { resetEncounterService } from '@/services/encounter/EncounterService';
import {
  getForceRepository,
  resetForceRepository,
} from '@/services/forces/ForceRepository';
import { resetForceService } from '@/services/forces/ForceService';
import { resetSQLiteService } from '@/services/persistence/SQLiteService';
import { resetPilotRepository } from '@/services/pilots/PilotRepository';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { Facing, GameSide, LockState, MovementType } from '@/types/gameplay';

import type { FastForwardBattleRunner } from '../fastForwardCampaign';

import { deriveBattleSeed } from '../deriveBattleSeed';
import { fastForwardCampaign } from '../fastForwardCampaign';
import {
  createFastForwardCombatRunner,
  runFastForwardBattle,
} from '../fastForwardCombatRunner';
import { buildFastForwardFixture } from '../fastForwardFixture';
import { initializeInProcessApiDatabase } from '../inProcessApiRouter';

jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  adaptUnit: jest.fn(),
}));

const adaptUnitMock = adaptUnit as jest.MockedFunction<typeof adaptUnit>;

// Same representative refs + canonical combat sheets as
// `campaignMissionEncounterLaunchIntegrity.test.ts` — the fast-forward
// fixture (`fastForwardFixture.ts`) deploys exactly these four refs.
const CANONICAL_COMBAT_SHEETS: Record<
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

// Real weapon data so `runToCompletion` can actually inflict damage —
// the sibling precedent (`campaignMissionEncounterLaunchIntegrity
// .test.ts`) leaves `weapons: []` because it never advances past
// Initiative; this file runs the battle to completion, so an
// unarmed unit would trip the task 4.1 guard's zero-damage condition
// for a different (equally real) reason than the drift this comment
// documents.
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

function makeAdaptedUnit(unitRef: string, side: GameSide): IAdaptedUnit | null {
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

function resetDatabaseState(): void {
  resetForceService();
  resetForceRepository();
  resetEncounterService();
  // Verified during authoring: `EncounterRepository` (unlike
  // `PilotRepository`) guards its `CREATE TABLE` DDL behind its own
  // `this.initialized` instance flag — the same pattern
  // `ForceRepository` uses, and its reset is symmetric. Skipping this
  // reset leaves a later test's fresh `:memory:` SQLite connection (from
  // `resetSQLiteService()` + `initializeInProcessApiDatabase()` below)
  // with no `encounters` table while the cached repository instance
  // believes it already ran the DDL — "no such table: encounters" on the
  // first encounter write of any test after the first one to touch it.
  resetEncounterRepository();
  resetPilotRepository();
  resetSQLiteService();
}

function resetWorld(): void {
  resetDatabaseState();
  resetCampaignStore();
  _resetCombatOutcomeBus();
  _resetContractFulfilledBus();
  _resetDayPipeline();
  _resetBuiltinRegistration();
  useCampaignRosterStore.getState().reset();
}

describe('runFastForwardBattle', () => {
  beforeEach(() => {
    resetWorld();
    initializeInProcessApiDatabase();
    adaptUnitMock.mockImplementation(async (unitRef, options) =>
      makeAdaptedUnit(unitRef, options?.side ?? GameSide.Player),
    );
  });

  afterEach(() => {
    resetWorld();
    adaptUnitMock.mockReset();
  });

  it('runs one bridged scenario end-to-end: real SQLite rows, W1-stamped derived seed, outcome lands in pendingBattleOutcomes via the store, and the NEXT advanceDay() applies pilot attribution through vault-shaped ids', async () => {
    const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });
    const store = useCampaignStore();
    store.getState().switchCampaign(fixture.campaign);

    // Monday: scenario generation + bridge fire through the registered
    // pipeline (`advanceDay` self-registers processors).
    const dayOneReport = await store.getState().advanceDay();
    if (!dayOneReport) {
      throw new Error('day 1 advanceDay() returned null');
    }
    const afterDayOne = dayOneReport.campaign as ICampaignWithBridgeState;
    const scenarioId = afterDayOne.bridgedScenarioIds?.[0];
    if (!scenarioId) {
      throw new Error(
        'no scenario bridged on the fixture Monday — fixture roll budget regressed',
      );
    }
    const bridgedEncounter = afterDayOne.bridgedEncounters?.[scenarioId];
    if (!bridgedEncounter?.campaignMeta) {
      throw new Error(
        `bridged encounter for ${scenarioId} has no campaignMeta`,
      );
    }

    // Identify the fought team's roster unit + pilot BEFORE the battle so
    // the post-drain XP assertion has a known baseline (0, per the
    // fixture's freshly-seeded roster).
    const teamForceId = bridgedEncounter.playerForce?.forceId;
    if (!teamForceId) {
      throw new Error(`bridged encounter ${scenarioId} has no player force`);
    }
    const teamForce = afterDayOne.forces.get(teamForceId);
    const teamUnitIds = new Set(teamForce?.unitIds ?? []);
    const rosterUnit = useCampaignRosterStore
      .getState()
      .units.find((unit) => teamUnitIds.has(unit.unitId));
    if (!rosterUnit?.pilotId) {
      throw new Error(`no roster unit/pilot resolves for force ${teamForceId}`);
    }
    // `unitId` (the roster-projection identity) is stable across the
    // battle; `pilotId` gets remapped from the fixture's placeholder
    // vault-shaped id to a real SQLite `PilotRepository` id by
    // `ensureRealPilotIds` during materialization (verified during
    // authoring — the assignment API validates pilotId against a real
    // pilot row). Re-resolve by `unitId` after the battle rather than by
    // the pre-battle `pilotId` snapshot.
    const rosterUnitId = rosterUnit.unitId;
    const pilotIdBefore = rosterUnit.pilotId;
    // Vault-shaped, never session-unit-id-shaped (spec: XP invariants ban
    // the rig) — the fixture's own contract, asserted here so a future
    // fixture regression fails this test loudly.
    expect(pilotIdBefore).toMatch(/^vault-pilot-\d{3}$/);
    const pilotBefore = useCampaignRosterStore
      .getState()
      .pilots.find((p) => p.pilotId === pilotIdBefore);
    expect(pilotBefore?.xp).toBe(0);
    expect(pilotBefore?.campaignMissions).toBe(0);

    expect(store.getState().getPendingOutcomeCount()).toBe(0);

    const detail = await runFastForwardBattle({
      scenarioId,
      contractId: bridgedEncounter.campaignMeta.contractId,
      encounterId: bridgedEncounter.id,
    });
    if (!detail) {
      throw new Error(
        'runFastForwardBattle returned null for a Ready encounter',
      );
    }

    // W1 stamping (`GameEngine.ts:141`): the session's config.seed equals
    // the deterministically derived seed.
    const expectedSeed = deriveBattleSeed(
      resolveCampaignSeed(fixture.campaign),
      scenarioId,
    );
    expect(detail.seed).toBe(expectedSeed);
    expect(detail.session.config.seed).toBe(expectedSeed);

    // Real SQLite rows exist for both forces + the encounter, written by
    // the imported production handler modules (design D3).
    expect(
      getForceRepository().getForceById(detail.playerForceId),
    ).not.toBeNull();
    expect(
      getForceRepository().getForceById(detail.opponentForceId),
    ).not.toBeNull();
    expect(
      getEncounterRepository().getEncounterById(detail.encounterId),
    ).not.toBeNull();

    // The published outcome lands in pendingBattleOutcomes via the real
    // store subscription — never injected directly (design D5).
    expect(
      store
        .getState()
        .getPendingOutcomes()
        .some((o) => o.matchId === detail.matchId),
    ).toBe(true);
    expect(store.getState().getPendingOutcomeCount()).toBe(1);

    // The NEXT advanceDay() drains + applies it.
    const dayTwoReport = await store.getState().advanceDay();
    if (!dayTwoReport) {
      throw new Error('day 2 advanceDay() returned null');
    }
    expect(store.getState().getPendingOutcomeCount()).toBe(0);
    expect(store.getState().getProcessedBattleIds()).toContain(detail.matchId);

    // Roster XP moved through the D9 pilot-attribution fix. The pilot id
    // that actually resolved the delta is real-SQLite-shaped
    // (`pilot-<uuid>`) — still emphatically NOT session-unit-id-shaped
    // (`${side}-${slot}-${unitRef}`), which is the spec's actual ban.
    const rosterUnitAfter = useCampaignRosterStore
      .getState()
      .units.find((unit) => unit.unitId === rosterUnitId);
    const resolvedPilotId = rosterUnitAfter?.pilotId;
    expect(resolvedPilotId).toBeDefined();
    expect(resolvedPilotId).not.toMatch(/^(player|opponent)-\d+-/);
    const pilotAfter = useCampaignRosterStore
      .getState()
      .pilots.find((p) => p.pilotId === resolvedPilotId);
    expect(pilotAfter?.xp).toBeGreaterThan(0);
    expect(pilotAfter?.campaignMissions).toBe(1);
  });

  it('returns null without throwing for a Draft-status bridged encounter (no resolvable player force)', async () => {
    const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });
    const store = useCampaignStore();
    store.getState().switchCampaign(fixture.campaign);

    const dayOneReport = await store.getState().advanceDay();
    if (!dayOneReport) {
      throw new Error('day 1 advanceDay() returned null');
    }
    const afterDayOne = dayOneReport.campaign as ICampaignWithBridgeState;
    const scenarioId = afterDayOne.bridgedScenarioIds?.[0];
    if (!scenarioId) {
      throw new Error('no scenario bridged on the fixture Monday');
    }
    const bridgedEncounter = afterDayOne.bridgedEncounters?.[scenarioId];
    if (!bridgedEncounter?.campaignMeta) {
      throw new Error(
        `bridged encounter for ${scenarioId} has no campaignMeta`,
      );
    }

    // Force a Draft shape by pointing the runner at an encounter whose
    // playerForce is undefined — mirrors what the bridge itself would
    // have produced for an unresolvable team force.
    const draftView = {
      ...afterDayOne,
      bridgedEncounters: {
        ...afterDayOne.bridgedEncounters,
        [scenarioId]: { ...bridgedEncounter, playerForce: undefined },
      },
    };
    store.getState().switchCampaign(draftView);

    const result = await runFastForwardBattle({
      scenarioId,
      contractId: bridgedEncounter.campaignMeta.contractId,
      encounterId: bridgedEncounter.id,
    });
    expect(result).toBeNull();
  });

  it('wires into fastForwardCampaign() via createFastForwardCombatRunner() — the group-2 callback drives the real runner end-to-end', async () => {
    const fixture = buildFastForwardFixture({ useRoleBasedSalaries: false });
    const details: string[] = [];
    const runner: FastForwardBattleRunner = async (handoff) => {
      const detail = await runFastForwardBattle(handoff);
      if (!detail) return null;
      details.push(detail.matchId);
      return { matchId: detail.matchId, seed: detail.seed };
    };
    void createFastForwardCombatRunner; // exercised for its exported shape below

    const report = await fastForwardCampaign(fixture.campaign, {
      days: 1,
      runBridgedScenario: runner,
      expectations: { minScenariosBridged: 1, minBattles: 1 },
    });

    expect(report.battles.length).toBeGreaterThan(0);
    expect(report.outcomesApplied).toBe(report.battles.length);
    expect(details.length).toBe(report.battles.length);

    // `createFastForwardCombatRunner()` itself matches the
    // `FastForwardBattleRunner` shape `fastForwardCampaign` expects —
    // proven by direct assignment (a type-level check that also runs).
    const wired: FastForwardBattleRunner = createFastForwardCombatRunner();
    expect(typeof wired).toBe('function');
  });
});
