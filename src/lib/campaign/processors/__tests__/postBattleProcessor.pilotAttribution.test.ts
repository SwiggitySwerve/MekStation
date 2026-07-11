/**
 * Design D9 (`add-campaign-fast-forward-api`, `campaign-combat-loop` ADDED
 * requirement "Engine-Derived Outcome Pilot Attribution"): proves
 * `applyOutcomeDeltas` resolves roster/vault pilots by `delta.pilotRef`
 * when present, falls back to `delta.unitId` when absent (byte-for-byte
 * legacy compat), skips without failing when the linkage is unresolvable,
 * and leaves kill attribution keyed on the session `unitId`.
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-combat-loop/spec.md
 */
import { afterEach, describe, expect, it } from '@jest/globals';

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import {
  applyPostBattle,
  type ICampaignWithBattleState,
} from '../postBattleProcessor';

// =============================================================================
// Fixtures (self-contained per repo convention — see
// `postBattleProcessor.test-helpers.ts` for the sibling suite's copy)
// =============================================================================

function createTestCampaign(
  overrides: Partial<ICampaignWithBattleState> = {},
): ICampaignWithBattleState {
  return {
    id: 'camp-pilot-attribution',
    name: 'Pilot Attribution Test Campaign',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '3024-12-01T00:00:00Z',
    updatedAt: '3025-06-14T00:00:00Z',
    unitCombatStates: {},
    ...overrides,
  };
}

function createTestReport(
  matchId: string,
  overrides: Partial<IPostBattleReport> = {},
): IPostBattleReport {
  return {
    version: 1,
    matchId,
    winner: GameSide.Player,
    reason: 'destruction',
    turnCount: 5,
    units: [],
    mvpUnitId: null,
    log: [],
    ...overrides,
  };
}

/** Engine-shaped delta: `unitId` is a session-scoped composite, never a pilot id. */
function createDelta(
  unitId: string,
  overrides: Partial<IUnitCombatDelta> = {},
): IUnitCombatDelta {
  return {
    unitId,
    side: GameSide.Player,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: { CT: 20, LT: 15, RT: 15 },
    internalsRemaining: { CT: 10, LT: 8, RT: 8 },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 4,
    ammoRemaining: {},
    pilotState: {
      conscious: true,
      wounds: 0,
      killed: false,
      finalStatus: PilotFinalStatus.Active,
    },
    ...overrides,
  };
}

function createOutcome(
  overrides: Partial<ICombatOutcome> = {},
): ICombatOutcome {
  const matchId = overrides.matchId ?? 'match-pilot-attribution';
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    report: createTestReport(matchId),
    unitDeltas: [],
    capturedAt: '3025-06-15T12:00:00Z',
    ...overrides,
  };
}

function makeRosterEntry(
  pilotId: string,
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId,
    pilotName: `Pilot ${pilotId}`,
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    hireDate: new Date('3025-01-01'),
    ...overrides,
  };
}

