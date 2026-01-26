import { describe, it, expect, beforeEach } from '@jest/globals';
import type { IPerson } from '@/types/campaign/Person';
import type { ICampaign } from '@/types/campaign/Campaign';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';
import { PartQuality, DEFAULT_UNIT_QUALITY } from '@/types/campaign/quality';
import type { IUnitQuality } from '@/types/campaign/quality/IUnitQuality';
import type { IForce } from '@/types/campaign/Force';
import { ForceType, FormationLevel } from '@/types/campaign/enums';
import { DayPhase, _resetDayPipeline, getDayPipeline } from '../../dayPipeline';
import {
  maintenanceProcessor,
  shouldRunMaintenance,
  runMaintenanceForAllUnits,
  applyMaintenanceResults,
  createMaintenanceProcessor,
  registerMaintenanceProcessor,
} from '../maintenanceProcessor';

function createTestPerson(overrides: Partial<IPerson> = {}): IPerson {
  return {
    id: 'person-001',
    name: 'Test Tech',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.TECH,
    rank: 'Technician',
    recruitmentDate: new Date('3000-01-01'),
    missionsCompleted: 0,
    totalKills: 0,
    xp: 0,
    totalXpEarned: 0,
    xpSpent: 0,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {
      'tech-general': { level: 5, bonus: 0, xpProgress: 0, typeId: 'tech-general' },
      'tech-mech': { level: 5, bonus: 0, xpProgress: 0, typeId: 'tech-mech' },
    },
    attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
    pilotSkills: { gunnery: 7, piloting: 7 },
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
  };
}

function createTestCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
  const rootForce = {
    id: 'force-root',
    name: 'Root Force',
    subForceIds: ['force-lance'],
    unitIds: [],
    forceType: ForceType.STANDARD,
    formationLevel: FormationLevel.BATTALION,
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
  };

  const lance = {
    id: 'force-lance',
    name: 'Alpha Lance',
    parentForceId: 'force-root',
    subForceIds: [],
    unitIds: ['unit-001', 'unit-002'],
    forceType: ForceType.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
  };

  const forces = new Map<string, IForce>();
  forces.set('force-root', rootForce);
  forces.set('force-lance', lance);

  return {
    id: 'campaign-001',
    name: 'Test Campaign',
    currentDate: new Date('3025-06-16T00:00:00Z'),
    factionId: 'mercenary',
    personnel: new Map<string, IPerson>(),
    forces,
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(1000000) },
    options: createDefaultCampaignOptions(),
    createdAt: '3020-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
  };
}

function randomThatRollsTotal(total: number): () => number {
  let call = 0;
  const die1 = Math.min(total - 1, 6);
  const die2 = total - die1;
  return () => {
    call++;
    if (call % 2 === 1) return (die1 - 1) / 6 + 0.001;
    return (die2 - 1) / 6 + 0.001;
  };
}

function randomRolling7(): () => number {
  return randomThatRollsTotal(7);
}

function randomRolling12(): () => number {
  return randomThatRollsTotal(12);
}

function randomRolling2(): () => number {
  return randomThatRollsTotal(2);
}

describe('maintenanceProcessor', () => {
  it('should have correct id, phase, and displayName', () => {
    expect(maintenanceProcessor.id).toBe('maintenance');
    expect(maintenanceProcessor.phase).toBe(DayPhase.UNITS);
    expect(maintenanceProcessor.displayName).toBe('Maintenance Check');
  });
});

