import {
  standardMedicalCheck,
  naturalHealing,
  roll2d6,
} from '../standardMedical';
import { MedicalSystem } from '../medicalTypes';
import type { IPerson, IInjury } from '../../../../types/campaign/Person';
import { createInjury } from '../../../../types/campaign/Person';
import type { ICampaignOptions } from '../../../../types/campaign/Campaign';
import { createDefaultCampaignOptions } from '../../../../types/campaign/Campaign';
import { PersonnelStatus } from '../../../../types/campaign/enums/PersonnelStatus';
import { CampaignPersonnelRole } from '../../../../types/campaign/enums/CampaignPersonnelRole';

/**
 * Mock RandomFn for deterministic testing
 * Returns values in sequence: 0.5, 0.6, 0.7, etc.
 */
function createMockRandom(values: number[]) {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index++;
    return value;
  };
}

/**
 * Helper to create a test person (doctor or patient)
 */
function createTestPerson(overrides?: Partial<IPerson>): IPerson {
  return {
    id: 'person-' + Math.random().toString(36).substring(7),
    name: 'Test Person',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date(),
    missionsCompleted: 0,
    totalKills: 0,
    xp: 0,
    totalXpEarned: 0,
    xpSpent: 0,
    hits: 0,
    injuries: [],
    daysToWaitForHealing: 0,
    skills: {},
    attributes: {
      STR: 5,
      BOD: 5,
      REF: 5,
      DEX: 5,
      INT: 5,
      WIL: 5,
      CHA: 5,
      Edge: 0,
    },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Helper to create a test injury
 */
function createTestInjury(overrides?: Partial<IInjury>): IInjury {
  return createInjury({
    id: 'inj-' + Math.random().toString(36).substring(7),
    type: 'Broken Arm',
    location: 'Left Arm',
    severity: 2,
    daysToHeal: 14,
    permanent: false,
    acquired: new Date(),
    ...overrides,
  });
}

describe('roll2d6', () => {
  it('should roll between 2 and 12', () => {
    // Test with multiple random values
    const random = createMockRandom([0.0, 0.5, 1.0]);
    
    const roll1 = roll2d6(random);
    const roll2 = roll2d6(random);
    const roll3 = roll2d6(random);
    
    expect(roll1).toBeGreaterThanOrEqual(2);
    expect(roll1).toBeLessThanOrEqual(12);
    expect(roll2).toBeGreaterThanOrEqual(2);
    expect(roll2).toBeLessThanOrEqual(12);
    expect(roll3).toBeGreaterThanOrEqual(2);
    expect(roll3).toBeLessThanOrEqual(12);
  });

  it('should be deterministic with seeded random', () => {
    const random1 = createMockRandom([0.5]);
    const random2 = createMockRandom([0.5]);
    
    const roll1 = roll2d6(random1);
    const roll2 = roll2d6(random2);
    
    expect(roll1).toBe(roll2);
  });
});

describe('standardMedicalCheck', () => {
  let patient: IPerson;
  let doctor: IPerson;
  let injury: IInjury;
  let options: ICampaignOptions;

  beforeEach(() => {
    patient = createTestPerson({ injuries: [] });
    doctor = createTestPerson({ primaryRole: CampaignPersonnelRole.DOCTOR });
    injury = createTestInjury({ daysToHeal: 14 });
    options = createDefaultCampaignOptions();
  });

  describe('with doctor present', () => {
    it('should return healed outcome on successful roll', () => {
      // Medicine skill = 7, need roll >= 7
      // Mock random to produce roll of 7 (0.5 = 3, 0.5 = 4, sum = 7)
      const random = createMockRandom([0.5, 0.5]);
      
      const result = standardMedicalCheck(patient, injury, doctor, options, random);
      
      expect(result.outcome).toBe('healed');
      expect(result.healingDaysReduced).toBe(injury.daysToHeal);
      expect(result.margin).toBeGreaterThanOrEqual(0);
      expect(result.system).toBe(MedicalSystem.STANDARD);
      expect(result.patientId).toBe(patient.id);
      expect(result.doctorId).toBe(doctor.id);
      expect(result.injuryId).toBe(injury.id);
    });

    it('should return no_change outcome on failed roll', () => {
      // Medicine skill = 7, need roll >= 7
      // Mock random to produce roll of 6 (0.25 = 2, 0.25 = 4, sum = 6)
      const random = createMockRandom([0.25, 0.25]);
      
      const result = standardMedicalCheck(patient, injury, doctor, options, random);
      
      expect(result.outcome).toBe('no_change');
      expect(result.healingDaysReduced).toBe(0);
      expect(result.margin).toBeLessThan(0);
      expect(result.system).toBe(MedicalSystem.STANDARD);
    });

    it('should include modifiers in result', () => {
      const random = createMockRandom([0.5, 0.5]);
      
      const result = standardMedicalCheck(patient, injury, doctor, options, random);
      
      expect(result.modifiers).toBeDefined();
      expect(Array.isArray(result.modifiers)).toBe(true);
      expect(result.modifiers.length).toBeGreaterThan(0);
    });

    it('should calculate target number correctly', () => {
      const random = createMockRandom([0.5, 0.5]);
      
      const result = standardMedicalCheck(patient, injury, doctor, options, random);
      
      expect(result.targetNumber).toBeDefined();
      expect(typeof result.targetNumber).toBe('number');
      expect(result.targetNumber).toBeGreaterThan(0);
    });

    it('should apply tougher healing modifier when multiple injuries', () => {
      const injury2 = createTestInjury({ id: 'inj-2' });
      const injury3 = createTestInjury({ id: 'inj-3' });
      const patientWithMultipleInjuries = createTestPerson({
        injuries: [injury, injury2, injury3],
      });
      
      const random = createMockRandom([0.5, 0.5]);
      
      const result = standardMedicalCheck(
        patientWithMultipleInjuries,
        injury,
        doctor,
        options,
        random
      );
      
      // With 3 injuries, tougher healing modifier = 3 - 2 = 1
      // Should increase target number
      expect(result.targetNumber).toBeGreaterThan(7); // Base medicine skill is 7
    });

    it('should be deterministic with seeded random', () => {
      const random1 = createMockRandom([0.5, 0.5]);
      const random2 = createMockRandom([0.5, 0.5]);
      
      const result1 = standardMedicalCheck(patient, injury, doctor, options, random1);
      const result2 = standardMedicalCheck(patient, injury, doctor, options, random2);
      
      expect(result1.roll).toBe(result2.roll);
      expect(result1.outcome).toBe(result2.outcome);
      expect(result1.margin).toBe(result2.margin);
    });
  });

  describe('without doctor (natural healing)', () => {
    it('should return natural healing result when doctor is null', () => {
      const random = createMockRandom([0.5]);
      
      const result = standardMedicalCheck(patient, injury, null, options, random);
      
      expect(result.doctorId).toBeUndefined();
      expect(result.outcome).toBe('no_change');
      expect(result.healingDaysReduced).toBe(0);
    });

    it('should use naturalHealingWaitingPeriod from options', () => {
      const customOptions = {
        ...options,
        healingWaitingPeriod: 7,
      };
      const random = createMockRandom([0.5]);
      
      const result = standardMedicalCheck(patient, injury, null, customOptions, random);
      
      expect(result.outcome).toBe('no_change');
      expect(result.healingDaysReduced).toBe(0);
    });
  });
});

describe('naturalHealing', () => {
  let patient: IPerson;
  let injury: IInjury;
  let options: ICampaignOptions;

  beforeEach(() => {
    patient = createTestPerson();
    injury = createTestInjury({ daysToHeal: 14 });
    options = createDefaultCampaignOptions();
  });

  it('should return no_change outcome', () => {
    const result = naturalHealing(patient, injury, options);
    
    expect(result.outcome).toBe('no_change');
    expect(result.healingDaysReduced).toBe(0);
  });

  it('should not have a doctor ID', () => {
    const result = naturalHealing(patient, injury, options);
    
    expect(result.doctorId).toBeUndefined();
  });

  it('should use STANDARD medical system', () => {
    const result = naturalHealing(patient, injury, options);
    
    expect(result.system).toBe(MedicalSystem.STANDARD);
  });

  it('should include healing waiting period in modifiers', () => {
    const result = naturalHealing(patient, injury, options);
    
    expect(result.modifiers).toBeDefined();
    expect(Array.isArray(result.modifiers)).toBe(true);
  });

  it('should have zero margin (no roll)', () => {
    const result = naturalHealing(patient, injury, options);
    
    expect(result.margin).toBe(0);
  });

  it('should have zero roll (no dice)', () => {
    const result = naturalHealing(patient, injury, options);
    
    expect(result.roll).toBe(0);
  });

  it('should have zero target number (no check)', () => {
    const result = naturalHealing(patient, injury, options);
    
    expect(result.targetNumber).toBe(0);
  });
});

describe('integration tests', () => {
  it('should handle multiple sequential checks with same random seed', () => {
    const patient = createTestPerson();
    const doctor = createTestPerson({ primaryRole: CampaignPersonnelRole.DOCTOR });
    const injury1 = createTestInjury({ id: 'inj-1', daysToHeal: 10 });
    const injury2 = createTestInjury({ id: 'inj-2', daysToHeal: 20 });
    const options = createDefaultCampaignOptions();
    
    const random = createMockRandom([0.5, 0.5, 0.5, 0.5]);
    
    const result1 = standardMedicalCheck(patient, injury1, doctor, options, random);
    const result2 = standardMedicalCheck(patient, injury2, doctor, options, random);
    
    expect(result1.roll).toBe(result2.roll);
    expect(result1.outcome).toBe(result2.outcome);
  });

  it('should handle patient with no injuries', () => {
    const patient = createTestPerson({ injuries: [] });
    const doctor = createTestPerson({ primaryRole: CampaignPersonnelRole.DOCTOR });
    const injury = createTestInjury();
    const options = createDefaultCampaignOptions();
    
    const random = createMockRandom([0.5, 0.5]);
    
    const result = standardMedicalCheck(patient, injury, doctor, options, random);
    
    expect(result).toBeDefined();
    expect(result.patientId).toBe(patient.id);
  });

  it('should handle healing waiting period option', () => {
    const patient = createTestPerson();
    const injury = createTestInjury();
    const options = {
      ...createDefaultCampaignOptions(),
      healingWaitingPeriod: 3,
    };
    
    const result = naturalHealing(patient, injury, options);
    
    expect(result.outcome).toBe('no_change');
    expect(result.healingDaysReduced).toBe(0);
  });
});
