/**
 * T1 — battle damage must land on the ROSTER unit, not a session-shaped id.
 *
 * A fought campaign battle builds session units with the id
 * `player-<slot+1>-<unitRef>` (`preBattleSessionBuilder.ts`), and
 * `deriveCombatOutcome` copies that id into `delta.unitId`.
 * `postBattleProcessor` then writes `campaign.unitCombatStates[delta.unitId]`,
 * while every reader (`selectUnitReadiness`, `repairQueueBuilderProcessor`,
 * the roster damage bar) looks the unit up by its ROSTER `unitId`
 * (`ff-roster-unit-N`). The damage lands under a key nobody reads.
 *
 * This test drives the real chain end to end — fixture, `fastForwardCampaign`,
 * the real API handlers, `materializeCampaignMissionEncounter`,
 * `buildPreparedBattleData`, the real `GameEngine`, `deriveCombatOutcome`,
 * `publishCombatOutcome`, the campaign store, the day pipeline,
 * `postBattleProcessor` and `repairQueueBuilderProcessor` — with no
 * hand-built `ICombatOutcome`. Only the catalog-lookup boundary
 * (`adaptUnit`) is mocked, exactly as in `fastForwardCampaign.test.ts`.
 *
 * `combatTeamCount: 1` for the same reason the capstone documents: one team,
 * one roster unit, one fight, so the damaged unit maps to exactly one roster id.
 *
 * `unitMaxStates` is seeded BEFORE the battle through the production writer
 * `prepareCampaignUnitMaxStates` (which calls `resolveMissingUnitMaxStates` →
 * `adaptUnit`). `adaptUnit` is the mocked catalog boundary, so it resolves
 * in-process with the same sheets the battle uses; this keeps the repair-queue
 * assertion about the id mismatch, not about missing maxima.
 *
 * Expected to FAIL on main until the session-unit-id → roster-unit-id remap
 * exists.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import type { FastForwardBattleRunner } from '@/lib/campaign/fastForward/fastForwardCampaign';
import type { ICampaignWithBattleState } from '@/lib/campaign/processors/postBattleProcessor';
import type { ICampaignWithBridgeState } from '@/lib/campaign/processors/scenarioEncounterBridgeProcessor';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import type { IGameSession } from '@/types/gameplay';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { fastForwardCampaign } from '@/lib/campaign/fastForward/fastForwardCampaign';
import { runFastForwardBattle } from '@/lib/campaign/fastForward/fastForwardCombatRunner';
import { buildFastForwardFixture } from '@/lib/campaign/fastForward/fastForwardFixture';
import { initializeInProcessApiDatabase } from '@/lib/campaign/fastForward/inProcessApiRouter';
import { selectUnitReadiness } from '@/lib/campaign/readiness/selectUnitReadiness';
import { deriveCombatOutcome } from '@/lib/combat/outcome/combatOutcome';
import { prepareCampaignUnitMaxStates } from '@/stores/campaign/campaignUnitMaxStates';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { GameSide } from '@/types/gameplay';

import { makeAdaptedUnit, resetWorld } from './fastForwardTestSupport';

jest.mock('@/engine/adapters/CompendiumAdapter', () => ({
  adaptUnit: jest.fn(),
}));

const adaptUnitMock = adaptUnit as jest.MockedFunction<typeof adaptUnit>;

const SESSION_SHAPED_ID = /^(player|opponent)-\d+-/;

const sum = (values: Readonly<Record<string, number>> | undefined): number =>
  Object.values(values ?? {}).reduce((total, value) => total + value, 0);

interface IDamagedPlayerUnit {
  readonly rosterId: string;
  readonly delta: IUnitCombatDelta;
}

interface IRun {
  readonly finalCampaign: ICampaignWithBattleState;
  readonly damaged: IDamagedPlayerUnit;
  readonly rosterUnit: IRosterUnitProjection;
  readonly pilots: ReturnType<typeof useCampaignRosterStore.getState>['pilots'];
}

let run: IRun;

describe('campaign battle damage is recorded against the roster unit id (T1)', () => {
  beforeAll(async () => {
    resetWorld();
    initializeInProcessApiDatabase();
    adaptUnitMock.mockImplementation(async (unitRef, options) =>
      makeAdaptedUnit(unitRef, options?.side ?? GameSide.Player),
    );

    const fixture = buildFastForwardFixture({
      useRoleBasedSalaries: false,
      combatTeamCount: 1,
    });
    const rosterUnitsBefore = useCampaignRosterStore.getState().units;

    // Production writer for the construction maxima, keyed by ROSTER unitId.
    const unitMaxStates = await prepareCampaignUnitMaxStates(
      rosterUnitsBefore,
      undefined,
    );
    if (
      !unitMaxStates ||
      rosterUnitsBefore.some((unit) => !unitMaxStates[unit.unitId])
    ) {
      throw new Error(
        'setup: prepareCampaignUnitMaxStates did not resolve maxima for every roster unit',
      );
    }
    const campaign: ICampaign = { ...fixture.campaign, unitMaxStates };

    // Real runner; the only addition is a read-only capture of the session
    // and the (pure) re-derived outcome, as `createCapturingRunner` does.
    const fought: { session: IGameSession; outcome: ICombatOutcome }[] = [];
    const runner: FastForwardBattleRunner = async (handoff) => {
      const detail = await runFastForwardBattle(handoff);
      if (!detail) return null;
      fought.push({
        session: detail.session,
        outcome: deriveCombatOutcome(detail.session, {
          contractId: handoff.contractId,
          scenarioId: handoff.scenarioId,
        }),
      });
      return { matchId: detail.matchId, seed: detail.seed };
    };

    const report = await fastForwardCampaign(campaign, {
      days: 2,
      runBridgedScenario: runner,
      expectations: { minScenariosBridged: 1, minBattles: 1 },
    });
    expect(report.outcomesApplied).toBe(report.battles.length);

    const finalCampaign = useCampaignStore()
      .getState()
      .getCampaign() as ICampaignWithBattleState | null;
    if (!finalCampaign) {
      throw new Error('no campaign in the store after the run');
    }

    // Roster units that fought, in the slot order the materializer used:
    // the team force's unitIds intersected with the roster store, in store order.
    const firstFought = fought[0];
    if (!firstFought) throw new Error('no battle was fought');
    const scenarioId = firstFought.outcome.scenarioId;
    const dayOne = report.dayReports[0]?.campaign as ICampaignWithBridgeState;
    const teamForceId = scenarioId
      ? dayOne.bridgedEncounters?.[scenarioId]?.playerForce?.forceId
      : undefined;
    const teamForce = teamForceId ? dayOne.forces.get(teamForceId) : undefined;
    if (!teamForce) throw new Error('could not resolve the fought team force');
    const members = new Set(teamForce.unitIds);
    const teamRoster = useCampaignRosterStore
      .getState()
      .units.filter((unit) => members.has(unit.unitId));

    // Pick a player unit that actually lost armor or structure. Never vacuous.
    const damagedUnits: IDamagedPlayerUnit[] = [];
    for (const { session, outcome } of fought) {
      for (const delta of outcome.unitDeltas) {
        if (delta.side !== GameSide.Player) continue;
        const sessionUnit = session.units.find((u) => u.id === delta.unitId);
        if (!sessionUnit) continue;
        const lost =
          sum(sessionUnit.armorByLocation as Record<string, number>) -
          sum(delta.armorRemaining) +
          (sum(sessionUnit.structureByLocation as Record<string, number>) -
            sum(delta.internalsRemaining));
        if (lost <= 0) continue;
        const slot = teamRoster.findIndex(
          (unit, index) =>
            delta.unitId === `player-${index + 1}-${unit.unitRef}`,
        );
        const rosterUnit = teamRoster[slot];
        if (!rosterUnit) {
          throw new Error(
            `could not map session unit ${delta.unitId} to a roster unit (team roster: ${teamRoster.map((u) => `${u.unitId}/${u.unitRef}`).join(', ')})`,
          );
        }
        damagedUnits.push({ rosterId: rosterUnit.unitId, delta });
      }
    }
    const damaged = damagedUnits[0];
    if (!damaged) {
      throw new Error(
        'no player unit lost armor or structure in the fought battle — the test would be vacuous',
      );
    }

    const rosterUnit = useCampaignRosterStore
      .getState()
      .units.find((unit) => unit.unitId === damaged.rosterId);
    if (!rosterUnit) throw new Error(`roster unit ${damaged.rosterId} missing`);

    // Setup guard: the maxima must survive the run, keyed by roster id, so a
    // missing repair ticket below is the id mismatch and not absent maxima.
    if (!finalCampaign.unitMaxStates?.[damaged.rosterId]) {
      throw new Error(
        `setup: unitMaxStates lost its entry for ${damaged.rosterId} (keys: ${Object.keys(finalCampaign.unitMaxStates ?? {}).join(', ')})`,
      );
    }

    run = {
      finalCampaign,
      damaged,
      rosterUnit,
      pilots: useCampaignRosterStore.getState().pilots,
    };
  });

  afterAll(() => {
    resetWorld();
    adaptUnitMock.mockReset();
  });

  it('A1: unitCombatStates is keyed by the roster id and carries the delta values', () => {
    const { finalCampaign, damaged } = run;
    const state = finalCampaign.unitCombatStates?.[damaged.rosterId];
    expect(state).toBeDefined();
    expect(state?.currentArmorPerLocation).toEqual(
      damaged.delta.armorRemaining,
    );
    expect(state?.currentStructurePerLocation).toEqual(
      damaged.delta.internalsRemaining,
    );
  });

  it('A2: selectUnitReadiness reports the damaged roster unit as not Ready', () => {
    const { finalCampaign, rosterUnit, pilots } = run;
    const readiness = selectUnitReadiness({
      unit: rosterUnit,
      campaign: finalCampaign,
      pilots,
    });
    expect(readiness.readiness).not.toBe('Ready');
  });

  it('A3: the repair queue holds a ticket for the roster unit id', () => {
    const { finalCampaign, damaged } = run;
    const tickets = (finalCampaign.repairQueue ?? []).filter(
      (ticket) => ticket.unitId === damaged.rosterId,
    );
    expect(tickets.length).toBeGreaterThanOrEqual(1);
  });

  it('A4: no unitCombatStates key is a session-shaped id', () => {
    const keys = Object.keys(run.finalCampaign.unitCombatStates ?? {});
    expect(keys.filter((key) => SESSION_SHAPED_ID.test(key))).toEqual([]);
  });
});
