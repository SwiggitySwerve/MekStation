/**
 * autoAwardsProcessor — vault-persistence regression suite.
 *
 * The previous test file was deleted in PR4 of `wire-iperson-hard-cutover`
 * because it was tied to the old `personnel: Map<string, IPerson>` shape.
 * This rewrite targets the post-PR5 architecture (roster store +
 * vault `IPilot.awards`) and locks in the bug fix made in
 * `chore/wire-auto-awards-persistence`: grants must reach the vault.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  AutoAwardCategory,
  createDefaultAutoAwardConfig,
} from '@/types/campaign/awards/autoAwardTypes';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import { DayPhase } from '../../dayPipeline';
import {
  autoAwardsProcessor,
  processPostMissionAwards,
  processPostScenarioAwards,
} from '../autoAwardsProcessor';

// ----------------------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------------------

const PILOT_ID = 'pilot-001';
const FIRST_OF_MONTH = new Date('3025-06-01T00:00:00Z');

function makeEntry(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: PILOT_ID,
    pilotName: 'Test Pilot',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3020-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

function makeVaultPilot(overrides: Partial<IPilot> = {}): IPilot {
  return {
    id: PILOT_ID,
    name: 'Test Pilot',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    awards: [],
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
  };
}

function createTestCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
  return {
    id: 'campaign-test',
    name: 'Test Campaign',
    currentDate: FIRST_OF_MONTH,
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    options: {
      ...createDefaultCampaignOptions(),
      autoAwardConfig: createDefaultAutoAwardConfig(),
    },
    campaignType: CampaignType.MERCENARY,
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
    // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
    unitCombatStates: overrides.unitCombatStates ?? {},
  };
}

function seedStores(
  entryOverrides: Partial<ICampaignRosterEntry> = {},
  pilotOverrides: Partial<IPilot> = {},
): void {
  useCampaignRosterStore.setState({
    campaignId: 'campaign-test',
    pilots: [makeEntry(entryOverrides)],
    units: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  usePilotStore.setState({ pilots: [makeVaultPilot(pilotOverrides)] });
}

function clearStores(): void {
  useCampaignRosterStore.setState({
    campaignId: null,
    pilots: [],
    units: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  usePilotStore.setState({ pilots: [] });
}

// ----------------------------------------------------------------------------
// fetch mock — `applyAwardGrants` fires `updatePilot()` for SQLite
// persistence, which calls `fetch('/api/pilots/:id', ...)` and then
// `loadPilots()` (also a fetch). We resolve every PUT with success and
// every GET with the current in-memory pilot list so the post-PUT
// `loadPilots()` does not clobber the synchronous in-memory awards write.
// ----------------------------------------------------------------------------

const mockFetch = jest.fn();
// Inject as both `global.fetch` (Node test env) and `globalThis.fetch`.
(global as unknown as { fetch: typeof fetch }).fetch =
  mockFetch as unknown as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation(((url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    if (method === 'PUT') {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ success: true }),
      });
    }
    // GET /api/pilots — return whatever is currently in the vault.
    void url;
    const pilots = usePilotStore.getState().pilots;
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ pilots, count: pilots.length }),
    });
  }) as never);
});

afterEach(() => {
  clearStores();
});

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe('autoAwardsProcessor — metadata', () => {
  it('registers under PERSONNEL phase with stable id', () => {
    expect(autoAwardsProcessor.id).toBe('auto-awards');
    expect(autoAwardsProcessor.phase).toBe(DayPhase.PERSONNEL);
    expect(autoAwardsProcessor.displayName).toBe('Auto Awards');
  });
});

describe('autoAwardsProcessor — gating', () => {
  it('returns no events on a non-first-of-month tick', () => {
    seedStores({ campaignKills: 100 });
    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15T00:00:00Z'),
    });

    const result = autoAwardsProcessor.process(
      campaign,
      new Date('3025-06-15T00:00:00Z'),
    );

    expect(result.events).toEqual([]);
    expect(result.campaign).toBe(campaign);
    expect(usePilotStore.getState().pilots[0].awards ?? []).toEqual([]);
  });

  it('returns no events when autoAwardConfig is undefined', () => {
    seedStores({ campaignKills: 100 });
    const campaign = createTestCampaign({
      options: {
        ...createDefaultCampaignOptions(),
        autoAwardConfig: undefined,
      },
    });

    const result = autoAwardsProcessor.process(campaign, FIRST_OF_MONTH);

    expect(result.events).toEqual([]);
    expect(usePilotStore.getState().pilots[0].awards ?? []).toEqual([]);
  });
});

describe('autoAwardsProcessor — vault persistence', () => {
  it('writes granted awards to usePilotStore.pilots[].awards', () => {
    seedStores({ campaignKills: 10 });
    const campaign = createTestCampaign();

    const result = autoAwardsProcessor.process(campaign, FIRST_OF_MONTH);

    expect(result.events.length).toBeGreaterThan(0);
    const persisted = usePilotStore.getState().pilots[0].awards ?? [];
    expect(persisted.length).toBeGreaterThan(0);

    const awardIds = persisted.map((a) => a.awardId);
    // first-blood (threshold 1) is the lowest tier and must qualify at 10 kills.
    expect(awardIds).toContain('first-blood');
  });

  it('emits IDayEvent with type=award_granted whose data.awardId matches the persisted IPilotAward', () => {
    seedStores({ campaignKills: 10 });
    const campaign = createTestCampaign();

    const result = autoAwardsProcessor.process(campaign, FIRST_OF_MONTH);

    const eventAwardIds = new Set(
      result.events
        .filter((e) => e.type === 'award_granted')
        .map((e) => (e.data as { awardId: string }).awardId),
    );
    const persistedAwardIds = new Set(
      (usePilotStore.getState().pilots[0].awards ?? []).map((a) => a.awardId),
    );

    expect(eventAwardIds.size).toBeGreaterThan(0);
    expect(persistedAwardIds).toEqual(eventAwardIds);
  });

  it('persists IPilotAward with shape derived from IAwardGrantEvent (awardId, earnedAt, context.campaignId, timesEarned)', () => {
    seedStores({ campaignKills: 1 });
    const campaign = createTestCampaign({ id: 'campaign-shape-check' });

    autoAwardsProcessor.process(campaign, FIRST_OF_MONTH);

    const awards = usePilotStore.getState().pilots[0].awards ?? [];
    expect(awards.length).toBeGreaterThan(0);

    for (const award of awards) {
      expect(typeof award.awardId).toBe('string');
      expect(award.awardId).not.toBe('');
      // earnedAt is stamped from checkerContext.currentDate (campaign.currentDate).
      expect(award.earnedAt).toBe(FIRST_OF_MONTH.toISOString());
      expect(award.context.campaignId).toBe('campaign-shape-check');
      expect(award.timesEarned).toBe(1);
    }
  });

  it('is idempotent — a second tick on the same date grants nothing new', () => {
    seedStores({ campaignKills: 10 });
    const campaign = createTestCampaign();

    const first = autoAwardsProcessor.process(campaign, FIRST_OF_MONTH);
    expect(first.events.length).toBeGreaterThan(0);
    const firstSnapshot = [
      ...(usePilotStore.getState().pilots[0].awards ?? []),
    ];

    const second = autoAwardsProcessor.process(campaign, FIRST_OF_MONTH);
    expect(second.events).toEqual([]);

    const secondSnapshot = usePilotStore.getState().pilots[0].awards ?? [];
    expect(secondSnapshot).toHaveLength(firstSnapshot.length);
    expect(secondSnapshot.map((a) => a.awardId).sort()).toEqual(
      firstSnapshot.map((a) => a.awardId).sort(),
    );
  });

  it('skips silently when the engine returns no events (no setState, no fetch)', () => {
    // Brand-new pilot: 0 kills, 0 missions, hired today → nothing qualifies.
    seedStores({
      campaignKills: 0,
      campaignMissions: 0,
      hireDate: FIRST_OF_MONTH,
    });
    const campaign = createTestCampaign();

    const before = usePilotStore.getState().pilots[0];
    const result = autoAwardsProcessor.process(campaign, FIRST_OF_MONTH);

    expect(result.events).toEqual([]);
    expect(usePilotStore.getState().pilots[0]).toBe(before);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fires the REST PUT for SQLite persistence (fire-and-forget)', () => {
    seedStores({ campaignKills: 10 });
    const campaign = createTestCampaign();

    autoAwardsProcessor.process(campaign, FIRST_OF_MONTH);

    const putCalls = mockFetch.mock.calls.filter(
      (call) => ((call[1] as RequestInit)?.method ?? 'GET') === 'PUT',
    );
    expect(putCalls.length).toBeGreaterThan(0);
    expect(putCalls[0][0]).toBe(`/api/pilots/${PILOT_ID}`);

    const body = JSON.parse((putCalls[0][1] as RequestInit).body as string) as {
      awards: Array<{ awardId: string }>;
    };
    expect(Array.isArray(body.awards)).toBe(true);
    expect(body.awards.length).toBeGreaterThan(0);
  });

  it('only enabled categories are evaluated', () => {
    seedStores({ campaignKills: 10 });
    const baseConfig = createDefaultAutoAwardConfig();
    const campaign = createTestCampaign({
      options: {
        ...createDefaultCampaignOptions(),
        autoAwardConfig: {
          ...baseConfig,
          enabledCategories: {
            ...baseConfig.enabledCategories,
            [AutoAwardCategory.KILL]: false,
          },
        },
      },
    });

    const result = autoAwardsProcessor.process(campaign, FIRST_OF_MONTH);

    const killEvents = result.events.filter(
      (e) =>
        e.type === 'award_granted' &&
        (e.data as { category: AutoAwardCategory }).category ===
          AutoAwardCategory.KILL,
    );
    expect(killEvents).toEqual([]);
  });
});

describe('processPostMissionAwards / processPostScenarioAwards', () => {
  it('post-mission grants persist to vault using the post_mission trigger', () => {
    seedStores({ campaignKills: 10 });
    const campaign = createTestCampaign();

    const { events } = processPostMissionAwards(campaign, 'mission-1');

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].trigger).toBe('post_mission');
    const persisted = usePilotStore.getState().pilots[0].awards ?? [];
    expect(persisted.map((a) => a.awardId)).toEqual(
      expect.arrayContaining(events.map((e) => e.awardId)),
    );
  });

  it('post-scenario grants persist to vault using the post_scenario trigger', () => {
    seedStores({ campaignKills: 10 });
    const campaign = createTestCampaign();

    const { events } = processPostScenarioAwards(campaign, 'scenario-1');

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].trigger).toBe('post_scenario');
    const persisted = usePilotStore.getState().pilots[0].awards ?? [];
    expect(persisted.map((a) => a.awardId)).toEqual(
      expect.arrayContaining(events.map((e) => e.awardId)),
    );
  });
});