describe('shouldRunMaintenance', () => {
  it('RED: returns true on Monday for weekly frequency', () => {
    const monday = new Date('3025-06-20T00:00:00Z');
    expect(shouldRunMaintenance({ maintenanceCheckFrequency: 'weekly' }, monday)).toBe(true);
  });

  it('RED: returns false on Tuesday for weekly frequency', () => {
    const tuesday = new Date('3025-06-21T00:00:00Z');
    expect(shouldRunMaintenance({ maintenanceCheckFrequency: 'weekly' }, tuesday)).toBe(false);
  });

  it('RED: returns true on 1st of month for monthly frequency', () => {
    const firstOfMonth = new Date('3025-07-01T00:00:00Z');
    expect(shouldRunMaintenance({ maintenanceCheckFrequency: 'monthly' }, firstOfMonth)).toBe(true);
  });

  it('RED: returns false on 15th for monthly frequency', () => {
    const midMonth = new Date('3025-06-15T00:00:00Z');
    expect(shouldRunMaintenance({ maintenanceCheckFrequency: 'monthly' }, midMonth)).toBe(false);
  });

  it('RED: returns true on Jan 1st for quarterly frequency', () => {
    const jan1 = new Date('3025-01-01T00:00:00Z');
    expect(shouldRunMaintenance({ maintenanceCheckFrequency: 'quarterly' }, jan1)).toBe(true);
  });

  it('RED: returns true on Apr 1st for quarterly frequency', () => {
    const apr1 = new Date('3025-04-01T00:00:00Z');
    expect(shouldRunMaintenance({ maintenanceCheckFrequency: 'quarterly' }, apr1)).toBe(true);
  });

  it('RED: returns false on Feb 1st for quarterly frequency', () => {
    const feb1 = new Date('3025-02-01T00:00:00Z');
    expect(shouldRunMaintenance({ maintenanceCheckFrequency: 'quarterly' }, feb1)).toBe(false);
  });

  it('RED: returns true on Jan 1st for annually frequency', () => {
    const jan1 = new Date('3025-01-01T00:00:00Z');
    expect(shouldRunMaintenance({ maintenanceCheckFrequency: 'annually' }, jan1)).toBe(true);
  });

  it('RED: returns false on Jun 15 for annually frequency', () => {
    const midYear = new Date('3025-06-15T00:00:00Z');
    expect(shouldRunMaintenance({ maintenanceCheckFrequency: 'annually' }, midYear)).toBe(false);
  });

  it('RED: returns false for never frequency', () => {
    const anyDate = new Date('3025-06-16T00:00:00Z');
    expect(shouldRunMaintenance({ maintenanceCheckFrequency: 'never' }, anyDate)).toBe(false);
  });

  it('RED: defaults to weekly when frequency not set', () => {
    const monday = new Date('3025-06-20T00:00:00Z');
    expect(shouldRunMaintenance({}, monday)).toBe(true);
  });
});

