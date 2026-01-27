/**
 * Tests for Scenario Generation Day Processor
 *
 * Comprehensive test suite covering:
 * - Monday-only execution
 * - Option gating (useAtBScenarios)
 * - Active contract filtering
 * - Full pipeline (battle chance → scenario type → OpFor → conditions)
 * - Multiple teams, multiple contracts
 * - Deterministic random behavior
 */

import { scenarioGenerationProcessor, createScenarioGenerationProcessor } from '../scenarioGenerationProcessor';
import { ICampaign, createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { IContract } from '@/types/campaign/Mission';
import { CombatRole, AtBMoraleLevel, type ICombatTeam, type IScenarioConditions } from '@/types/campaign/scenario/scenarioTypes';
import { DayPhase } from '@/lib/campaign/dayPipeline';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { Money } from '@/types/campaign/Money';

// =============================================================================
// Test Helpers
// =============================================================================

function createConstantRandom(val: number) {
  return () => val;
}

function createCyclingRandom(...values: number[]) {
  let index = 0;
  return () => {
    const result = values[index % values.length];
    index++;
    return result;
  };
}

function createMockCampaign(overrides?: Partial<ICampaign>): ICampaign {
  const baseDate = new Date('2025-01-27');
  const defaultOptions = createDefaultCampaignOptions();
  return {
    id: 'campaign-test',
    name: 'Test Campaign',
    currentDate: baseDate,
    factionId: 'mercenary',
    personnel: new Map(),
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    combatTeams: [],
    options: {
      ...defaultOptions,
      useAtBScenarios: false,
      difficultyMultiplier: 1.0,
    },
    campaignType: CampaignType.MERCENARY,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockContract(overrides?: Partial<IContract>): IContract {
  return {
    id: 'contract-001',
    name: 'Test Contract',
    status: MissionStatus.ACTIVE,
    type: 'contract',
    systemId: 'test-system',
    scenarioIds: [],
    description: 'Test contract',
    briefing: 'Test briefing',
    startDate: '3025-01-01',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    employerId: 'davion',
    targetId: 'liao',
    paymentTerms: {
      basePayment: new Money(100000),
      successPayment: new Money(0),
      partialPayment: new Money(0),
      failurePayment: new Money(0),
      salvagePercent: 50,
      transportPayment: new Money(0),
      supportPayment: new Money(0),
    },
    salvageRights: 'Integrated',
    commandRights: 'Independent',
    moraleLevel: AtBMoraleLevel.STALEMATE,
    ...overrides,
  };
}

function createMockTeam(overrides?: Partial<ICombatTeam>): ICombatTeam {
  return {
    forceId: 'force-001',
    role: CombatRole.MANEUVER,
    battleChance: 40,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('scenarioGenerationProcessor', () => {
  describe('processor interface', () => {
    it('should have correct id', () => {
      expect(scenarioGenerationProcessor.id).toBe('scenario-generation');
    });

    it('should have correct phase', () => {
      expect(scenarioGenerationProcessor.phase).toBe(DayPhase.EVENTS);
    });

    it('should have display name', () => {
      expect(scenarioGenerationProcessor.displayName).toBe('Scenario Generation (AtB)');
    });

    it('should have process method', () => {
      expect(typeof scenarioGenerationProcessor.process).toBe('function');
    });
  });

  describe('Monday gating', () => {
    it('should not process on non-Monday dates', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'), // Tuesday
        options: { ...createMockCampaign().options, useAtBScenarios: true },
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.events).toHaveLength(0);
    });

    it('should not process on Wednesday', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-28'), // Wednesday
        options: { ...createMockCampaign().options, useAtBScenarios: true },
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.events).toHaveLength(0);
    });

    it('should not process on Sunday', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-25'), // Sunday
        options: { ...createMockCampaign().options, useAtBScenarios: true },
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.events).toHaveLength(0);
    });

    it('should process on Monday dates', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'), // Monday
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.campaign).toBeDefined();
    });
  });

  describe('option gating', () => {
    it('should not process when useAtBScenarios is false', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'), // Monday
        options: { ...createMockCampaign().options, useAtBScenarios: false },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.events).toHaveLength(0);
    });

    it('should not process when useAtBScenarios is undefined', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'), // Monday
        options: { ...createMockCampaign().options, useAtBScenarios: undefined },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.events).toHaveLength(0);
    });

    it('should process when useAtBScenarios is true', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'), // Monday
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.campaign).toBeDefined();
    });
  });

  describe('active contract filtering', () => {
    it('should skip contracts with past endDate', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'), // Monday
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([
          [
            'contract-001',
            createMockContract({
              endDate: '2025-01-20', // Past date
            }),
          ],
        ]),
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.events).toHaveLength(0);
    });

    it('should include contracts with future endDate', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'), // Monday
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([
          [
            'contract-001',
            createMockContract({
              endDate: '2025-02-26', // Future date
            }),
          ],
        ]),
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.campaign).toBeDefined();
    });

    it('should include contracts with no endDate', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'), // Monday
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([
          [
            'contract-001',
            createMockContract({
              endDate: undefined,
            }),
          ],
        ]),
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.campaign).toBeDefined();
    });

    it('should skip non-contract missions', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([
          [
            'mission-001',
            {
              id: 'mission-001',
              name: 'Test Mission',
              status: MissionStatus.ACTIVE,
              type: 'mission',
              systemId: 'test-system',
              scenarioIds: [],
              description: 'Test mission',
              briefing: 'Test briefing',
              startDate: '3025-01-01',
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-01T00:00:00Z',
            },
          ],
        ]),
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.events).toHaveLength(0);
    });
  });

  describe('battle chance integration', () => {
    it('should emit event when battle occurs', () => {
      const processor = createScenarioGenerationProcessor(createCyclingRandom(0.3, 0.5, 0.5, 0.5, 0.5));
      const baseOptions = createDefaultCampaignOptions();
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...baseOptions, useAtBScenarios: true },
        combatTeams: [createMockTeam({ role: CombatRole.MANEUVER })],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].type).toBe('scenario_generated');
    });

    it('should not emit event when battle does not occur', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.99));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam({ role: CombatRole.MANEUVER })],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events).toHaveLength(0);
    });

    it('should handle Patrol role (60% chance)', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.5));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam({ role: CombatRole.PATROL })],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should handle Frontline role (20% chance)', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.15));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam({ role: CombatRole.FRONTLINE })],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should never generate battle for Auxiliary role', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.05));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam({ role: CombatRole.AUXILIARY })],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events).toHaveLength(0);
    });

    it('should never generate battle for Reserve role', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.05));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam({ role: CombatRole.RESERVE })],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events).toHaveLength(0);
    });
  });

  describe('scenario type selection', () => {
    it('should include scenarioType in event data', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam({ role: CombatRole.MANEUVER })],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].data?.scenarioType).toBeDefined();
    });

    it('should include isAttacker in event data', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam({ role: CombatRole.MANEUVER })],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
      expect(typeof result.events[0].data?.isAttacker).toBe('boolean');
    });
  });

  describe('OpFor BV calculation', () => {
    it('should include opForBV in event data', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true, difficultyMultiplier: 1.0 },
        combatTeams: [createMockTeam({ battleChance: 40 })],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
      expect(typeof result.events[0].data?.opForBV).toBe('number');
      expect(result.events[0].data?.opForBV).toBeGreaterThan(0);
    });

    it('should apply difficulty multiplier to OpFor BV', () => {
      const processor1 = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const processor2 = createScenarioGenerationProcessor(createConstantRandom(0.3));

      const campaign1 = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true, difficultyMultiplier: 1.0 },
        combatTeams: [createMockTeam({ battleChance: 40 })],
        missions: new Map([['contract-001', createMockContract()]]),
      });

      const campaign2 = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true, difficultyMultiplier: 2.0 },
        combatTeams: [createMockTeam({ battleChance: 40 })],
        missions: new Map([['contract-001', createMockContract()]]),
      });

      const result1 = processor1.process(campaign1, campaign1.currentDate);
      const result2 = processor2.process(campaign2, campaign2.currentDate);

      expect(result1.events.length).toBeGreaterThan(0);
      expect(result2.events.length).toBeGreaterThan(0);
      const bv1 = result1.events[0].data?.opForBV as number;
      const bv2 = result2.events[0].data?.opForBV as number;
      expect(bv2).toBeGreaterThan(bv1);
    });
  });

  describe('scenario conditions', () => {
    it('should include conditions in event data', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].data?.conditions).toBeDefined();
    });

    it('should include light level in conditions', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
      const conditions = result.events[0].data?.conditions as IScenarioConditions;
      expect(conditions?.light).toBeDefined();
    });

    it('should include weather in conditions', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
      const conditions = result.events[0].data?.conditions as IScenarioConditions;
      expect(conditions?.weather).toBeDefined();
    });
  });

  describe('multiple teams and contracts', () => {
    it('should process multiple teams in one contract', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [
          createMockTeam({ forceId: 'force-001', role: CombatRole.MANEUVER }),
          createMockTeam({ forceId: 'force-002', role: CombatRole.PATROL }),
        ],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThanOrEqual(2);
    });

    it('should process multiple contracts', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([
          ['contract-001', createMockContract({ id: 'contract-001', name: 'Contract 1' })],
          ['contract-002', createMockContract({ id: 'contract-002', name: 'Contract 2' })],
        ]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle no combat teams gracefully', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.events).toHaveLength(0);
    });

    it('should handle no contracts gracefully', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map(),
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.events).toHaveLength(0);
    });
  });

  describe('morale level integration', () => {
    it('should use contract morale level in scenario type selection', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([
          [
            'contract-001',
            createMockContract({
              moraleLevel: AtBMoraleLevel.OVERWHELMING,
            }),
          ],
        ]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].data?.scenarioType).toBeDefined();
    });

    it('should default to STALEMATE when morale is undefined', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([
          [
            'contract-001',
            createMockContract({
              moraleLevel: undefined,
            }),
          ],
        ]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
    });
  });

  describe('event structure', () => {
    it('should emit event with correct type', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].type).toBe('scenario_generated');
    });

    it('should emit event with description', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].description).toContain('Scenario generated');
      expect(result.events[0].description).toContain('Test Contract');
    });

    it('should emit event with info severity', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].severity).toBe('info');
    });

    it('should include teamId and contractId in event data', () => {
      const processor = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam({ forceId: 'force-test' })],
        missions: new Map([['contract-test', createMockContract({ id: 'contract-test' })]]),
      });
      const result = processor.process(campaign, campaign.currentDate);
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].data?.teamId).toBe('force-test');
      expect(result.events[0].data?.contractId).toBe('contract-test');
    });
  });

  describe('deterministic behavior', () => {
    it('should produce same results with same random seed', () => {
      const processor1 = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const processor2 = createScenarioGenerationProcessor(createConstantRandom(0.3));

      const campaign1 = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });

      const campaign2 = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });

      const result1 = processor1.process(campaign1, campaign1.currentDate);
      const result2 = processor2.process(campaign2, campaign2.currentDate);

      expect(result1.events.length).toBe(result2.events.length);
      if (result1.events.length > 0 && result2.events.length > 0) {
        expect(result1.events[0].data?.scenarioType).toBe(result2.events[0].data?.scenarioType);
        expect(result1.events[0].data?.opForBV).toBe(result2.events[0].data?.opForBV);
      }
    });

    it('should produce different results with different random seeds', () => {
      const processor1 = createScenarioGenerationProcessor(createConstantRandom(0.3));
      const processor2 = createScenarioGenerationProcessor(createConstantRandom(0.99));

      const campaign1 = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });

      const campaign2 = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });

      const result1 = processor1.process(campaign1, campaign1.currentDate);
      const result2 = processor2.process(campaign2, campaign2.currentDate);

      expect(result1.events.length).not.toBe(result2.events.length);
    });
  });

  describe('campaign state preservation', () => {
    it('should return unchanged campaign when no scenarios generated', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: false },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.campaign).toEqual(campaign);
    });

    it('should return campaign in result', () => {
      const campaign = createMockCampaign({
        currentDate: new Date('2025-01-27'),
        options: { ...createMockCampaign().options, useAtBScenarios: true },
        combatTeams: [createMockTeam()],
        missions: new Map([['contract-001', createMockContract()]]),
      });
      const result = scenarioGenerationProcessor.process(campaign, campaign.currentDate);
      expect(result.campaign).toBeDefined();
      expect(result.campaign.id).toBe(campaign.id);
    });
  });
});
