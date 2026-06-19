import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignType } from '@/types/campaign/CampaignType';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import { DayPhase, _resetDayPipeline, getDayPipeline } from '../../dayPipeline';
import {
  vocationalTrainingProcessor,
  processVocationalTraining,
  registerVocationalTrainingProcessor,
} from '../vocationalTrainingProcessor';

type RandomFn = () => number;

/**
 * Cluster E PR3 — processors read from useCampaignRosterStore /
 * usePilotStore. createRosterEntry synthesises an ICampaignRosterEntry
 * that carries the fields relevant to the vocational check (status, role,
 * traits, pilotId). buildVaultPilot synthesises the minimal IPilot the
 * processor needs for the NPC-null guard + birthDate child check.
 */
function createRosterEntry(
  id: string,
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: id,
    pilotName: overrides.pilotName ?? 'Test Person',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 100,
    campaignXpEarned: 200,
    campaignKills: 3,
    campaignMissions: 5,
    hireDate: new Date('3000-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

function buildVaultPilot(
  id: string,
  name = 'Test Person',
  birthDate?: Date,
): IPilot {
  return {
    id,
    name,
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    awards: [],
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...(birthDate ? { birthDate } : {}),
  };
}

function createTestCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
  return {
    id: 'campaign-001',
    name: 'Test Campaign',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(1000000) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
    campaignType: CampaignType.MERCENARY,
    // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
    unitCombatStates: overrides.unitCombatStates ?? {},
  };
}

/**
 * Resets both stores after each test to prevent state bleeding.
 */
function clearStores(): void {
  useCampaignRosterStore.setState({
    pilots: [],
    units: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
    campaignId: null,
  });
  usePilotStore.setState({ pilots: [] });
}

/**
 * Helper to rolls 2d6 using injectable random function.
 * Maps die values (1-6) to random() inputs via (die-1)/6.
 */
function randomFor2d6(die1: number, die2: number): RandomFn {
  let callCount = 0;
  return () => {
    const die = callCount === 0 ? die1 : die2;
    callCount++;
    return (die - 1) / 6;
  };
}

describe('vocationalTrainingProcessor', () => {
  it('should have correct id, phase, and displayName', () => {
    expect(vocationalTrainingProcessor.id).toBe('vocational-training');
    expect(vocationalTrainingProcessor.phase).toBe(DayPhase.EVENTS);
    expect(vocationalTrainingProcessor.displayName).toBe('Vocational Training');
  });
});

describe('processVocationalTraining', () => {
  afterEach(() => {
    clearStores();
  });

  it('should increment timer for eligible person', () => {
    const campaign = createTestCampaign({});

    // Populate stores: entry matches the person, vault pilot is present so
    // the NPC-null guard passes.
    useCampaignRosterStore.setState({
      pilots: [
        createRosterEntry('person-001', { traits: { vocationalXPTimer: 28 } }),
      ],
      units: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
      campaignId: 'campaign-001',
    });
    usePilotStore.setState({ pilots: [buildVaultPilot('person-001')] });

    const { updatedCampaign } = processVocationalTraining(campaign, () => 0);
    const updated = useCampaignRosterStore
      .getState()
      .pilots.find((__p) => __p.pilotId === 'person-001');

    expect(updated?.traits?.vocationalXPTimer).toBe(29);
  });

  it('should award vocational XP when roll >= TN', () => {
    const campaign = createTestCampaign({
      options: {
        ...createDefaultCampaignOptions(),
        vocationalXP: 1,
        vocationalXPTargetNumber: 7,
        vocationalXPCheckFrequency: 30,
      },
    });

    useCampaignRosterStore.setState({
      pilots: [
        createRosterEntry('person-001', { traits: { vocationalXPTimer: 29 } }),
      ],
      units: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
      campaignId: 'campaign-001',
    });
    usePilotStore.setState({ pilots: [buildVaultPilot('person-001')] });

    // Roll 7 (3+4) vs TN 7 = success
    const random = randomFor2d6(3, 4);
    const { updatedCampaign, events } = processVocationalTraining(
      campaign,
      random,
    );

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('vocational');
    expect(events[0].description).toContain('rolled 7');
    expect(events[0].description).toContain('TN 7');

    const updated = useCampaignRosterStore
      .getState()
      .pilots.find((__p) => __p.pilotId === 'person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(0);
  });

  it('should not award XP when roll < TN', () => {
    const campaign = createTestCampaign({
      options: {
        ...createDefaultCampaignOptions(),
        vocationalXP: 1,
        vocationalXPTargetNumber: 7,
        vocationalXPCheckFrequency: 30,
      },
    });

    useCampaignRosterStore.setState({
      pilots: [
        createRosterEntry('person-001', { traits: { vocationalXPTimer: 29 } }),
      ],
      units: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
      campaignId: 'campaign-001',
    });
    usePilotStore.setState({ pilots: [buildVaultPilot('person-001')] });

    // Roll 6 (2+4) vs TN 7 = failure
    const random = randomFor2d6(2, 4);
    const { updatedCampaign, events } = processVocationalTraining(
      campaign,
      random,
    );

    expect(events).toHaveLength(0);

    const updated = useCampaignRosterStore
      .getState()
      .pilots.find((__p) => __p.pilotId === 'person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(0);
  });

  it('should skip inactive personnel', () => {
    const campaign = createTestCampaign({});

    // Roster entry status is KIA (non-Active) so processor skips this entry.
    useCampaignRosterStore.setState({
      pilots: [
        createRosterEntry('person-001', {
          status: CampaignPilotStatus.KIA,
          traits: { vocationalXPTimer: 29 },
        }),
      ],
      units: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
      campaignId: 'campaign-001',
    });
    usePilotStore.setState({ pilots: [buildVaultPilot('person-001')] });

    const { updatedCampaign, events } = processVocationalTraining(
      campaign,
      () => 0,
    );

    expect(events).toHaveLength(0);
    const updated = useCampaignRosterStore
      .getState()
      .pilots.find((__p) => __p.pilotId === 'person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(29);
  });

  it('should skip child personnel', () => {
    const birthDate = new Date('3020-01-01'); // 5 years old
    const campaign = createTestCampaign({
      currentDate: new Date('3025-06-15'),
    });

    // The child check reads vault pilot birthDate; push a vault pilot with
    // birthDate set so isEligibleForVocational returns false for age < 13.
    useCampaignRosterStore.setState({
      pilots: [
        createRosterEntry('person-001', { traits: { vocationalXPTimer: 29 } }),
      ],
      units: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
      campaignId: 'campaign-001',
    });
    usePilotStore.setState({
      pilots: [buildVaultPilot('person-001', 'Test Person', birthDate)],
    });

    const { updatedCampaign, events } = processVocationalTraining(
      campaign,
      () => 0,
    );

    expect(events).toHaveLength(0);
    const updated = useCampaignRosterStore
      .getState()
      .pilots.find((__p) => __p.pilotId === 'person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(29);
  });

  it('should skip dependent personnel', () => {
    const campaign = createTestCampaign({});

    // Roster entry role is DEPENDENT so processor skips.
    useCampaignRosterStore.setState({
      pilots: [
        createRosterEntry('person-001', {
          primaryRole: CampaignPersonnelRole.DEPENDENT,
          traits: { vocationalXPTimer: 29 },
        }),
      ],
      units: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
      campaignId: 'campaign-001',
    });
    usePilotStore.setState({ pilots: [buildVaultPilot('person-001')] });

    const { updatedCampaign, events } = processVocationalTraining(
      campaign,
      () => 0,
    );

    expect(events).toHaveLength(0);
    const updated = useCampaignRosterStore
      .getState()
      .pilots.find((__p) => __p.pilotId === 'person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(29);
  });

  it('should skip prisoner personnel', () => {
    const campaign = createTestCampaign({});

    // Roster entry status is MIA (non-Active) — closest CampaignPilotStatus
    // to POW; the processor only checks for Active, so any non-Active skips.
    useCampaignRosterStore.setState({
      pilots: [
        createRosterEntry('person-001', {
          status: CampaignPilotStatus.MIA,
          traits: { vocationalXPTimer: 29 },
        }),
      ],
      units: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
      campaignId: 'campaign-001',
    });
    usePilotStore.setState({ pilots: [buildVaultPilot('person-001')] });

    const { updatedCampaign, events } = processVocationalTraining(
      campaign,
      () => 0,
    );

    expect(events).toHaveLength(0);
    const updated = useCampaignRosterStore
      .getState()
      .pilots.find((__p) => __p.pilotId === 'person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(29);
  });

  it('should reset timer after check regardless of success', () => {
    const campaign = createTestCampaign({
      options: {
        ...createDefaultCampaignOptions(),
        vocationalXPTargetNumber: 12, // Impossible to roll
      },
    });

    useCampaignRosterStore.setState({
      pilots: [
        createRosterEntry('person-001', { traits: { vocationalXPTimer: 29 } }),
      ],
      units: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
      campaignId: 'campaign-001',
    });
    usePilotStore.setState({ pilots: [buildVaultPilot('person-001')] });

    // Roll 2 (1+1) vs TN 12 = failure
    const random = randomFor2d6(1, 1);
    const { updatedCampaign } = processVocationalTraining(campaign, random);

    const updated = useCampaignRosterStore
      .getState()
      .pilots.find((__p) => __p.pilotId === 'person-001');
    expect(updated?.traits?.vocationalXPTimer).toBe(0);
  });

  it('should use default values when options not set', () => {
    const campaign = createTestCampaign({
      options: createDefaultCampaignOptions(),
    });

    useCampaignRosterStore.setState({
      pilots: [
        createRosterEntry('person-001', { traits: { vocationalXPTimer: 29 } }),
      ],
      units: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
      campaignId: 'campaign-001',
    });
    usePilotStore.setState({ pilots: [buildVaultPilot('person-001')] });

    // Roll 7 (3+4) vs default TN 7 = success
    const random = randomFor2d6(3, 4);
    const { events } = processVocationalTraining(campaign, random);

    expect(events).toHaveLength(1);
    expect(events[0].description).toContain('rolled 7');
  });

  it('should handle multiple personnel', () => {
    const campaign = createTestCampaign({
      options: {
        ...createDefaultCampaignOptions(),
        vocationalXPTargetNumber: 7,
        vocationalXPCheckFrequency: 30,
      },
    });

    useCampaignRosterStore.setState({
      pilots: [
        createRosterEntry('person-001', { traits: { vocationalXPTimer: 29 } }),
        createRosterEntry('person-002', { traits: { vocationalXPTimer: 15 } }),
      ],
      units: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
      campaignId: 'campaign-001',
    });
    usePilotStore.setState({
      pilots: [buildVaultPilot('person-001'), buildVaultPilot('person-002')],
    });

    // Roll 7 (3+4) vs TN 7 = success for person 1
    const random = randomFor2d6(3, 4);
    const { updatedCampaign, events } = processVocationalTraining(
      campaign,
      random,
    );

    expect(events).toHaveLength(1);
    expect(events[0].data?.personId).toBe('person-001');

    const updated1 = useCampaignRosterStore
      .getState()
      .pilots.find((__p) => __p.pilotId === 'person-001');
    const updated2 = useCampaignRosterStore
      .getState()
      .pilots.find((__p) => __p.pilotId === 'person-002');
    expect(updated1?.traits?.vocationalXPTimer).toBe(0);
    expect(updated2?.traits?.vocationalXPTimer).toBe(16);
  });

  it('should be deterministic with seeded random', () => {
    const campaign = createTestCampaign({
      options: {
        ...createDefaultCampaignOptions(),
        vocationalXPTargetNumber: 7,
      },
    });

    function seed(): void {
      useCampaignRosterStore.setState({
        pilots: [
          createRosterEntry('person-001', {
            traits: { vocationalXPTimer: 29 },
          }),
        ],
        units: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
        campaignId: 'campaign-001',
      });
    }
    seed();
    usePilotStore.setState({ pilots: [buildVaultPilot('person-001')] });

    const random1 = randomFor2d6(3, 4);
    const { events: events1 } = processVocationalTraining(campaign, random1);

    // Per PR4: roster store is mutated by processVocationalTraining
    // (timer reset + xp grant). Re-seed so the second call has the same
    // pre-state as the first; otherwise the determinism check compares
    // the first call's output against an empty second-call output.
    seed();

    const random2 = randomFor2d6(3, 4);
    const { events: events2 } = processVocationalTraining(campaign, random2);

    expect(events1).toEqual(events2);
  });
});

describe('vocationalTrainingProcessor.process', () => {
  afterEach(() => {
    clearStores();
  });

  it('should process vocational training on each day', () => {
    const campaign = createTestCampaign({});

    useCampaignRosterStore.setState({
      pilots: [
        createRosterEntry('person-001', { traits: { vocationalXPTimer: 28 } }),
      ],
      units: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
      campaignId: 'campaign-001',
    });
    usePilotStore.setState({ pilots: [buildVaultPilot('person-001')] });

    const result = vocationalTrainingProcessor.process(
      campaign,
      new Date('3025-06-15'),
    );

    expect(
      useCampaignRosterStore
        .getState()
        .pilots.find((__p) => __p.pilotId === 'person-001')?.traits
        ?.vocationalXPTimer,
    ).toBe(29);
  });
});

describe('registerVocationalTrainingProcessor', () => {
  beforeEach(() => {
    _resetDayPipeline();
  });

  it('should register processor in pipeline', () => {
    registerVocationalTrainingProcessor();
    const pipeline = getDayPipeline();
    const processors = pipeline.getProcessors();
    const processor = processors.find((p) => p.id === 'vocational-training');

    expect(processor).toBeDefined();
    expect(processor?.id).toBe('vocational-training');
  });
});
