/**
 * Campaign Instance Interfaces Tests
 */

import {
  ICampaignUnitInstance,
  ICampaignPilotInstance,
  IUnitDamageState,
  ILocationDamageState,
  ComponentStatus,
  isCampaignUnitInstance,
  isCampaignPilotInstance,
  isUnitDamageState,
  createEmptyDamageState,
  createUnitInstance,
  createPilotInstanceFromVault,
  createPilotInstanceFromStatblock,
  calculateDamagePercentage,
  determineUnitStatus,
  isPilotAvailable,
  isUnitAvailable,
} from '../CampaignInstanceInterfaces';
import { CampaignUnitStatus, CampaignPilotStatus } from '../CampaignInterfaces';

// =============================================================================
// Test Data Factories
// =============================================================================

function createTestLocationDamage(
  overrides: Partial<ILocationDamageState> = {},
): ILocationDamageState {
  return {
    location: 'center_torso',
    armorCurrent: 40,
    armorMax: 40,
    structureCurrent: 20,
    structureMax: 20,
    components: [],
    ...overrides,
  };
}

function createTestDamageState(
  overrides: Partial<IUnitDamageState> = {},
): IUnitDamageState {
  return {
    locations: [
      createTestLocationDamage({ location: 'center_torso' }),
      createTestLocationDamage({ location: 'left_torso' }),
      createTestLocationDamage({ location: 'right_torso' }),
    ],
    ammoExpended: {},
    currentHeat: 0,
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupportHits: 0,
    isImmobilized: false,
    ...overrides,
  };
}

