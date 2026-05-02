/**
 * Tests for the Daily Battle Audit Builder.
 *
 * Pure-function tests; no day-pipeline integration so we can assert the
 * derived counts and contract-closure detection in isolation.
 *
 * @spec openspec/changes/wire-encounter-to-campaign-round-trip/tasks.md §7
 */
import { describe, it, expect } from '@jest/globals';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPerson } from '@/types/campaign/Person';
import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { rosterEntryToPerson } from '@/lib/campaign/utils/rosterEntryToPerson';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  PilotFinalStatus,
  UnitFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import type { ICampaignWithBattleState } from '../processors/postBattleProcessor';

import {
  appendDailyBattleAuditEntry,
  buildDailyBattleAuditEntry,
} from '../dailyBattleAuditBuilder';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Cluster E PR1 — IPerson fixtures are now synthesized via the
 * `(rosterEntry, vaultPilot) → rosterEntryToPerson()` bridge so the
 * test substrate exercises the same shim production code uses to
 * adapt the new roster-employment substrate to legacy `IPerson`-shaped
 * helpers. Test-specific overrides (xp, totalXpEarned, custom ids)
 * still spread on top so individual cases drive their own scenarios.
 */
function makePerson(
  overrides: Partial<IPerson> & { totalXpEarned?: number } = {},
): IPerson {
  const id = overrides.id ?? 'pilot-1';
  const name = overrides.name ?? 'Test Pilot';
  const xp = overrides.xp ?? 0;
  const totalXpEarned = overrides.totalXpEarned ?? 0;
  const entry: ICampaignRosterEntry = {
    pilotId: id,
    pilotName: name,
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp,
    campaignXpEarned: totalXpEarned,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3024-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
  };
  const vault: IPilot = {
    id,
    name,
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    awards: [],
    createdAt: '3024-01-01T00:00:00Z',
    updatedAt: '3025-01-01T00:00:00Z',
  };
  const base = rosterEntryToPerson(entry, vault);
  return { ...base, ...overrides };
}

function makeCampaign(
  overrides: Partial<ICampaignWithBattleState> = {},
): ICampaignWithBattleState {
  return {
    id: 'camp-1',
    name: 'Test Campaign',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    personnel: new Map(),
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '3024-12-01T00:00:00Z',
    updatedAt: '3025-06-14T00:00:00Z',
    // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
    unitCombatStates: {},
    ...overrides,
  };
}

