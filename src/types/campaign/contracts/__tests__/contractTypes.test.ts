/**
 * Tests for contract types, definitions, and clause levels
 *
 * @module campaign/contracts/__tests__/contractTypes
 */

import { CombatRole } from '@/types/campaign/scenario/scenarioTypes';

import {
  AtBContractType,
  ContractClauseType,
  CONTRACT_TYPE_DEFINITIONS,
  CLAUSE_LEVELS,
  getContractTypesByGroup,
  getOpsTempo,
  getContractDuration,
  getAvailableContractTypes,
  isAtBContractType,
  isContractClauseType,
} from '../contractTypes';

describe('AtBContractType Enum', () => {
  it('should have exactly 19 contract types', () => {
    const types = Object.values(AtBContractType);
    expect(types).toHaveLength(19);
  });

  it('should have 5 garrison types', () => {
    const garrisonTypes = [
      AtBContractType.GARRISON_DUTY,
      AtBContractType.CADRE_DUTY,
      AtBContractType.SECURITY_DUTY,
      AtBContractType.RIOT_DUTY,
      AtBContractType.RETAINER,
    ];
    expect(garrisonTypes).toHaveLength(5);
    garrisonTypes.forEach((type) => {
      expect(Object.values(AtBContractType)).toContain(type);
    });
  });

  it('should have 6 raid types', () => {
    const raidTypes = [
      AtBContractType.DIVERSIONARY_RAID,
      AtBContractType.OBJECTIVE_RAID,
      AtBContractType.RECON_RAID,
      AtBContractType.EXTRACTION_RAID,
      AtBContractType.ASSASSINATION,
      AtBContractType.OBSERVATION_RAID,
    ];
    expect(raidTypes).toHaveLength(6);
    raidTypes.forEach((type) => {
      expect(Object.values(AtBContractType)).toContain(type);
    });
  });

  it('should have 4 guerrilla types including terrorism', () => {
    const guerrillaTypes = [
      AtBContractType.GUERRILLA_WARFARE,
      AtBContractType.ESPIONAGE,
      AtBContractType.SABOTAGE,
      AtBContractType.TERRORISM,
    ];
    expect(guerrillaTypes).toHaveLength(4);
    guerrillaTypes.forEach((type) => {
      expect(Object.values(AtBContractType)).toContain(type);
    });
  });

  it('should have 4 special types', () => {
    const specialTypes = [
      AtBContractType.PLANETARY_ASSAULT,
      AtBContractType.RELIEF_DUTY,
      AtBContractType.PIRATE_HUNTING,
      AtBContractType.MOLE_HUNTING,
    ];
    expect(specialTypes).toHaveLength(4);
    specialTypes.forEach((type) => {
      expect(Object.values(AtBContractType)).toContain(type);
    });
  });

  it('should use lowercase with underscores for enum values', () => {
    Object.values(AtBContractType).forEach((value) => {
      expect(value).toMatch(/^[a-z_]+$/);
    });
  });
});