function createTestUnitInstance(
  overrides: Partial<ICampaignUnitInstance> = {},
): ICampaignUnitInstance {
  const now = new Date().toISOString();
  return {
    id: 'unit-instance-1',
    campaignId: 'campaign-1',
    vaultUnitId: 'vault-unit-1',
    vaultUnitVersion: 1,
    unitName: 'Atlas AS7-D',
    unitChassis: 'Atlas',
    unitVariant: 'AS7-D',
    status: CampaignUnitStatus.Operational,
    damageState: createTestDamageState(),
    totalKills: 0,
    missionsParticipated: 0,
    estimatedRepairCost: 0,
    estimatedRepairTime: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createTestPilotInstance(
  overrides: Partial<ICampaignPilotInstance> = {},
): ICampaignPilotInstance {
  const now = new Date().toISOString();
  return {
    id: 'pilot-instance-1',
    campaignId: 'campaign-1',
    vaultPilotId: 'vault-pilot-1',
    statblockData: null,
    pilotName: 'John Doe',
    pilotCallsign: 'Maverick',
    status: CampaignPilotStatus.Active,
    currentSkills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    currentXP: 0,
    campaignXPEarned: 0,
    killCount: 0,
    missionsParticipated: 0,
    recoveryTime: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// =============================================================================
// Enum Tests
// =============================================================================

describe('ComponentStatus Enum', () => {
  it('should have all expected values', () => {
    expect(ComponentStatus.Operational).toBe('operational');
    expect(ComponentStatus.Damaged).toBe('damaged');
    expect(ComponentStatus.Destroyed).toBe('destroyed');
  });
});

// =============================================================================
// Type Guard Tests
// =============================================================================

describe('isCampaignUnitInstance', () => {
  it('should return true for valid unit instance', () => {
    const instance = createTestUnitInstance();
    expect(isCampaignUnitInstance(instance)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isCampaignUnitInstance(null)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isCampaignUnitInstance('string')).toBe(false);
    expect(isCampaignUnitInstance(123)).toBe(false);
    expect(isCampaignUnitInstance(undefined)).toBe(false);
  });

  it('should return false for object missing required fields', () => {
    expect(isCampaignUnitInstance({ id: 'test' })).toBe(false);
    expect(
      isCampaignUnitInstance({
        id: 'test',
        campaignId: 'campaign-1',
        vaultUnitId: 'vault-1',
      }),
    ).toBe(false);
  });

  it('should return false if vaultUnitVersion is not a number', () => {
    const instance = {
      ...createTestUnitInstance(),
      vaultUnitVersion: 'not-a-number',
    };
    expect(isCampaignUnitInstance(instance)).toBe(false);
  });
});

describe('isCampaignPilotInstance', () => {
  it('should return true for valid vault pilot instance', () => {
    const instance = createTestPilotInstance();
    expect(isCampaignPilotInstance(instance)).toBe(true);
  });

  it('should return true for valid statblock pilot instance', () => {
    const instance = createTestPilotInstance({
      vaultPilotId: null,
      statblockData: { name: 'NPC Pilot', gunnery: 4, piloting: 5 },
    });
    expect(isCampaignPilotInstance(instance)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isCampaignPilotInstance(null)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isCampaignPilotInstance('string')).toBe(false);
  });

  it('should return false if both vaultPilotId and statblockData are set', () => {
    const instance = {
      ...createTestPilotInstance(),
      vaultPilotId: 'vault-pilot-1',
      statblockData: { name: 'NPC', gunnery: 4, piloting: 5 },
    };
    expect(isCampaignPilotInstance(instance)).toBe(false);
  });

  it('should return false if both vaultPilotId and statblockData are null', () => {
    const instance = {
      ...createTestPilotInstance(),
      vaultPilotId: null,
      statblockData: null,
    };
    expect(isCampaignPilotInstance(instance)).toBe(false);
  });
});

describe('isUnitDamageState', () => {
  it('should return true for valid damage state', () => {
    const state = createTestDamageState();
    expect(isUnitDamageState(state)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isUnitDamageState(null)).toBe(false);
  });

  it('should return false for object missing locations array', () => {
    expect(isUnitDamageState({ ammoExpended: {} })).toBe(false);
  });
});

// =============================================================================
// Factory Function Tests
// =============================================================================

describe('createEmptyDamageState', () => {
  it('should create a pristine damage state', () => {
    const state = createEmptyDamageState();
    expect(state.locations).toHaveLength(0);
    expect(state.ammoExpended).toEqual({});
    expect(state.currentHeat).toBe(0);
    expect(state.engineHits).toBe(0);
    expect(state.gyroHits).toBe(0);
    expect(state.sensorHits).toBe(0);
    expect(state.lifeSupportHits).toBe(0);
    expect(state.isImmobilized).toBe(false);
  });
});

describe('createUnitInstance', () => {
  it('should create a unit instance with correct properties', () => {
    const damageState = createEmptyDamageState();
    const instance = createUnitInstance(
      'inst-1',
      'camp-1',
      'vault-1',
      3,
      'Marauder MAD-3R',
      'Marauder',
      'MAD-3R',
      damageState,
    );

    expect(instance.id).toBe('inst-1');
    expect(instance.campaignId).toBe('camp-1');
    expect(instance.vaultUnitId).toBe('vault-1');
    expect(instance.vaultUnitVersion).toBe(3);
    expect(instance.unitName).toBe('Marauder MAD-3R');
    expect(instance.unitChassis).toBe('Marauder');
    expect(instance.unitVariant).toBe('MAD-3R');
    expect(instance.status).toBe(CampaignUnitStatus.Operational);
    expect(instance.damageState).toBe(damageState);
    expect(instance.totalKills).toBe(0);
    expect(instance.missionsParticipated).toBe(0);
    expect(instance.estimatedRepairCost).toBe(0);
    expect(instance.estimatedRepairTime).toBe(0);
    expect(instance.createdAt).toBeTruthy();
    expect(instance.updatedAt).toBeTruthy();
  });
});

describe('createPilotInstanceFromVault', () => {
  it('should create a pilot instance from vault pilot', () => {
    const instance = createPilotInstanceFromVault(
      'pilot-inst-1',
      'camp-1',
      'vault-pilot-1',
      'Jane Smith',
      'Viper',
      { gunnery: 3, piloting: 4 },
    );

    expect(instance.id).toBe('pilot-inst-1');
    expect(instance.campaignId).toBe('camp-1');
    expect(instance.vaultPilotId).toBe('vault-pilot-1');
    expect(instance.statblockData).toBeNull();
    expect(instance.pilotName).toBe('Jane Smith');
    expect(instance.pilotCallsign).toBe('Viper');
    expect(instance.status).toBe(CampaignPilotStatus.Active);
    expect(instance.currentSkills).toEqual({ gunnery: 3, piloting: 4 });
    expect(instance.wounds).toBe(0);
    expect(instance.currentXP).toBe(0);
    expect(instance.campaignXPEarned).toBe(0);
    expect(instance.killCount).toBe(0);
    expect(instance.missionsParticipated).toBe(0);
    expect(instance.recoveryTime).toBe(0);
  });

  it('should handle undefined callsign', () => {
    const instance = createPilotInstanceFromVault(
      'pilot-inst-1',
      'camp-1',
      'vault-pilot-1',
      'Jane Smith',
      undefined,
      { gunnery: 3, piloting: 4 },
    );

    expect(instance.pilotCallsign).toBeUndefined();
  });
});

describe('createPilotInstanceFromStatblock', () => {
  it('should create a pilot instance from statblock', () => {
    const statblock = {
      name: 'Generic MechWarrior',
      gunnery: 4,
      piloting: 5,
    };
    const instance = createPilotInstanceFromStatblock(
      'pilot-inst-2',
      'camp-1',
      statblock,
    );

    expect(instance.id).toBe('pilot-inst-2');
    expect(instance.campaignId).toBe('camp-1');
    expect(instance.vaultPilotId).toBeNull();
    expect(instance.statblockData).toBe(statblock);
    expect(instance.pilotName).toBe('Generic MechWarrior');
    expect(instance.pilotCallsign).toBeUndefined();
    expect(instance.status).toBe(CampaignPilotStatus.Active);
    expect(instance.currentSkills).toEqual({ gunnery: 4, piloting: 5 });
  });

  it('should include abilities from statblock', () => {
    const statblock = {
      name: 'Elite Pilot',
      gunnery: 2,
      piloting: 3,
      abilityIds: ['marksman', 'mech_melee_specialist'],
    };
    const instance = createPilotInstanceFromStatblock(
      'pilot-inst-3',
      'camp-1',
      statblock,
    );

    expect(instance.statblockData?.abilityIds).toEqual([
      'marksman',
      'mech_melee_specialist',
    ]);
  });
});

// =============================================================================
// Damage Calculation Tests
// =============================================================================

describe('calculateDamagePercentage', () => {
  it('should return 0 for empty locations', () => {
    const state = createEmptyDamageState();
    expect(calculateDamagePercentage(state)).toBe(0);
  });

  it('should return 0 for undamaged unit', () => {
    const state = createTestDamageState();
    expect(calculateDamagePercentage(state)).toBe(0);
  });

  it('should calculate damage percentage correctly', () => {
    const state = createTestDamageState({
      locations: [
        createTestLocationDamage({
          location: 'center_torso',
          armorCurrent: 20, // 50% armor damage
          armorMax: 40,
          structureCurrent: 20,
          structureMax: 20,
        }),
      ],
    });
    // Total: 40 armor + 20 structure = 60 max
    // Damage: 20 armor damage = 20
    // Percentage: 20/60 = 33.33... -> rounded to 33%
    expect(calculateDamagePercentage(state)).toBe(33);
  });

  it('should include rear armor in calculation', () => {
    const state = createTestDamageState({
      locations: [
        createTestLocationDamage({
          location: 'center_torso',
          armorCurrent: 40,
          armorMax: 40,
          rearArmorCurrent: 10, // 50% rear armor damage
          rearArmorMax: 20,
          structureCurrent: 20,
          structureMax: 20,
        }),
      ],
    });
    // Total: 40 front + 20 rear + 20 structure = 80 max
    // Damage: 10 rear armor damage = 10
    // Percentage: 10/80 = 12.5% -> rounded to 13%
    expect(calculateDamagePercentage(state)).toBe(13);
  });

  it('should return 100 for fully destroyed unit', () => {
    const state = createTestDamageState({
      locations: [
        createTestLocationDamage({
          location: 'center_torso',
          armorCurrent: 0,
          armorMax: 40,
          structureCurrent: 0,
          structureMax: 20,
        }),
      ],
    });
    expect(calculateDamagePercentage(state)).toBe(100);
  });
});

describe('determineUnitStatus', () => {
  it('should return Operational for undamaged unit', () => {
    const state = createTestDamageState();
    expect(determineUnitStatus(state)).toBe(CampaignUnitStatus.Operational);
  });

  it('should return Damaged for unit with armor damage only', () => {
    const state = createTestDamageState({
      locations: [
        createTestLocationDamage({
          armorCurrent: 20, // Half armor gone
          armorMax: 40,
          structureCurrent: 20,
          structureMax: 20,
        }),
      ],
    });
    expect(determineUnitStatus(state)).toBe(CampaignUnitStatus.Damaged);
  });

  it('should return Destroyed if any location has 0 structure', () => {
    const state = createTestDamageState({
      locations: [
        createTestLocationDamage({
          location: 'center_torso',
          structureCurrent: 0,
          structureMax: 20,
        }),
      ],
    });
    expect(determineUnitStatus(state)).toBe(CampaignUnitStatus.Destroyed);
  });
});

// =============================================================================
// Availability Tests
// =============================================================================

describe('isPilotAvailable', () => {
  it('should return true for active pilot with no recovery and no assignment', () => {
    const instance = createTestPilotInstance({
      status: CampaignPilotStatus.Active,
      recoveryTime: 0,
      assignedUnitInstanceId: undefined,
    });
    expect(isPilotAvailable(instance)).toBe(true);
  });

  it('should return false for wounded pilot', () => {
    const instance = createTestPilotInstance({
      status: CampaignPilotStatus.Wounded,
    });
    expect(isPilotAvailable(instance)).toBe(false);
  });

  it('should return false for pilot in recovery', () => {
    const instance = createTestPilotInstance({
      status: CampaignPilotStatus.Active,
      recoveryTime: 5,
    });
    expect(isPilotAvailable(instance)).toBe(false);
  });

  it('should return false for assigned pilot', () => {
    const instance = createTestPilotInstance({
      status: CampaignPilotStatus.Active,
      recoveryTime: 0,
      assignedUnitInstanceId: 'unit-instance-1',
    });
    expect(isPilotAvailable(instance)).toBe(false);
  });

  it('should return false for KIA pilot', () => {
    const instance = createTestPilotInstance({
      status: CampaignPilotStatus.KIA,
    });
    expect(isPilotAvailable(instance)).toBe(false);
  });
});

describe('isUnitAvailable', () => {
  it('should return true for operational unit', () => {
    const instance = createTestUnitInstance({
      status: CampaignUnitStatus.Operational,
    });
    expect(isUnitAvailable(instance)).toBe(true);
  });

  it('should return true for damaged unit', () => {
    const instance = createTestUnitInstance({
      status: CampaignUnitStatus.Damaged,
    });
    expect(isUnitAvailable(instance)).toBe(true);
  });

  it('should return false for destroyed unit', () => {
    const instance = createTestUnitInstance({
      status: CampaignUnitStatus.Destroyed,
    });
    expect(isUnitAvailable(instance)).toBe(false);
  });

  it('should return false for repairing unit', () => {
    const instance = createTestUnitInstance({
      status: CampaignUnitStatus.Repairing,
    });
    expect(isUnitAvailable(instance)).toBe(false);
  });

  it('should return false for salvage unit', () => {
    const instance = createTestUnitInstance({
      status: CampaignUnitStatus.Salvage,
    });
    expect(isUnitAvailable(instance)).toBe(false);
  });
});

// =============================================================================
// Interface Structure Tests
// =============================================================================

describe('ICampaignUnitInstance structure', () => {
  it('should have all required properties', () => {
    const instance = createTestUnitInstance();

    // Core identifiers
    expect(instance).toHaveProperty('id');
    expect(instance).toHaveProperty('campaignId');
    expect(instance).toHaveProperty('vaultUnitId');
    expect(instance).toHaveProperty('vaultUnitVersion');

    // Display properties
    expect(instance).toHaveProperty('unitName');
    expect(instance).toHaveProperty('unitChassis');
    expect(instance).toHaveProperty('unitVariant');

    // State properties
    expect(instance).toHaveProperty('status');
    expect(instance).toHaveProperty('damageState');

    // Campaign stats
    expect(instance).toHaveProperty('totalKills');
    expect(instance).toHaveProperty('missionsParticipated');

    // Repair estimates
    expect(instance).toHaveProperty('estimatedRepairCost');
    expect(instance).toHaveProperty('estimatedRepairTime');

    // Timestamps
    expect(instance).toHaveProperty('createdAt');
    expect(instance).toHaveProperty('updatedAt');
  });

  it('should have optional properties', () => {
    const instance = createTestUnitInstance({
      assignedPilotInstanceId: 'pilot-1',
      forceId: 'force-1',
      forceSlot: 2,
      notes: 'Test notes',
    });

    expect(instance.assignedPilotInstanceId).toBe('pilot-1');
    expect(instance.forceId).toBe('force-1');
    expect(instance.forceSlot).toBe(2);
    expect(instance.notes).toBe('Test notes');
  });
});

describe('ICampaignPilotInstance structure', () => {
  it('should have all required properties', () => {
    const instance = createTestPilotInstance();

    // Core identifiers
    expect(instance).toHaveProperty('id');
    expect(instance).toHaveProperty('campaignId');

    // Source (XOR relationship)
    expect(instance).toHaveProperty('vaultPilotId');
    expect(instance).toHaveProperty('statblockData');

    // Display properties
    expect(instance).toHaveProperty('pilotName');

    // State properties
    expect(instance).toHaveProperty('status');
    expect(instance).toHaveProperty('currentSkills');
    expect(instance).toHaveProperty('wounds');

    // Campaign progression
    expect(instance).toHaveProperty('currentXP');
    expect(instance).toHaveProperty('campaignXPEarned');
    expect(instance).toHaveProperty('killCount');
    expect(instance).toHaveProperty('missionsParticipated');
    expect(instance).toHaveProperty('recoveryTime');

    // Timestamps
    expect(instance).toHaveProperty('createdAt');
    expect(instance).toHaveProperty('updatedAt');
  });
});