describe('runMaintenanceForAllUnits', () => {
  it('RED: runs maintenance check for unit with assigned tech', () => {
    const tech = createTestPerson({
      id: 'tech-001',
      name: 'Jane Tech',
      techUnitIds: ['unit-001'],
    });
    const personnel = new Map<string, IPerson>();
    personnel.set('tech-001', tech);

    const campaign = createTestCampaign({ personnel });
    const results = runMaintenanceForAllUnits({
      campaign,
      date: new Date('3025-06-20T00:00:00Z'),
      random: randomRolling7(),
    });

    const unit001 = results.find((r) => r.unitId === 'unit-001');
    expect(unit001).toBeDefined();
    expect(unit001!.unmaintained).toBe(false);
    expect(unit001!.techId).toBe('tech-001');
    expect(unit001!.techName).toBe('Jane Tech');
    expect(unit001!.checkResult).toBeDefined();
  });

  it('RED: marks unmaintained units (no assigned tech)', () => {
    const campaign = createTestCampaign();
    const results = runMaintenanceForAllUnits({
      campaign,
      date: new Date('3025-06-20T00:00:00Z'),
      random: randomRolling7(),
    });

    expect(results.length).toBe(2);
    expect(results.every((r) => r.unmaintained)).toBe(true);
  });

  it('RED: unmaintained unit degrades quality', () => {
    const unitQualities = new Map<string, IUnitQuality>();
    unitQualities.set('unit-001', {
      unitId: 'unit-001',
      quality: PartQuality.D,
      maintenanceHistory: [],
    });

    const campaign = createTestCampaign({ unitQualities });
    const results = runMaintenanceForAllUnits({
      campaign,
      date: new Date('3025-06-20T00:00:00Z'),
      random: randomRolling7(),
    });

    const unit001 = results.find((r) => r.unitId === 'unit-001');
    expect(unit001!.unmaintained).toBe(true);
    expect(unit001!.qualityBefore).toBe(PartQuality.D);
    expect(unit001!.qualityAfter).toBe(PartQuality.C);
  });

  it('RED: quality improves on critical success (high roll)', () => {
    const tech = createTestPerson({
      id: 'tech-001',
      techUnitIds: ['unit-001'],
    });
    const personnel = new Map<string, IPerson>();
    personnel.set('tech-001', tech);

    const unitQualities = new Map<string, IUnitQuality>();
    unitQualities.set('unit-001', {
      unitId: 'unit-001',
      quality: PartQuality.D,
      maintenanceHistory: [],
    });

    const campaign = createTestCampaign({ personnel, unitQualities });
    const results = runMaintenanceForAllUnits({
      campaign,
      date: new Date('3025-06-20T00:00:00Z'),
      random: randomRolling12(),
    });

    const unit001 = results.find((r) => r.unitId === 'unit-001');
    expect(unit001!.checkResult!.outcome).toBe('critical_success');
    expect(unit001!.qualityAfter).toBe(PartQuality.E);
  });

  it('RED: quality degrades on critical failure (low roll)', () => {
    const tech = createTestPerson({
      id: 'tech-001',
      techUnitIds: ['unit-001'],
      skills: {
        'tech-general': { level: 8, bonus: 0, xpProgress: 0, typeId: 'tech-general' },
      },
    });
    const personnel = new Map<string, IPerson>();
    personnel.set('tech-001', tech);

    const unitQualities = new Map<string, IUnitQuality>();
    unitQualities.set('unit-001', {
      unitId: 'unit-001',
      quality: PartQuality.D,
      maintenanceHistory: [],
    });

    const campaign = createTestCampaign({ personnel, unitQualities });
    const results = runMaintenanceForAllUnits({
      campaign,
      date: new Date('3025-06-20T00:00:00Z'),
      random: randomRolling2(),
    });

    const unit001 = results.find((r) => r.unitId === 'unit-001');
    expect(unit001!.checkResult!.outcome).toBe('critical_failure');
    expect(unit001!.qualityAfter).toBe(PartQuality.C);
  });

  it('GREEN: uses default quality D for units without quality tracking', () => {
    const tech = createTestPerson({
      id: 'tech-001',
      techUnitIds: ['unit-001'],
    });
    const personnel = new Map<string, IPerson>();
    personnel.set('tech-001', tech);

    const campaign = createTestCampaign({ personnel });
    const results = runMaintenanceForAllUnits({
      campaign,
      date: new Date('3025-06-20T00:00:00Z'),
      random: randomRolling7(),
    });

    const unit001 = results.find((r) => r.unitId === 'unit-001');
    expect(unit001!.qualityBefore).toBe(DEFAULT_UNIT_QUALITY);
  });

  it('GREEN: inactive tech is not assigned', () => {
    const tech = createTestPerson({
      id: 'tech-001',
      status: PersonnelStatus.WOUNDED,
      techUnitIds: ['unit-001'],
    });
    const personnel = new Map<string, IPerson>();
    personnel.set('tech-001', tech);

    const campaign = createTestCampaign({ personnel });
    const results = runMaintenanceForAllUnits({
      campaign,
      date: new Date('3025-06-20T00:00:00Z'),
      random: randomRolling7(),
    });

    const unit001 = results.find((r) => r.unitId === 'unit-001');
    expect(unit001!.unmaintained).toBe(true);
  });
});