describe('CONTRACT_TYPE_DEFINITIONS', () => {
  it('should have an entry for every contract type', () => {
    Object.values(AtBContractType).forEach((type) => {
      expect(CONTRACT_TYPE_DEFINITIONS[type]).toBeDefined();
    });
  });

  it('should have exactly 19 definitions', () => {
    const definitions = Object.keys(CONTRACT_TYPE_DEFINITIONS);
    expect(definitions).toHaveLength(19);
  });

  it('should define all garrison types correctly', () => {
    const garrisonDef =
      CONTRACT_TYPE_DEFINITIONS[AtBContractType.GARRISON_DUTY];
    expect(garrisonDef.name).toBe('Garrison Duty');
    expect(garrisonDef.group).toBe('garrison');
    expect(garrisonDef.durationMonths).toBe(18);
    expect(garrisonDef.opsTempo.min).toBe(1.0);
    expect(garrisonDef.opsTempo.max).toBe(1.0);
    expect(garrisonDef.available).toBe(true);
  });

  it('should define cadre duty with 0.8 ops tempo', () => {
    const cadreDef = CONTRACT_TYPE_DEFINITIONS[AtBContractType.CADRE_DUTY];
    expect(cadreDef.opsTempo.min).toBe(0.8);
    expect(cadreDef.opsTempo.max).toBe(0.8);
    expect(cadreDef.durationMonths).toBe(12);
  });

  it('should define security duty with 1.2 ops tempo', () => {
    const securityDef =
      CONTRACT_TYPE_DEFINITIONS[AtBContractType.SECURITY_DUTY];
    expect(securityDef.opsTempo.min).toBe(1.2);
    expect(securityDef.opsTempo.max).toBe(1.2);
    expect(securityDef.durationMonths).toBe(6);
  });

  it('should define retainer with 1.3 ops tempo', () => {
    const retainerDef = CONTRACT_TYPE_DEFINITIONS[AtBContractType.RETAINER];
    expect(retainerDef.opsTempo.min).toBe(1.3);
    expect(retainerDef.opsTempo.max).toBe(1.3);
    expect(retainerDef.durationMonths).toBe(12);
  });

  it('should define raid types with 3-month duration', () => {
    const raidTypes = [
      AtBContractType.DIVERSIONARY_RAID,
      AtBContractType.OBJECTIVE_RAID,
      AtBContractType.RECON_RAID,
      AtBContractType.EXTRACTION_RAID,
      AtBContractType.ASSASSINATION,
      AtBContractType.OBSERVATION_RAID,
    ];
    raidTypes.forEach((type) => {
      const def = CONTRACT_TYPE_DEFINITIONS[type];
      expect(def.group).toBe('raid');
      expect(def.durationMonths).toBe(3);
    });
  });

  it('should define diversionary raid with 1.8 ops tempo', () => {
    const def = CONTRACT_TYPE_DEFINITIONS[AtBContractType.DIVERSIONARY_RAID];
    expect(def.opsTempo.min).toBe(1.8);
    expect(def.opsTempo.max).toBe(1.8);
  });

  it('should define objective raid with 1.6 ops tempo', () => {
    const def = CONTRACT_TYPE_DEFINITIONS[AtBContractType.OBJECTIVE_RAID];
    expect(def.opsTempo.min).toBe(1.6);
    expect(def.opsTempo.max).toBe(1.6);
  });

  it('should define assassination with 1.9 ops tempo', () => {
    const def = CONTRACT_TYPE_DEFINITIONS[AtBContractType.ASSASSINATION];
    expect(def.opsTempo.min).toBe(1.9);
    expect(def.opsTempo.max).toBe(1.9);
  });

  it('should define guerrilla warfare with 2.1 ops tempo and 24 months', () => {
    const def = CONTRACT_TYPE_DEFINITIONS[AtBContractType.GUERRILLA_WARFARE];
    expect(def.group).toBe('guerrilla');
    expect(def.opsTempo.min).toBe(2.1);
    expect(def.opsTempo.max).toBe(2.1);
    expect(def.durationMonths).toBe(24);
  });

  it('should define espionage with 2.4 ops tempo', () => {
    const def = CONTRACT_TYPE_DEFINITIONS[AtBContractType.ESPIONAGE];
    expect(def.opsTempo.min).toBe(2.4);
    expect(def.opsTempo.max).toBe(2.4);
    expect(def.durationMonths).toBe(12);
  });

  it('should define sabotage with 2.4 ops tempo and 24 months', () => {
    const def = CONTRACT_TYPE_DEFINITIONS[AtBContractType.SABOTAGE];
    expect(def.opsTempo.min).toBe(2.4);
    expect(def.opsTempo.max).toBe(2.4);
    expect(def.durationMonths).toBe(24);
  });

  it('should define terrorism with 1.9 ops tempo and 3 months', () => {
    const def = CONTRACT_TYPE_DEFINITIONS[AtBContractType.TERRORISM];
    expect(def.group).toBe('guerrilla');
    expect(def.opsTempo.min).toBe(1.9);
    expect(def.opsTempo.max).toBe(1.9);
    expect(def.durationMonths).toBe(3);
  });

  it('should define planetary assault with 1.5 ops tempo and 9 months', () => {
    const def = CONTRACT_TYPE_DEFINITIONS[AtBContractType.PLANETARY_ASSAULT];
    expect(def.group).toBe('special');
    expect(def.opsTempo.min).toBe(1.5);
    expect(def.opsTempo.max).toBe(1.5);
    expect(def.durationMonths).toBe(9);
  });

  it('should define relief duty with 1.4 ops tempo and 9 months', () => {
    const def = CONTRACT_TYPE_DEFINITIONS[AtBContractType.RELIEF_DUTY];
    expect(def.group).toBe('special');
    expect(def.opsTempo.min).toBe(1.4);
    expect(def.opsTempo.max).toBe(1.4);
    expect(def.durationMonths).toBe(9);
  });

  it('should define pirate hunting with 1.0 ops tempo and 6 months', () => {
    const def = CONTRACT_TYPE_DEFINITIONS[AtBContractType.PIRATE_HUNTING];
    expect(def.group).toBe('special');
    expect(def.opsTempo.min).toBe(1.0);
    expect(def.opsTempo.max).toBe(1.0);
    expect(def.durationMonths).toBe(6);
  });

  it('should define mole hunting with 1.2 ops tempo and 6 months', () => {
    const def = CONTRACT_TYPE_DEFINITIONS[AtBContractType.MOLE_HUNTING];
    expect(def.group).toBe('special');
    expect(def.opsTempo.min).toBe(1.2);
    expect(def.opsTempo.max).toBe(1.2);
    expect(def.durationMonths).toBe(6);
  });

  it('should have ops tempo range with min 0.8 and max 2.4', () => {
    let minTempo = Infinity;
    let maxTempo = -Infinity;

    Object.values(CONTRACT_TYPE_DEFINITIONS).forEach((def) => {
      minTempo = Math.min(minTempo, def.opsTempo.min);
      maxTempo = Math.max(maxTempo, def.opsTempo.max);
    });

    expect(minTempo).toBe(0.8);
    expect(maxTempo).toBe(2.4);
  });

  it('should have primary roles for each contract type', () => {
    Object.values(CONTRACT_TYPE_DEFINITIONS).forEach((def) => {
      expect(def.primaryRoles).toBeDefined();
      expect(Array.isArray(def.primaryRoles)).toBe(true);
      expect(def.primaryRoles.length).toBeGreaterThan(0);
      def.primaryRoles.forEach((role) => {
        expect(Object.values(CombatRole)).toContain(role);
      });
    });
  });

  it('should have all definitions marked as available', () => {
    Object.values(CONTRACT_TYPE_DEFINITIONS).forEach((def) => {
      expect(def.available).toBe(true);
    });
  });
});

