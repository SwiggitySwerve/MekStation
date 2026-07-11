/**
 * XP progression invariant tests (spec "XP Progression Invariants
 * Through Engine-Driven Combat").
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-fast-forward-api/spec.md
 */
import { describe, expect, it } from '@jest/globals';

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay';

import {
  assertAwardsMatchParticipation,
  assertXpApplicationUnchangedByDuplicate,
  assertXpNonDecreasing,
} from '../xp';

function makeEntry(
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

function makeDelta(
  unitId: string,
  overrides: Partial<IUnitCombatDelta> = {},
): IUnitCombatDelta {
  return {
    unitId,
    side: GameSide.Player,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: { CT: 10 },
    internalsRemaining: { CT: 5 },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 0,
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

function makeOutcome(overrides: Partial<ICombatOutcome> = {}): ICombatOutcome {
  const report: IPostBattleReport = {
    version: 1,
    matchId: overrides.matchId ?? 'match-xp',
    winner: GameSide.Player,
    reason: 'destruction',
    turnCount: 3,
    units: [],
    mvpUnitId: null,
    log: [],
    ...overrides.report,
  };
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: 'match-xp',
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    report,
    unitDeltas: [],
    capturedAt: '3025-06-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('assertXpNonDecreasing', () => {
  it("passes when a pilot's xp/campaignXpEarned only ever increases across days", () => {
    const snapshots = [
      [makeEntry('vault-1', { xp: 0, campaignXpEarned: 0 })],
      [makeEntry('vault-1', { xp: 1, campaignXpEarned: 1 })],
      [makeEntry('vault-1', { xp: 1, campaignXpEarned: 1 })],
      [makeEntry('vault-1', { xp: 3, campaignXpEarned: 3 })],
    ];
    expect(() => assertXpNonDecreasing(snapshots)).not.toThrow();
  });

  it('fails loud on a deliberately-violated fixture where xp regresses between days', () => {
    const snapshots = [
      [makeEntry('vault-1', { xp: 5, campaignXpEarned: 5 })],
      [makeEntry('vault-1', { xp: 2, campaignXpEarned: 5 })], // regression
    ];
    expect(() => assertXpNonDecreasing(snapshots)).toThrow(/xp dropped/);
  });

  it('fails loud on a deliberately-violated fixture where campaignXpEarned regresses', () => {
    const snapshots = [
      [makeEntry('vault-1', { xp: 5, campaignXpEarned: 5 })],
      [makeEntry('vault-1', { xp: 5, campaignXpEarned: 1 })],
    ];
    expect(() => assertXpNonDecreasing(snapshots)).toThrow(
      /campaignXpEarned dropped/,
    );
  });
});

describe('assertXpApplicationUnchangedByDuplicate', () => {
  it('passes when a duplicate (same match id) re-application left counters unchanged', () => {
    const after = [
      makeEntry('vault-1', { xp: 4, campaignXpEarned: 4, campaignMissions: 1 }),
    ];
    expect(() =>
      assertXpApplicationUnchangedByDuplicate(after, after),
    ).not.toThrow();
  });

  it('fails loud on a deliberately-violated fixture where the duplicate awarded XP again', () => {
    const afterFirst = [makeEntry('vault-1', { xp: 4, campaignXpEarned: 4 })];
    const afterDuplicate = [
      makeEntry('vault-1', { xp: 8, campaignXpEarned: 8 }),
    ];
    expect(() =>
      assertXpApplicationUnchangedByDuplicate(afterFirst, afterDuplicate),
    ).toThrow(/counters changed after a duplicate/);
  });
});

describe('assertAwardsMatchParticipation', () => {
  it('passes when campaignMissions increments by exactly one and campaignKills matches kill attribution — resolved via pilotRef, never a unitId===pilotId rig', () => {
    const sessionUnitId = 'player-1-atlas-as7-d';
    const vaultPilotId = 'vault-pilot-9001';
    const outcome = makeOutcome({
      unitDeltas: [makeDelta(sessionUnitId, { pilotRef: vaultPilotId })],
      report: {
        version: 1,
        matchId: 'match-xp',
        winner: GameSide.Player,
        reason: 'destruction',
        turnCount: 3,
        units: [
          {
            unitId: sessionUnitId,
            side: GameSide.Player,
            designation: 'pilot',
            damageDealt: 20,
            damageReceived: 0,
            kills: 2,
            heatProblems: 0,
            physicalAttacks: 0,
            xpPending: true,
          },
        ],
        mvpUnitId: null,
        log: [],
      },
    });
    const before = [
      makeEntry(vaultPilotId, { campaignMissions: 3, campaignKills: 1 }),
    ];
    const after = [
      makeEntry(vaultPilotId, { campaignMissions: 4, campaignKills: 3 }),
    ];

    expect(() =>
      assertAwardsMatchParticipation(outcome, before, after),
    ).not.toThrow();
  });

  it('skips an unresolvable linkage (opponent/NPC) without throwing', () => {
    const outcome = makeOutcome({
      unitDeltas: [
        makeDelta('opponent-1-marauder-mad-3r', {
          side: GameSide.Opponent,
          pilotRef: 'Unknown',
        }),
      ],
    });
    expect(() => assertAwardsMatchParticipation(outcome, [], [])).not.toThrow();
  });

  it('fails loud on a deliberately-violated fixture where campaignMissions did not increment', () => {
    const vaultPilotId = 'vault-pilot-9002';
    const outcome = makeOutcome({
      unitDeltas: [makeDelta('unit-1', { pilotRef: vaultPilotId })],
    });
    const before = [makeEntry(vaultPilotId, { campaignMissions: 2 })];
    const after = [makeEntry(vaultPilotId, { campaignMissions: 2 })]; // should be 3

    expect(() =>
      assertAwardsMatchParticipation(outcome, before, after),
    ).toThrow(/campaignMissions did not increment/);
  });

  it('fails loud on a deliberately-violated fixture where campaignKills does not match kill attribution', () => {
    const sessionUnitId = 'unit-1';
    const vaultPilotId = 'vault-pilot-9003';
    const outcome = makeOutcome({
      unitDeltas: [makeDelta(sessionUnitId, { pilotRef: vaultPilotId })],
      report: {
        version: 1,
        matchId: 'match-xp',
        winner: GameSide.Player,
        reason: 'destruction',
        turnCount: 3,
        units: [
          {
            unitId: sessionUnitId,
            side: GameSide.Player,
            designation: 'pilot',
            damageDealt: 0,
            damageReceived: 0,
            kills: 1,
            heatProblems: 0,
            physicalAttacks: 0,
            xpPending: true,
          },
        ],
        mvpUnitId: null,
        log: [],
      },
    });
    const before = [
      makeEntry(vaultPilotId, { campaignMissions: 0, campaignKills: 0 }),
    ];
    const after = [
      makeEntry(vaultPilotId, { campaignMissions: 1, campaignKills: 0 }),
    ]; // should be 1 kill

    expect(() =>
      assertAwardsMatchParticipation(outcome, before, after),
    ).toThrow(/campaignKills increment/);
  });
});