describe('applyMaintenanceResults', () => {
  it('RED: records maintenance history', () => {
    const campaign = createTestCampaign();
    const date = new Date('3025-06-20T00:00:00Z');

    const results = [
      {
        unitId: 'unit-001',
        techId: 'tech-001',
        techName: 'Jane Tech',
        checkResult: {
          unitId: 'unit-001',
          roll: 8,
          targetNumber: 5,
          margin: 3,
          outcome: 'success' as const,
          qualityBefore: PartQuality.D,
          qualityAfter: PartQuality.D,
          modifierBreakdown: [],
        },
        unmaintained: false,
        qualityBefore: PartQuality.D,
        qualityAfter: PartQuality.D,
      },
    ];

    const updated = applyMaintenanceResults(campaign, results, date);
    const unitQuality = updated.unitQualities!.get('unit-001');
    expect(unitQuality).toBeDefined();
    expect(unitQuality!.quality).toBe(PartQuality.D);
    expect(unitQuality!.lastMaintenanceDate).toEqual(date);
    expect(unitQuality!.maintenanceHistory.length).toBe(1);
    expect(unitQuality!.maintenanceHistory[0].roll).toBe(8);
    expect(unitQuality!.maintenanceHistory[0].techId).toBe('tech-001');
  });

  it('RED: updates quality on degradation', () => {
    const campaign = createTestCampaign();
    const date = new Date('3025-06-20T00:00:00Z');

    const results = [
      {
        unitId: 'unit-001',
        unmaintained: true,
        qualityBefore: PartQuality.D,
        qualityAfter: PartQuality.C,
      },
    ];

    const updated = applyMaintenanceResults(campaign, results, date);
    const unitQuality = updated.unitQualities!.get('unit-001');
    expect(unitQuality!.quality).toBe(PartQuality.C);
  });

  it('RED: preserves existing maintenance history', () => {
    const existingHistory = [{
      date: new Date('3025-06-13T00:00:00Z'),
      techId: 'tech-001',
      roll: 9,
      targetNumber: 5,
      margin: 4,
      outcome: 'critical_success' as const,
      qualityBefore: PartQuality.C,
      qualityAfter: PartQuality.D,
    }];

    const unitQualities = new Map<string, IUnitQuality>();
    unitQualities.set('unit-001', {
      unitId: 'unit-001',
      quality: PartQuality.D,
      lastMaintenanceDate: new Date('3025-06-13T00:00:00Z'),
      maintenanceHistory: existingHistory,
    });

    const campaign = createTestCampaign({ unitQualities });
    const date = new Date('3025-06-20T00:00:00Z');

    const results = [
      {
        unitId: 'unit-001',
        techId: 'tech-001',
        techName: 'Jane Tech',
        checkResult: {
          unitId: 'unit-001',
          roll: 7,
          targetNumber: 5,
          margin: 2,
          outcome: 'success' as const,
          qualityBefore: PartQuality.D,
          qualityAfter: PartQuality.D,
          modifierBreakdown: [],
        },
        unmaintained: false,
        qualityBefore: PartQuality.D,
        qualityAfter: PartQuality.D,
      },
    ];

    const updated = applyMaintenanceResults(campaign, results, date);
    const unitQuality = updated.unitQualities!.get('unit-001');
    expect(unitQuality!.maintenanceHistory.length).toBe(2);
    expect(unitQuality!.maintenanceHistory[0].roll).toBe(9);
    expect(unitQuality!.maintenanceHistory[1].roll).toBe(7);
  });

  it('GREEN: returns unchanged campaign when no results', () => {
    const campaign = createTestCampaign();
    const updated = applyMaintenanceResults(campaign, [], new Date());
    expect(updated).toBe(campaign);
  });
});