function makeDelta(
  overrides: Partial<IUnitCombatDelta> = {},
): IUnitCombatDelta {
  return {
    unitId: overrides.unitId ?? 'pilot-1',
    side: GameSide.Player,
    destroyed: false,
    finalStatus: UnitFinalStatus.Damaged,
    armorRemaining: { CT: 20 },
    internalsRemaining: { CT: 10 },
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

function makeOutcome(overrides: Partial<ICombatOutcome> = {}): ICombatOutcome {
  const matchId = overrides.matchId ?? 'match-1';
  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId,
    contractId: null,
    scenarioId: null,
    endReason: CombatEndReason.Destruction,
    report: {
      version: 1,
      matchId,
      winner: GameSide.Player,
      reason: 'destruction',
      turnCount: 5,
      units: [],
      mvpUnitId: null,
      log: [],
    },
    unitDeltas: [],
    capturedAt: '3025-06-15T12:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildDailyBattleAuditEntry', () => {
  it('returns null when no outcomes were applied', () => {
    const before = makeCampaign();
    const after = makeCampaign();
    const entry = buildDailyBattleAuditEntry({
      before,
      after,
      appliedOutcomes: [],
      events: [],
      date: new Date('3025-06-15'),
    });
    expect(entry).toBeNull();
  });

  it('aggregates pilot status (Wounded / KIA / MIA)', () => {
    const before = makeCampaign();
    const after = makeCampaign();
    const outcome = makeOutcome({
      unitDeltas: [
        makeDelta({
          unitId: 'pilot-A',
          pilotState: {
            conscious: true,
            wounds: 1,
            killed: false,
            finalStatus: PilotFinalStatus.Wounded,
          },
        }),
        makeDelta({
          unitId: 'pilot-B',
          pilotState: {
            conscious: false,
            wounds: 6,
            killed: true,
            finalStatus: PilotFinalStatus.KIA,
          },
        }),
        makeDelta({
          unitId: 'pilot-C',
          pilotState: {
            conscious: true,
            wounds: 0,
            killed: false,
            finalStatus: PilotFinalStatus.MIA,
          },
        }),
      ],
    });
    const entry = buildDailyBattleAuditEntry({
      before,
      after,
      appliedOutcomes: [outcome],
      events: [],
      date: new Date('3025-06-15'),
    });
    expect(entry).not.toBeNull();
    expect(entry?.pilotsWounded).toBe(1);
    expect(entry?.pilotsKia).toBe(1);
    expect(entry?.pilotsMia).toBe(1);
  });

  it('sums totalXpEarned delta across before/after', () => {
    const before = makeCampaign({
      personnel: new Map([
        ['pilot-A', makePerson({ id: 'pilot-A', totalXpEarned: 5 })],
        ['pilot-B', makePerson({ id: 'pilot-B', totalXpEarned: 0 })],
      ]),
    });
    const after = makeCampaign({
      personnel: new Map([
        ['pilot-A', makePerson({ id: 'pilot-A', totalXpEarned: 10 })],
        ['pilot-B', makePerson({ id: 'pilot-B', totalXpEarned: 7 })],
      ]),
    });
    const outcome = makeOutcome({
      unitDeltas: [makeDelta({ unitId: 'pilot-A' })],
    });
    const entry = buildDailyBattleAuditEntry({
      before,
      after,
      appliedOutcomes: [outcome],
      events: [],
      date: new Date('3025-06-15'),
    });
    expect(entry?.totalXpAwarded).toBe(12); // 5 + 7
  });

  it('sums salvage value from salvage_allocated events', () => {
    const before = makeCampaign();
    const after = makeCampaign();
    const outcome = makeOutcome({
      unitDeltas: [makeDelta({ unitId: 'pilot-A' })],
    });
    const entry = buildDailyBattleAuditEntry({
      before,
      after,
      appliedOutcomes: [outcome],
      events: [
        {
          type: 'salvage_allocated',
          description: 'salvage 1',
          severity: 'info',
          data: { mercenaryValue: 50000 },
        },
        {
          type: 'salvage_allocated',
          description: 'salvage 2',
          severity: 'info',
          data: { mercenaryValue: 12000 },
        },
        {
          type: 'something_else',
          description: 'noise',
          severity: 'info',
          data: { mercenaryValue: 99 },
        },
      ],
      date: new Date('3025-06-15'),
    });
    expect(entry?.salvageValueSecured).toBe(62000);
  });

  it('sums repair tickets from repair-tickets-created events', () => {
    const before = makeCampaign();
    const after = makeCampaign();
    const outcome = makeOutcome({
      unitDeltas: [makeDelta({ unitId: 'pilot-A' })],
    });
    const entry = buildDailyBattleAuditEntry({
      before,
      after,
      appliedOutcomes: [outcome],
      events: [
        {
          type: 'repair-tickets-created',
          description: 'r1',
          severity: 'info',
          data: { ticketCount: 3 },
        },
        {
          type: 'repair-tickets-created',
          description: 'r2',
          severity: 'info',
          data: { ticketCount: 2 },
        },
      ],
      date: new Date('3025-06-15'),
    });
    expect(entry?.repairTicketsCreated).toBe(5);
  });

  it('detects contract closures via mission status diff', () => {
    const contractActive = createContract({
      id: 'contract-1',
      name: 'Hesperus Raid',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.ACTIVE,
    });
    const contractSuccess = createContract({
      id: 'contract-1',
      name: 'Hesperus Raid',
      employerId: 'davion',
      targetId: 'liao',
      status: MissionStatus.SUCCESS,
    });
    const before = makeCampaign({
      missions: new Map([['contract-1', contractActive]]),
    });
    const after = makeCampaign({
      missions: new Map([['contract-1', contractSuccess]]),
    });
    const outcome = makeOutcome({
      contractId: 'contract-1',
      unitDeltas: [makeDelta({ unitId: 'pilot-A' })],
    });
    const entry = buildDailyBattleAuditEntry({
      before,
      after,
      appliedOutcomes: [outcome],
      events: [],
      date: new Date('3025-06-15'),
    });
    expect(entry?.contractsClosed).toEqual(['contract-1']);
  });

  it('builds match summary including end reason', () => {
    const before = makeCampaign();
    const after = makeCampaign();
    const outcome = makeOutcome({
      matchId: 'm-42',
      contractId: 'c-1',
      endReason: CombatEndReason.ObjectiveMet,
      unitDeltas: [makeDelta({ unitId: 'pilot-A' })],
    });
    const entry = buildDailyBattleAuditEntry({
      before,
      after,
      appliedOutcomes: [outcome],
      events: [
        {
          type: 'post_battle_applied',
          description: 'applied',
          severity: 'info',
          data: { matchId: 'm-42', pilotsUpdated: ['pilot-A'] },
        },
      ],
      date: new Date('3025-06-15'),
    });
    expect(entry?.matches).toHaveLength(1);
    expect(entry?.matches[0].matchId).toBe('m-42');
    expect(entry?.matches[0].contractId).toBe('c-1');
    expect(entry?.matches[0].summary).toContain('Victory');
    expect(entry?.matches[0].summary).toContain('objective met');
    expect(entry?.matches[0].summary).toContain('1 pilot');
  });

  it('uses YYYY-MM-DD date format', () => {
    const before = makeCampaign();
    const after = makeCampaign();
    const outcome = makeOutcome({
      unitDeltas: [makeDelta({ unitId: 'pilot-A' })],
    });
    const entry = buildDailyBattleAuditEntry({
      before,
      after,
      appliedOutcomes: [outcome],
      events: [],
      date: new Date('3025-06-15T12:34:56Z'),
    });
    expect(entry?.date).toBe('3025-06-15');
  });
});

describe('appendDailyBattleAuditEntry', () => {
  it('returns campaign unchanged when entry is null', () => {
    const campaign = makeCampaign() as ICampaign;
    const updated = appendDailyBattleAuditEntry(campaign, null);
    expect(updated).toBe(campaign);
  });

  it('appends entry to empty ledger', () => {
    const campaign = makeCampaign() as ICampaign;
    const entry = {
      date: '3025-06-15',
      matchesProcessed: 1,
      matches: [],
      totalXpAwarded: 0,
      pilotsWounded: 0,
      pilotsKia: 0,
      pilotsMia: 0,
      salvageValueSecured: 0,
      repairTicketsCreated: 0,
      contractsClosed: [],
    };
    const updated = appendDailyBattleAuditEntry(
      campaign,
      entry,
    ) as ICampaign & {
      dailyBattleAudit?: readonly (typeof entry)[];
    };
    expect(updated.dailyBattleAudit).toEqual([entry]);
  });

  it('appends entry to existing ledger without losing prior entries', () => {
    const e1 = {
      date: '3025-06-14',
      matchesProcessed: 1,
      matches: [],
      totalXpAwarded: 0,
      pilotsWounded: 0,
      pilotsKia: 0,
      pilotsMia: 0,
      salvageValueSecured: 0,
      repairTicketsCreated: 0,
      contractsClosed: [],
    };
    const e2 = { ...e1, date: '3025-06-15' };
    const baseCampaign = makeCampaign() as ICampaign;
    const withE1 = appendDailyBattleAuditEntry(baseCampaign, e1);
    const updated = appendDailyBattleAuditEntry(withE1, e2) as ICampaign & {
      dailyBattleAudit?: readonly (typeof e1)[];
    };
    expect(updated.dailyBattleAudit).toEqual([e1, e2]);
  });
});
