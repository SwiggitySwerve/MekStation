import { ICampaign, createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { IPerson } from '@/types/campaign/Person';
import { createInjury } from '@/types/campaign/Person';
import { IMission, createContract } from '@/types/campaign/Mission';
import { IForce } from '@/types/campaign/Force';
import { Money } from '@/types/campaign/Money';
import {
  PersonnelStatus,
  MissionStatus,
  CampaignPersonnelRole,
  ForceType,
  FormationLevel,
} from '@/types/campaign/enums';

import { healingProcessor } from '../healingProcessor';
import { contractProcessor } from '../contractProcessor';
import { dailyCostsProcessor } from '../dailyCostsProcessor';
import { registerBuiltinProcessors, _resetBuiltinRegistration } from '../index';
import { DayPhase, getDayPipeline, _resetDayPipeline } from '../../dayPipeline';

function createTestPerson(overrides?: Partial<IPerson>): IPerson {
  return {
    id: 'person-001',
    name: 'John Smith',
    callsign: 'Hammer',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('3025-01-01'),
    missionsCompleted: 5,
    totalKills: 3,
    xp: 100,
    totalXpEarned: 200,
    xpSpent: 100,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createTestForce(id: string, unitIds: string[] = []): IForce {
  return {
    id,
    name: `Force ${id}`,
    parentForceId: undefined,
    subForceIds: [],
    unitIds,
    forceType: ForceType.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function createTestCampaign(overrides?: Partial<ICampaign>): ICampaign {
  return {
     id: 'campaign-001',
     name: 'Test Campaign',
     currentDate: new Date('3025-06-15T00:00:00Z'),
     factionId: 'mercenary',
     personnel: new Map<string, IPerson>(),
     forces: new Map<string, IForce>(),
     rootForceId: 'force-root',
     missions: new Map<string, IMission>(),
     finances: { transactions: [], balance: new Money(1000000) },
     factionStandings: {},
     options: createDefaultCampaignOptions(),
     createdAt: '2026-01-01T00:00:00Z',
     updatedAt: '2026-01-01T00:00:00Z',
     ...overrides,
   };
}

describe('healingProcessor', () => {
  it('should have correct id, phase, and displayName', () => {
    expect(healingProcessor.id).toBe('healing');
    expect(healingProcessor.phase).toBe(DayPhase.PERSONNEL);
    expect(healingProcessor.displayName).toBe('Personnel Healing');
  });

  it('should return healing events for wounded personnel', () => {
    const injury = createInjury({
      id: 'inj-1',
      type: 'Broken Arm',
      location: 'Left Arm',
      severity: 2,
      daysToHeal: 1,
      permanent: false,
      acquired: new Date('3025-01-01'),
    });

    const personnel = new Map<string, IPerson>();
    personnel.set(
      'p1',
      createTestPerson({
        id: 'p1',
        name: 'Jane',
        status: PersonnelStatus.WOUNDED,
        injuries: [injury],
        daysToWaitForHealing: 0,
      })
    );

    const campaign = createTestCampaign({ personnel });
    const result = healingProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('healing');
    expect(result.campaign.personnel.get('p1')!.status).toBe(PersonnelStatus.ACTIVE);
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
      })
    );

    const campaign = createTestCampaign({ missions });
    const result = contractProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('contract_expired');
    expect(result.campaign.missions.get('c1')!.status).toBe(MissionStatus.SUCCESS);
  });
});

describe('dailyCostsProcessor', () => {
  it('should have correct id, phase, and displayName', () => {
    expect(dailyCostsProcessor.id).toBe('dailyCosts');
    expect(dailyCostsProcessor.phase).toBe(DayPhase.FINANCES);
    expect(dailyCostsProcessor.displayName).toBe('Daily Costs');
  });

  it('should return cost events when there are costs', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));

    const forces = new Map<string, IForce>();
    forces.set('force-root', createTestForce('force-root', ['unit-1']));

    const campaign = createTestCampaign({ personnel, forces });
    const result = dailyCostsProcessor.process(campaign, campaign.currentDate);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('daily_costs');
    expect(result.events[0].severity).toBe('info');
  });

  it('should return warning severity when balance goes negative', () => {
    const personnel = new Map<string, IPerson>();
    personnel.set('p1', createTestPerson({ id: 'p1', status: PersonnelStatus.ACTIVE }));

    const campaign = createTestCampaign({
      personnel,
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

  it('should register all four builtin processors', () => {
    registerBuiltinProcessors();
    const processors = getDayPipeline().getProcessors();

    expect(processors).toHaveLength(4);
    expect(processors.map((p) => p.id)).toEqual(['healing', 'contracts', 'dailyCosts', 'acquisition']);
  });

  it('should be idempotent (calling twice registers once)', () => {
    registerBuiltinProcessors();
    registerBuiltinProcessors();

    const processors = getDayPipeline().getProcessors();
    expect(processors).toHaveLength(4);
  });

  it('should register processors in correct phase order', () => {
    registerBuiltinProcessors();
    const processors = getDayPipeline().getProcessors();

    expect(processors[0].phase).toBe(DayPhase.PERSONNEL);
    expect(processors[1].phase).toBe(DayPhase.MISSIONS);
    expect(processors[2].phase).toBe(DayPhase.FINANCES);
    expect(processors[3].phase).toBe(DayPhase.EVENTS);
  });
});
