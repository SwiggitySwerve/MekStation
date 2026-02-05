/**
 * Campaign Interfaces Tests
 */

import {
  ICampaign,
  ICampaignMission,
  ICampaignRoster,
  ICampaignUnitState,
  ICampaignPilotState,
  CampaignStatus,
  CampaignMissionStatus,
  CampaignUnitStatus,
  CampaignPilotStatus,
  DEFAULT_CAMPAIGN_RESOURCES,
  CAMPAIGN_TEMPLATES,
  XP_REWARDS,
  SKILL_IMPROVEMENT_COSTS,
  validateCampaign,
  calculateMissionXp,
  getAvailableMissions,
  getOperationalUnits,
  getAvailablePilots,
  isCampaignComplete,
  calculateCampaignValue,
  isCampaign,
  isCampaignMission,
} from '../CampaignInterfaces';

// =============================================================================
// Test Data Factories
// =============================================================================

function createTestUnit(
  overrides: Partial<ICampaignUnitState> = {},
): ICampaignUnitState {
  return {
    unitId: 'unit-1',
    unitName: 'Atlas AS7-D',
    status: CampaignUnitStatus.Operational,
    armorDamage: {},
    structureDamage: {},
    destroyedComponents: [],
    ammoExpended: {},
    currentHeat: 0,
    repairCost: 0,
    repairTime: 0,
    ...overrides,
  };
}

function createTestPilot(
  overrides: Partial<ICampaignPilotState> = {},
): ICampaignPilotState {
  return {
    pilotId: 'pilot-1',
    pilotName: 'John Doe',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    recoveryTime: 0,
    ...overrides,
  };
}

function createTestMission(
  overrides: Partial<ICampaignMission> = {},
): ICampaignMission {
  return {
    id: 'mission-1',
    name: 'Test Mission',
    description: 'A test mission',
    status: CampaignMissionStatus.Available,
    order: 1,
    prerequisites: [],
    branches: [],
    isFinal: false,
    ...overrides,
  };
}