describe('ContractClauseType Enum', () => {
  it('should have exactly 4 clause types', () => {
    const types = Object.values(ContractClauseType);
    expect(types).toHaveLength(4);
  });

  it('should have command, salvage, support, and transport', () => {
    expect(ContractClauseType.COMMAND).toBe('command');
    expect(ContractClauseType.SALVAGE).toBe('salvage');
    expect(ContractClauseType.SUPPORT).toBe('support');
    expect(ContractClauseType.TRANSPORT).toBe('transport');
  });
});

describe('CLAUSE_LEVELS', () => {
  it('should have 4 levels for each clause type', () => {
    Object.values(ContractClauseType).forEach((clauseType) => {
      const levels = CLAUSE_LEVELS[clauseType];
      expect(levels).toBeDefined();
      expect(Object.keys(levels)).toHaveLength(4);
      expect(levels[0]).toBeDefined();
      expect(levels[1]).toBeDefined();
      expect(levels[2]).toBeDefined();
      expect(levels[3]).toBeDefined();
    });
  });

  it('should define command levels correctly', () => {
    const commandLevels = CLAUSE_LEVELS[ContractClauseType.COMMAND];
    expect(commandLevels[0].name).toBe('Integrated');
    expect(commandLevels[1].name).toBe('House');
    expect(commandLevels[2].name).toBe('Liaison');
    expect(commandLevels[3].name).toBe('Independent');
  });

  it('should define salvage levels correctly', () => {
    const salvageLevels = CLAUSE_LEVELS[ContractClauseType.SALVAGE];
    expect(salvageLevels[0].name).toBe('None');
    expect(salvageLevels[1].name).toBe('Exchange');
    expect(salvageLevels[2].name).toBe('Employer');
    expect(salvageLevels[3].name).toBe('Integrated');
  });

  it('should define support levels correctly', () => {
    const supportLevels = CLAUSE_LEVELS[ContractClauseType.SUPPORT];
    expect(supportLevels[0].name).toBe('None');
    expect(supportLevels[1].name).toBe('Supplies Only');
    expect(supportLevels[2].name).toBe('Partial');
    expect(supportLevels[3].name).toBe('Full');
  });

  it('should define transport levels correctly', () => {
    const transportLevels = CLAUSE_LEVELS[ContractClauseType.TRANSPORT];
    expect(transportLevels[0].name).toBe('None');
    expect(transportLevels[1].name).toBe('Limited');
    expect(transportLevels[2].name).toBe('Partial');
    expect(transportLevels[3].name).toBe('Full');
  });

  it('should have descriptions for all levels', () => {
    Object.values(ContractClauseType).forEach((clauseType) => {
      const levels = CLAUSE_LEVELS[clauseType];
      [0, 1, 2, 3].forEach((level) => {
        expect(levels[level as 0 | 1 | 2 | 3].description).toBeDefined();
        expect(
          levels[level as 0 | 1 | 2 | 3].description.length,
        ).toBeGreaterThan(0);
      });
    });
  });
});