describe('createMaintenanceProcessor integration', () => {
  it('RED: processor skips on non-maintenance day', () => {
    const tuesday = new Date('3025-06-21T00:00:00Z');
    const campaign = createTestCampaign({ currentDate: tuesday });
    const processor = createMaintenanceProcessor(randomRolling7());

    const result = processor.process(campaign, tuesday);
    expect(result.events.length).toBe(0);
    expect(result.campaign).toBe(campaign);
  });

  it('RED: processor runs on maintenance day and generates events', () => {
    const monday = new Date('3025-06-20T00:00:00Z');
    const tech = createTestPerson({
      id: 'tech-001',
      techUnitIds: ['unit-001'],
    });
    const personnel = new Map<string, IPerson>();
    personnel.set('tech-001', tech);

    const campaign = createTestCampaign({ personnel, currentDate: monday });
    const processor = createMaintenanceProcessor(randomRolling7());

    const result = processor.process(campaign, monday);
    expect(result.events.length).toBe(2);
    expect(result.campaign.unitQualities).toBeDefined();
  });

  it('RED: generates warning event for unmaintained units', () => {
    const monday = new Date('3025-06-20T00:00:00Z');
    const campaign = createTestCampaign({ currentDate: monday });
    const processor = createMaintenanceProcessor(randomRolling7());

    const result = processor.process(campaign, monday);
    const unmaintainedEvents = result.events.filter((e) => e.type === 'maintenance_unmaintained');
    expect(unmaintainedEvents.length).toBe(2);
    expect(unmaintainedEvents[0].severity).toBe('warning');
  });

  it('RED: generates critical event for critical failure', () => {
    const monday = new Date('3025-06-20T00:00:00Z');
    const tech = createTestPerson({
      id: 'tech-001',
      techUnitIds: ['unit-001'],
      skills: {
        'tech-general': { level: 8, bonus: 0, xpProgress: 0, typeId: 'tech-general' },
      },
    });
    const personnel = new Map<string, IPerson>();
    personnel.set('tech-001', tech);

    const campaign = createTestCampaign({ personnel, currentDate: monday });
    const processor = createMaintenanceProcessor(randomRolling2());

    const result = processor.process(campaign, monday);
    const critEvents = result.events.filter((e) => e.type === 'maintenance_critical_failure');
    expect(critEvents.length).toBe(1);
    expect(critEvents[0].severity).toBe('critical');
  });

  it('RED: generates info event for quality improvement', () => {
    const monday = new Date('3025-06-20T00:00:00Z');
    const tech = createTestPerson({
      id: 'tech-001',
      techUnitIds: ['unit-001'],
    });
    const personnel = new Map<string, IPerson>();
    personnel.set('tech-001', tech);

    const campaign = createTestCampaign({ personnel, currentDate: monday });
    const processor = createMaintenanceProcessor(randomRolling12());

    const result = processor.process(campaign, monday);
    const improvedEvents = result.events.filter((e) => e.type === 'maintenance_quality_improved');
    expect(improvedEvents.length).toBe(1);
    expect(improvedEvents[0].severity).toBe('info');
  });

  it('GREEN: event data includes roll, TN, and modifier details', () => {
    const monday = new Date('3025-06-20T00:00:00Z');
    const tech = createTestPerson({
      id: 'tech-001',
      name: 'Jane Tech',
      techUnitIds: ['unit-001'],
    });
    const personnel = new Map<string, IPerson>();
    personnel.set('tech-001', tech);

    const campaign = createTestCampaign({ personnel, currentDate: monday });
    const processor = createMaintenanceProcessor(randomRolling7());

    const result = processor.process(campaign, monday);
    const maintEvent = result.events.find((e) => e.type === 'maintenance_success');
    expect(maintEvent).toBeDefined();
    expect(maintEvent!.data).toBeDefined();
    expect(maintEvent!.data!.unitId).toBe('unit-001');
    expect(maintEvent!.data!.techId).toBe('tech-001');
    expect(maintEvent!.data!.techName).toBe('Jane Tech');
    expect(typeof maintEvent!.data!.roll).toBe('number');
    expect(typeof maintEvent!.data!.targetNumber).toBe('number');
    expect(typeof maintEvent!.data!.margin).toBe('number');
    expect(maintEvent!.data!.outcome).toBeDefined();
  });

  it('GREEN: respects never frequency', () => {
    const monday = new Date('3025-06-20T00:00:00Z');
    const options = {
      ...createDefaultCampaignOptions(),
      maintenanceCheckFrequency: 'never' as const,
    };
    const campaign = createTestCampaign({ options, currentDate: monday });
    const processor = createMaintenanceProcessor(randomRolling7());

    const result = processor.process(campaign, monday);
    expect(result.events.length).toBe(0);
  });
});

describe('registerMaintenanceProcessor', () => {
  beforeEach(() => {
    _resetDayPipeline();
  });

  it('should register the maintenance processor in the pipeline', () => {
    registerMaintenanceProcessor();
    const pipeline = getDayPipeline();
    const processors = pipeline.getProcessors();
    const maintenance = processors.find((p) => p.id === 'maintenance');
    expect(maintenance).toBeDefined();
    expect(maintenance!.phase).toBe(DayPhase.UNITS);
  });
});