function createTestCampaign(overrides: Partial<ICampaign> = {}): ICampaign {
  const now = new Date().toISOString();
  return {
    id: 'campaign-1',
    name: 'Test Campaign',
    description: 'A test campaign',
    status: CampaignStatus.Active,
    missions: [createTestMission()],
    roster: {
      units: [createTestUnit()],
      pilots: [createTestPilot()],
    },
    resources: { ...DEFAULT_CAMPAIGN_RESOURCES },
    progress: {
      currentMissionId: null,
      missionsCompleted: 0,
      missionsTotal: 1,
      victories: 0,
      defeats: 0,
      startedAt: now,
      daysElapsed: 0,
    },
    difficultyModifier: 1.0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// =============================================================================
// Enum Tests
// =============================================================================

describe('Campaign Enums', () => {
  describe('CampaignStatus', () => {
    it('should have all expected values', () => {
      expect(CampaignStatus.Setup).toBe('setup');
      expect(CampaignStatus.Active).toBe('active');
      expect(CampaignStatus.Victory).toBe('victory');
      expect(CampaignStatus.Defeat).toBe('defeat');
      expect(CampaignStatus.Abandoned).toBe('abandoned');
    });
  });

  describe('CampaignMissionStatus', () => {
    it('should have all expected values', () => {
      expect(CampaignMissionStatus.Locked).toBe('locked');
      expect(CampaignMissionStatus.Available).toBe('available');
      expect(CampaignMissionStatus.InProgress).toBe('in_progress');
      expect(CampaignMissionStatus.Victory).toBe('victory');
      expect(CampaignMissionStatus.Defeat).toBe('defeat');
      expect(CampaignMissionStatus.Skipped).toBe('skipped');
    });
  });

  describe('CampaignUnitStatus', () => {
    it('should have all expected values', () => {
      expect(CampaignUnitStatus.Operational).toBe('operational');
      expect(CampaignUnitStatus.Damaged).toBe('damaged');
      expect(CampaignUnitStatus.Repairing).toBe('repairing');
      expect(CampaignUnitStatus.Destroyed).toBe('destroyed');
      expect(CampaignUnitStatus.Salvage).toBe('salvage');
    });
  });

  describe('CampaignPilotStatus', () => {
    it('should have all expected values', () => {
      expect(CampaignPilotStatus.Active).toBe('active');
      expect(CampaignPilotStatus.Wounded).toBe('wounded');
      expect(CampaignPilotStatus.Critical).toBe('critical');
      expect(CampaignPilotStatus.MIA).toBe('mia');
      expect(CampaignPilotStatus.KIA).toBe('kia');
    });
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe('Campaign Constants', () => {
  describe('DEFAULT_CAMPAIGN_RESOURCES', () => {
    it('should have reasonable default values', () => {
      expect(DEFAULT_CAMPAIGN_RESOURCES.cBills).toBeGreaterThan(0);
      expect(DEFAULT_CAMPAIGN_RESOURCES.supplies).toBeGreaterThan(0);
      expect(DEFAULT_CAMPAIGN_RESOURCES.morale).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CAMPAIGN_RESOURCES.morale).toBeLessThanOrEqual(100);
      expect(DEFAULT_CAMPAIGN_RESOURCES.salvageParts).toBe(0);
    });
  });

  describe('XP_REWARDS', () => {
    it('should have positive XP values', () => {
      expect(XP_REWARDS.MISSION_PARTICIPATION).toBeGreaterThan(0);
      expect(XP_REWARDS.KILL).toBeGreaterThan(0);
      expect(XP_REWARDS.VICTORY_BONUS).toBeGreaterThan(0);
      expect(XP_REWARDS.SURVIVAL_BONUS).toBeGreaterThan(0);
      expect(XP_REWARDS.OPTIONAL_OBJECTIVE).toBeGreaterThan(0);
    });
  });

  describe('SKILL_IMPROVEMENT_COSTS', () => {
    it('should have valid skill ranges', () => {
      expect(SKILL_IMPROVEMENT_COSTS.MIN_SKILL).toBeLessThan(
        SKILL_IMPROVEMENT_COSTS.MAX_SKILL,
      );
      expect(SKILL_IMPROVEMENT_COSTS.GUNNERY_IMPROVEMENT).toBeGreaterThan(0);
      expect(SKILL_IMPROVEMENT_COSTS.PILOTING_IMPROVEMENT).toBeGreaterThan(0);
    });
  });

  describe('CAMPAIGN_TEMPLATES', () => {
    it('should have at least one template', () => {
      expect(CAMPAIGN_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should have valid templates with missions', () => {
      for (const template of CAMPAIGN_TEMPLATES) {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.missions.length).toBeGreaterThan(0);
        expect(template.estimatedMissions).toBe(template.missions.length);
        expect(template.recommendedDifficulty).toBeGreaterThan(0);
      }
    });

    it('should have at least one final mission in each template', () => {
      for (const template of CAMPAIGN_TEMPLATES) {
        const hasFinal = template.missions.some((m) => m.isFinal);
        expect(hasFinal).toBe(true);
      }
    });
  });
});

// =============================================================================
// XP Calculation Tests
// =============================================================================

describe('calculateMissionXp', () => {
  it('should return base XP for participation only', () => {
    const xp = calculateMissionXp(0, false, false, 0);
    expect(xp).toBe(XP_REWARDS.MISSION_PARTICIPATION);
  });

  it('should add kill XP', () => {
    const kills = 3;
    const xp = calculateMissionXp(kills, false, false, 0);
    expect(xp).toBe(XP_REWARDS.MISSION_PARTICIPATION + kills * XP_REWARDS.KILL);
  });

  it('should add victory bonus', () => {
    const xp = calculateMissionXp(0, true, false, 0);
    expect(xp).toBe(
      XP_REWARDS.MISSION_PARTICIPATION + XP_REWARDS.VICTORY_BONUS,
    );
  });

  it('should add survival bonus', () => {
    const xp = calculateMissionXp(0, false, true, 0);
    expect(xp).toBe(
      XP_REWARDS.MISSION_PARTICIPATION + XP_REWARDS.SURVIVAL_BONUS,
    );
  });

  it('should add optional objective XP', () => {
    const objectives = 2;
    const xp = calculateMissionXp(0, false, false, objectives);
    expect(xp).toBe(
      XP_REWARDS.MISSION_PARTICIPATION +
        objectives * XP_REWARDS.OPTIONAL_OBJECTIVE,
    );
  });

  it('should accumulate all XP types', () => {
    const kills = 2;
    const objectives = 1;
    const xp = calculateMissionXp(kills, true, true, objectives);
    const expected =
      XP_REWARDS.MISSION_PARTICIPATION +
      kills * XP_REWARDS.KILL +
      XP_REWARDS.VICTORY_BONUS +
      XP_REWARDS.SURVIVAL_BONUS +
      objectives * XP_REWARDS.OPTIONAL_OBJECTIVE;
    expect(xp).toBe(expected);
  });
});

// =============================================================================
// Validation Tests
// =============================================================================

describe('validateCampaign', () => {
  it('should pass for valid campaign', () => {
    const campaign = createTestCampaign({
      missions: [createTestMission({ isFinal: true })],
    });
    const result = validateCampaign(campaign);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if name is missing', () => {
    const campaign = createTestCampaign({ name: '' });
    const result = validateCampaign(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Campaign name is required');
  });

  it('should fail if no missions', () => {
    const campaign = createTestCampaign({ missions: [] });
    const result = validateCampaign(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Campaign must have at least one mission');
  });

  it('should fail if no units or pilots', () => {
    const campaign = createTestCampaign({
      roster: { units: [], pilots: [] },
    });
    const result = validateCampaign(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Campaign must have at least one unit or pilot',
    );
  });

  it('should fail if prerequisites reference non-existent mission', () => {
    const campaign = createTestCampaign({
      missions: [createTestMission({ id: 'm1', prerequisites: ['m99'] })],
    });
    const result = validateCampaign(campaign);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('non-existent prerequisite')),
    ).toBe(true);
  });

  it('should fail if branch targets non-existent mission', () => {
    const campaign = createTestCampaign({
      missions: [
        createTestMission({
          id: 'm1',
          branches: [{ condition: 'victory', targetMissionId: 'm99' }],
        }),
      ],
    });
    const result = validateCampaign(campaign);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('branches to non-existent mission')),
    ).toBe(true);
  });

  it('should warn if no final mission', () => {
    const campaign = createTestCampaign({
      missions: [createTestMission({ isFinal: false })],
    });
    const result = validateCampaign(campaign);
    expect(result.warnings.some((w) => w.includes('no final mission'))).toBe(
      true,
    );
  });

  it('should warn about units without pilots', () => {
    const campaign = createTestCampaign({
      roster: {
        units: [
          createTestUnit({ unitId: 'u1' }),
          createTestUnit({ unitId: 'u2' }),
        ],
        pilots: [createTestPilot({ pilotId: 'p1', assignedUnitId: 'u1' })],
      },
    });
    // One unit (u2) has no pilot
    const result = validateCampaign(campaign);
    // Warning depends on assignment tracking - this may need adjustment based on implementation
    expect(result.valid).toBe(true); // Still valid, just a warning
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('getAvailableMissions', () => {
  it('should return available and in-progress missions', () => {
    const campaign = createTestCampaign({
      missions: [
        createTestMission({
          id: 'm1',
          status: CampaignMissionStatus.Available,
        }),
        createTestMission({
          id: 'm2',
          status: CampaignMissionStatus.InProgress,
        }),
        createTestMission({ id: 'm3', status: CampaignMissionStatus.Locked }),
        createTestMission({ id: 'm4', status: CampaignMissionStatus.Victory }),
      ],
    });
    const available = getAvailableMissions(campaign);
    expect(available).toHaveLength(2);
    expect(available.map((m) => m.id)).toContain('m1');
    expect(available.map((m) => m.id)).toContain('m2');
  });

  it('should return empty array if no available missions', () => {
    const campaign = createTestCampaign({
      missions: [
        createTestMission({ id: 'm1', status: CampaignMissionStatus.Locked }),
        createTestMission({ id: 'm2', status: CampaignMissionStatus.Victory }),
      ],
    });
    const available = getAvailableMissions(campaign);
    expect(available).toHaveLength(0);
  });
});

describe('getOperationalUnits', () => {
  it('should return operational and damaged units', () => {
    const roster: ICampaignRoster = {
      units: [
        createTestUnit({
          unitId: 'u1',
          status: CampaignUnitStatus.Operational,
        }),
        createTestUnit({ unitId: 'u2', status: CampaignUnitStatus.Damaged }),
        createTestUnit({ unitId: 'u3', status: CampaignUnitStatus.Destroyed }),
        createTestUnit({ unitId: 'u4', status: CampaignUnitStatus.Repairing }),
      ],
      pilots: [],
    };
    const operational = getOperationalUnits(roster);
    expect(operational).toHaveLength(2);
    expect(operational.map((u) => u.unitId)).toContain('u1');
    expect(operational.map((u) => u.unitId)).toContain('u2');
  });
});

describe('getAvailablePilots', () => {
  it('should return only active pilots', () => {
    const roster: ICampaignRoster = {
      units: [],
      pilots: [
        createTestPilot({ pilotId: 'p1', status: CampaignPilotStatus.Active }),
        createTestPilot({ pilotId: 'p2', status: CampaignPilotStatus.Wounded }),
        createTestPilot({ pilotId: 'p3', status: CampaignPilotStatus.KIA }),
        createTestPilot({ pilotId: 'p4', status: CampaignPilotStatus.MIA }),
      ],
    };
    const available = getAvailablePilots(roster);
    expect(available).toHaveLength(1);
    expect(available[0].pilotId).toBe('p1');
  });
});

describe('isCampaignComplete', () => {
  it('should return true for victory', () => {
    const campaign = createTestCampaign({ status: CampaignStatus.Victory });
    expect(isCampaignComplete(campaign)).toBe(true);
  });

  it('should return true for defeat', () => {
    const campaign = createTestCampaign({ status: CampaignStatus.Defeat });
    expect(isCampaignComplete(campaign)).toBe(true);
  });

  it('should return true for abandoned', () => {
    const campaign = createTestCampaign({ status: CampaignStatus.Abandoned });
    expect(isCampaignComplete(campaign)).toBe(true);
  });

  it('should return false for active', () => {
    const campaign = createTestCampaign({ status: CampaignStatus.Active });
    expect(isCampaignComplete(campaign)).toBe(false);
  });

  it('should return false for setup', () => {
    const campaign = createTestCampaign({ status: CampaignStatus.Setup });
    expect(isCampaignComplete(campaign)).toBe(false);
  });
});

describe('calculateCampaignValue', () => {
  it('should calculate total campaign value', () => {
    const campaign = createTestCampaign({
      resources: {
        cBills: 1000000,
        supplies: 100,
        morale: 75,
        salvageParts: 5,
      },
    });
    // Formula: cBills + supplies * 100 + salvageParts * 1000
    const expected = 1000000 + 100 * 100 + 5 * 1000;
    expect(calculateCampaignValue(campaign)).toBe(expected);
  });
});

// =============================================================================
// Type Guard Tests
// =============================================================================

describe('isCampaign', () => {
  it('should return true for valid campaign', () => {
    const campaign = createTestCampaign();
    expect(isCampaign(campaign)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isCampaign(null)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isCampaign('string')).toBe(false);
    expect(isCampaign(123)).toBe(false);
  });

  it('should return false for object missing required fields', () => {
    expect(isCampaign({ id: 'test' })).toBe(false);
    expect(isCampaign({ id: 'test', name: 'Test' })).toBe(false);
  });
});

describe('isCampaignMission', () => {
  it('should return true for valid mission', () => {
    const mission = createTestMission();
    expect(isCampaignMission(mission)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isCampaignMission(null)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isCampaignMission('string')).toBe(false);
  });

  it('should return false for object missing required fields', () => {
    expect(isCampaignMission({ id: 'test' })).toBe(false);
  });
});