function seedRosterEntry(pilotId: string): void {
  useCampaignRosterStore.setState({
    campaignId: 'camp-pilot-attribution',
    units: [],
    pilots: [makeRosterEntry(pilotId)],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  usePilotStore.setState({
    pilots: [
      {
        id: pilotId,
        name: `Pilot ${pilotId}`,
        type: PilotType.Persistent,
        status: PilotStatus.Active,
        skills: { gunnery: 4, piloting: 5 },
        wounds: 0,
        abilities: [],
        createdAt: '3025-01-01T00:00:00Z',
        updatedAt: '3025-01-01T00:00:00Z',
      },
    ],
  });
}

function clearStores(): void {
  useCampaignRosterStore.setState({
    campaignId: null,
    units: [],
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  usePilotStore.setState({ pilots: [] });
}

describe('postBattleProcessor — Engine-Derived Outcome Pilot Attribution (D9)', () => {
  afterEach(() => clearStores());

  it('resolves the roster entry via pilotRef when the session unitId differs from every roster pilot id (linkage present, engine-shaped)', () => {
    // Session-scoped composite id, per `buildSessionUnitId` —
    // deliberately NOT equal to the vault pilot id, proving the fix
    // does not depend on the dual-id rig this capability bans.
    const sessionUnitId = 'player-1-atlas-as7-d';
    const vaultPilotId = 'vault-pilot-001';
    seedRosterEntry(vaultPilotId);
    const campaign = createTestCampaign();

    const outcome = createOutcome({
      unitDeltas: [createDelta(sessionUnitId, { pilotRef: vaultPilotId })],
    });

    const { summary } = applyPostBattle(outcome, campaign);

    // Nonzero pilotsUpdated via the linkage — the D9 acceptance bar.
    expect(summary.pilotsUpdated).toEqual([vaultPilotId]);
    expect(summary.unitsUpdated).toContain(sessionUnitId);

    const updated = useCampaignRosterStore
      .getState()
      .pilots.find((p) => p.pilotId === vaultPilotId);
    expect(updated?.xp).toBeGreaterThan(0);
    expect(updated?.campaignMissions).toBe(1);
  });

  it('falls back to unitId when pilotRef is absent — byte-for-byte legacy resolution (linkage absent)', () => {
    // No `pilotRef` on the delta at all — the exact shape every
    // pre-existing hand-built-fixture suite uses (`campaignCombatLoop`,
    // `phase4CampaignRoundTrip`, `postBattleProcessor.retryIdempotency`).
    seedRosterEntry('unit-A');
    const campaign = createTestCampaign();

    const outcome = createOutcome({
      unitDeltas: [createDelta('unit-A')],
    });

    const { summary } = applyPostBattle(outcome, campaign);

    expect(summary.pilotsUpdated).toEqual(['unit-A']);
    const updated = useCampaignRosterStore
      .getState()
      .pilots.find((p) => p.pilotId === 'unit-A');
    expect(updated?.xp).toBeGreaterThan(0);
  });

  it('skips pilot updates without failing when pilotRef resolves to no roster entry (linkage unresolvable — opponent/NPC)', () => {
    // Opponent-side units carry no assigned pilot: `buildGameUnits`
    // stamps `pilotRef: 'Unknown'` for unassigned assignments. Neither
    // that literal nor the session unitId resolves to a roster entry.
    const campaign = createTestCampaign();
    const outcome = createOutcome({
      unitDeltas: [
        createDelta('opponent-1-marauder-mad-3r', {
          side: GameSide.Opponent,
          pilotRef: 'Unknown',
        }),
      ],
    });

    expect(() => applyPostBattle(outcome, campaign)).not.toThrow();
    const { summary } = applyPostBattle(
      outcome,
      createTestCampaign({ id: 'camp-pilot-attribution-2' }),
    );
    expect(summary.pilotsUpdated).toHaveLength(0);
    // Unit-state application is independent of pilot resolution.
    expect(summary.unitsUpdated).toContain('opponent-1-marauder-mad-3r');
    expect(summary.errors).toHaveLength(0);
  });

  it('keeps kill attribution keyed on the session unitId, not the resolved pilotRef', () => {
    const sessionUnitId = 'player-1-hunchback-hbk-4g';
    const vaultPilotId = 'vault-pilot-002';
    seedRosterEntry(vaultPilotId);
    const campaign = createTestCampaign({
      options: {
        ...createDefaultCampaignOptions(),
        scenarioXP: 1,
        killsForXP: 1,
        killXPAward: 2,
      },
    });

    const outcome = createOutcome({
      report: createTestReport('match-pilot-attribution', {
        winner: GameSide.Player,
        units: [
          {
            // The after-action report row is keyed by the SESSION unit
            // id (design D9: "Kill attribution lookup stays keyed by
            // session unit id against the after-action report's
            // per-unit rows") — NOT by the resolved pilotRef.
            unitId: sessionUnitId,
            side: GameSide.Player,
            designation: `Pilot ${vaultPilotId}`,
            damageDealt: 0,
            damageReceived: 0,
            kills: 1,
            heatProblems: 0,
            physicalAttacks: 0,
            xpPending: true,
          },
        ],
      }),
      unitDeltas: [
        createDelta(sessionUnitId, {
          side: GameSide.Player,
          pilotRef: vaultPilotId,
        }),
      ],
    });

    const { summary } = applyPostBattle(outcome, campaign);
    expect(summary.pilotsUpdated).toEqual([vaultPilotId]);
    const updated = useCampaignRosterStore
      .getState()
      .pilots.find((p) => p.pilotId === vaultPilotId);
    // 1 scenario XP + 2 kill XP (1 kill * threshold 1 * award 2) = 3.
    expect(updated?.xp).toBe(3);
    expect(updated?.campaignKills).toBe(1);
  });

  it('resolves a null pilotRef the same as an absent one (falls back to unitId)', () => {
    seedRosterEntry('unit-B');
    const campaign = createTestCampaign();

    const outcome = createOutcome({
      unitDeltas: [createDelta('unit-B', { pilotRef: null })],
    });

    const { summary } = applyPostBattle(outcome, campaign);
    expect(summary.pilotsUpdated).toEqual(['unit-B']);
  });
});