describe('Type Guards', () => {
  it('isAtBContractType should return true for valid contract types', () => {
    expect(isAtBContractType(AtBContractType.GARRISON_DUTY)).toBe(true);
    expect(isAtBContractType(AtBContractType.ASSASSINATION)).toBe(true);
    expect(isAtBContractType(AtBContractType.ESPIONAGE)).toBe(true);
  });

  it('isAtBContractType should return false for invalid values', () => {
    expect(isAtBContractType('invalid_type')).toBe(false);
    expect(isAtBContractType(null)).toBe(false);
    expect(isAtBContractType(undefined)).toBe(false);
    expect(isAtBContractType(123)).toBe(false);
  });

  it('isContractClauseType should return true for valid clause types', () => {
    expect(isContractClauseType(ContractClauseType.COMMAND)).toBe(true);
    expect(isContractClauseType(ContractClauseType.SALVAGE)).toBe(true);
    expect(isContractClauseType(ContractClauseType.SUPPORT)).toBe(true);
    expect(isContractClauseType(ContractClauseType.TRANSPORT)).toBe(true);
  });

  it('isContractClauseType should return false for invalid values', () => {
    expect(isContractClauseType('invalid_clause')).toBe(false);
    expect(isContractClauseType(null)).toBe(false);
    expect(isContractClauseType(undefined)).toBe(false);
    expect(isContractClauseType(123)).toBe(false);
  });
});

describe('Helper Functions', () => {
  describe('getContractTypesByGroup', () => {
    it('should return 5 garrison types', () => {
      const garrison = getContractTypesByGroup('garrison');
      expect(garrison).toHaveLength(5);
      expect(garrison).toContain(AtBContractType.GARRISON_DUTY);
      expect(garrison).toContain(AtBContractType.CADRE_DUTY);
      expect(garrison).toContain(AtBContractType.SECURITY_DUTY);
      expect(garrison).toContain(AtBContractType.RIOT_DUTY);
      expect(garrison).toContain(AtBContractType.RETAINER);
    });

    it('should return 6 raid types', () => {
      const raid = getContractTypesByGroup('raid');
      expect(raid).toHaveLength(6);
      expect(raid).toContain(AtBContractType.DIVERSIONARY_RAID);
      expect(raid).toContain(AtBContractType.OBJECTIVE_RAID);
      expect(raid).toContain(AtBContractType.ASSASSINATION);
    });

    it('should return 4 guerrilla types', () => {
      const guerrilla = getContractTypesByGroup('guerrilla');
      expect(guerrilla).toHaveLength(4);
      expect(guerrilla).toContain(AtBContractType.GUERRILLA_WARFARE);
      expect(guerrilla).toContain(AtBContractType.ESPIONAGE);
      expect(guerrilla).toContain(AtBContractType.SABOTAGE);
      expect(guerrilla).toContain(AtBContractType.TERRORISM);
    });

    it('should return 4 special types', () => {
      const special = getContractTypesByGroup('special');
      expect(special).toHaveLength(4);
      expect(special).toContain(AtBContractType.PLANETARY_ASSAULT);
      expect(special).toContain(AtBContractType.RELIEF_DUTY);
      expect(special).toContain(AtBContractType.PIRATE_HUNTING);
      expect(special).toContain(AtBContractType.MOLE_HUNTING);
    });
  });

  describe('getOpsTempo', () => {
    it('should return correct ops tempo for garrison duty', () => {
      const tempo = getOpsTempo(AtBContractType.GARRISON_DUTY);
      expect(tempo.min).toBe(1.0);
      expect(tempo.max).toBe(1.0);
    });

    it('should return correct ops tempo for espionage', () => {
      const tempo = getOpsTempo(AtBContractType.ESPIONAGE);
      expect(tempo.min).toBe(2.4);
      expect(tempo.max).toBe(2.4);
    });
  });

  describe('getContractDuration', () => {
    it('should return correct duration for garrison duty', () => {
      const duration = getContractDuration(AtBContractType.GARRISON_DUTY);
      expect(duration).toBe(18);
    });

    it('should return correct duration for raid types', () => {
      const duration = getContractDuration(AtBContractType.OBJECTIVE_RAID);
      expect(duration).toBe(3);
    });

    it('should return correct duration for guerrilla warfare', () => {
      const duration = getContractDuration(AtBContractType.GUERRILLA_WARFARE);
      expect(duration).toBe(24);
    });
  });

  describe('getAvailableContractTypes', () => {
    it('should return all 19 contract types as available', () => {
      const available = getAvailableContractTypes();
      expect(available).toHaveLength(19);
      expect(available).toContain(AtBContractType.GARRISON_DUTY);
      expect(available).toContain(AtBContractType.ASSASSINATION);
      expect(available).toContain(AtBContractType.ESPIONAGE);
    });
  });
});
