import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  ICampaign,
  createDefaultCampaignOptions,
} from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import { CampaignType } from '@/types/campaign/CampaignType';
import {
  MissionStatus,
  CampaignPersonnelRole,
  ForceRole,
  FormationLevel,
} from '@/types/campaign/enums';
import { IForce } from '@/types/campaign/Force';
import { IMission, createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { createInjury } from '@/types/campaign/Person';

import { DayPhase, getDayPipeline, _resetDayPipeline } from '../../dayPipeline';
import { contractProcessor } from '../contractProcessor';
import { dailyCostsProcessor } from '../dailyCostsProcessor';
import { healingProcessor } from '../healingProcessor';
import { registerBuiltinProcessors, _resetBuiltinRegistration } from '../index';

function createTestForce(id: string, unitIds: string[] = []): IForce {
  return {
    id,
    name: `Force ${id}`,
    parentForceId: undefined,
    subForceIds: [],
    unitIds,
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

/** Builds a minimal ICampaignRosterEntry for store population in tests. */
function makeRosterEntry(
  id: string,
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: id,
    pilotName: `Pilot ${id}`,
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
    injuries: [],
    ...overrides,
  };
}

/** Resets both Zustand stores to empty state between tests. */
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

function createTestCampaign(overrides?: Partial<ICampaign>): ICampaign {
  return {
    id: 'campaign-001',
    name: 'Test Campaign',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map<string, IForce>(),
    rootForceId: 'force-root',
    missions: new Map<string, IMission>(),
    finances: { transactions: [], balance: new Money(1000000) },
    factionStandings: {},
    shoppingList: { items: [] },
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
    // Per canonicalize-unit-combat-state PR-A: required ICampaign field.
    unitCombatStates: overrides?.unitCombatStates ?? {},
  };
}

describe('healingProcessor', () => {
  afterEach(() => clearStores());

  it('should have correct id, phase, and displayName', () => {
    expect(healingProcessor.id).toBe('healing');
    expect(healingProcessor.phase).toBe(DayPhase.PERSONNEL);
    expect(healingProcessor.displayName).toBe('Personnel Healing');
  });

  it('should return healing events for wounded personnel', () => {
    // Guarantee the 2d6 medicine roll always succeeds (TN = 7, roll = 12).
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);

    const injury = createInjury({
      id: 'inj-1',
      type: 'Broken Arm',
      location: 'Left Arm',
      severity: 2,
      daysToHeal: 1,
      permanent: false,
      acquired: new Date('3025-01-01'),
    });

    // Populate roster store so healingProcessor sees the Wounded entry.
    // A DOCTOR entry must also be present — without one, getBestAvailableDoctor
    // returns null, naturalHealing fires, and daysToHeal never reaches 0.
    useCampaignRosterStore.setState({
      campaignId: 'campaign-001',
      units: [],
      pilots: [
        makeRosterEntry('p1', {
          pilotName: 'Jane',
          status: CampaignPilotStatus.Wounded,
          injuries: [injury],
          recoveryTime: 0,
        }),
        makeRosterEntry('doc-1', {
          pilotName: 'Doc',
          primaryRole: CampaignPersonnelRole.DOCTOR,
        }),
      ],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });

    const campaign = createTestCampaign({});
    const result = healingProcessor.process(campaign, campaign.currentDate);

    randomSpy.mockRestore();

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('healing');
    expect(
      useCampaignRosterStore.getState().pilots.find((p) => p.pilotId === 'p1')!
        .status,
    ).toBe(CampaignPilotStatus.Active);
  });

  it('should return empty events when no healing occurs', () => {
    const campaign = createTestCampaign();
    const result = healingProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(0);
  });
});

describe('contractProcessor', () => {
  it('should have correct id, phase, and displayName', () => {
    expect(contractProcessor.id).toBe('contracts');
    expect(contractProcessor.phase).toBe(DayPhase.MISSIONS);
    expect(contractProcessor.displayName).toBe('Contract Processing');
  });

  it('should return events for expired contracts', () => {
    const missions = new Map<string, IMission>();
    missions.set(
      'c1',
      createContract({
        id: 'c1',
        name: 'Garrison',
        employerId: 'davion',
        targetId: 'liao',
        status: MissionStatus.ACTIVE,
        endDate: '3025-01-01',
      }),
    );

    const campaign = createTestCampaign({ missions });
    const result = contractProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('contract_expired');
    expect(result.campaign.missions.get('c1')!.status).toBe(
      MissionStatus.SUCCESS,
    );
  });
});

describe('dailyCostsProcessor', () => {
  afterEach(() => clearStores());

  it('should have correct id, phase, and displayName', () => {
    expect(dailyCostsProcessor.id).toBe('dailyCosts');
    expect(dailyCostsProcessor.phase).toBe(DayPhase.FINANCES);
    expect(dailyCostsProcessor.displayName).toBe('Daily Costs');
  });

  it('should return cost events when there are costs', () => {
    // "cost events" test relies on unit maintenance from forces (not personnel
    // salary), so store setup is not required here — unit cost path reads
    // campaign.forces, not the roster store.

    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1']));

    const campaign = createTestCampaign({ forces });
    const result = dailyCostsProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('daily_costs');
    expect(result.events[0].severity).toBe('info');
  });

  it('should return warning severity when balance goes negative', () => {
    // Populate roster store so personnel salary is counted and drives
    // balance negative (store is the read-side since PR3 migration).
    useCampaignRosterStore.setState({
      campaignId: 'campaign-001',
      units: [],
      pilots: [makeRosterEntry('p1')],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });

    const campaign = createTestCampaign({
      finances: { transactions: [], balance: new Money(0) },
    });
    const result = dailyCostsProcessor.process(campaign, campaign.currentDate);

    expect(result.events[0].severity).toBe('warning');
  });

  it('should return empty events when no costs', () => {
    const campaign = createTestCampaign();
    const result = dailyCostsProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(0);
  });
});

describe('registerBuiltinProcessors', () => {
  afterEach(() => {
    _resetDayPipeline();
    _resetBuiltinRegistration();
  });

  it('should register all twenty-one builtin processors', () => {
    registerBuiltinProcessors();
    const processors = getDayPipeline().getProcessors();

    // 21 = 17 prior + financial, turnover, faction-standing, and
    // vocational-training (audit finding D-2, 2026-06-09 — these four
    // were shipped and unit-tested but never registered in production).
    expect(processors).toHaveLength(21);
    expect(processors.map((p) => p.id).sort()).toEqual(
      [
        'healing',
        'auto-awards',
        'turnover',
        'unit-market',
        'personnel-market',
        'contract-market',
        'post-battle',
        'salvage',
        'contracts',
        'repair-queue-builder',
        'dailyCosts',
        'financial',
        'acquisition',
        'random-events',
        'vocational-training',
        'scenario-generation',
        'faction-standing',
        'scenario-encounter-bridge',
        'inventory-projection',
        'refit',
        'morale',
      ].sort(),
    );
  });

  it('should be idempotent (calling twice registers once)', () => {
    registerBuiltinProcessors();
    registerBuiltinProcessors();

    const processors = getDayPipeline().getProcessors();
    expect(processors).toHaveLength(21);
  });

  it('should register processors in correct phase order', () => {
    registerBuiltinProcessors();
    const processors = getDayPipeline().getProcessors();

    // Wave 5 (round-trip wiring) reordered the battle-effects block:
    //   postBattle (350) → salvage (375) → repair (390) → contracts (400)
    // so contracts see fully-applied salvage + repair state. Pipeline
    // sorts ascending by phase. add-campaign-combat-loop adds three
    // processors at the tail: scenario-generation (EVENTS=800),
    // scenario-encounter-bridge (EVENTS+10=810), inventory-projection
    // (CLEANUP=900). add-campaign-refit-and-prestige (Wave 4 CP3) adds
    // the refit processor (UNITS=500) and the morale processor
    // (EVENTS=800). Audit finding D-2 (2026-06-09) wires the four
    // shipped-but-unregistered processors: turnover (PERSONNEL=100,
    // after healing/auto-awards), financial (FINANCES=700, after
    // dailyCosts), vocational-training (EVENTS=800), faction-standing
    // (EVENTS=800, last EVENTS step per MekHQ). Expected order:
    //   PERSONNEL × 3, MARKETS × 3, post-battle, salvage, repair,
    //   contracts, refit (UNITS), FINANCES × 2, EVENTS × 6, EVENTS+10,
    //   CLEANUP.
    expect(processors[0].phase).toBe(DayPhase.PERSONNEL);
    expect(processors[1].phase).toBe(DayPhase.PERSONNEL);
    expect(processors[2].phase).toBe(DayPhase.PERSONNEL); // turnover (D-2)
    expect(processors[3].phase).toBe(DayPhase.MARKETS);
    expect(processors[4].phase).toBe(DayPhase.MARKETS);
    expect(processors[5].phase).toBe(DayPhase.MARKETS);
    expect(processors[6].phase).toBe(DayPhase.MISSIONS - 50); // post-battle
    expect(processors[7].phase).toBe(DayPhase.MISSIONS - 25); // salvage
    expect(processors[8].phase).toBe(DayPhase.MISSIONS - 10); // repair
    expect(processors[9].phase).toBe(DayPhase.MISSIONS); // contracts
    expect(processors[10].phase).toBe(DayPhase.UNITS); // refit
    expect(processors[11].phase).toBe(DayPhase.FINANCES); // dailyCosts
    expect(processors[12].phase).toBe(DayPhase.FINANCES); // financial (D-2)
    expect(processors[13].phase).toBe(DayPhase.EVENTS);
    expect(processors[14].phase).toBe(DayPhase.EVENTS);
    expect(processors[15].phase).toBe(DayPhase.EVENTS); // vocational (D-2)
    expect(processors[16].phase).toBe(DayPhase.EVENTS);
    expect(processors[17].phase).toBe(DayPhase.EVENTS);
    expect(processors[18].phase).toBe(DayPhase.EVENTS); // faction-standing (D-2)
    expect(processors[19].phase).toBe(DayPhase.EVENTS + 10); // bridge
    expect(processors[20].phase).toBe(DayPhase.CLEANUP); // inventory
  });
});
