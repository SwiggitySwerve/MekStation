import type { ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IInjury } from '@/types/campaign/Person';

import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { createInjury } from '@/types/campaign/Person';

import { MedicalSystem } from '../medicalTypes';
import {
  standardMedicalCheck,
  naturalHealing,
  roll2d6,
} from '../standardMedical';

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
 * Helper to create a test roster entry (doctor or patient).
 * Uses null pilot (NPC path) — sufficient for all medical helper stubs.
 */
function createTestEntry(
  overrides?: Partial<ICampaignRosterEntry>,
): ICampaignRosterEntry {
  return {
    pilotId: 'entry-' + Math.random().toString(36).substring(7),
    pilotName: 'Test Person',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date(0),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    injuries: [],
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
  let patient: ICampaignRosterEntry;
  let doctor: ICampaignRosterEntry;
  let injury: IInjury;
  let options: ICampaignOptions;

  beforeEach(() => {
    patient = createTestEntry({ injuries: [] });
    doctor = createTestEntry({ primaryRole: CampaignPersonnelRole.DOCTOR });
    injury = createTestInjury({ daysToHeal: 14 });
    options = createDefaultCampaignOptions();
  });

  describe('with doctor present', () => {
    it('should return healed outcome on successful roll', () => {
      // Medicine skill = 7 (stub), need roll >= 7
      // Mock random to produce roll of 7 (0.5 = 3, 0.5 = 4, sum = 7)
      const random = createMockRandom([0.5, 0.5]);

      const result = standardMedicalCheck(
        patient,
        injury,
        doctor,
        null,
        options,
        random,
      );

      expect(result.outcome).toBe('healed');
      expect(result.healingDaysReduced).toBe(injury.daysToHeal);
      expect(result.margin).toBeGreaterThanOrEqual(0);
      expect(result.system).toBe(MedicalSystem.STANDARD);
      expect(result.patientId).toBe(patient.pilotId);
      expect(result.doctorId).toBe(doctor.pilotId);
      expect(result.injuryId).toBe(injury.id);
    });

    it('should return no_change outcome on failed roll', () => {
      // Medicine skill = 7 (stub), need roll >= 7
      // Mock random to produce roll of 6 (0.25 = 2, 0.25 = 4, sum = 6)
      const random = createMockRandom([0.25, 0.25]);

      const result = standardMedicalCheck(
        patient,
        injury,
        doctor,
        null,
        options,
        random,
      );

      expect(result.outcome).toBe('no_change');
      expect(result.healingDaysReduced).toBe(0);
      expect(result.margin).toBeLessThan(0);
      expect(result.system).toBe(MedicalSystem.STANDARD);
    });

    it('should include modifiers in result', () => {
      const random = createMockRandom([0.5, 0.5]);

      const result = standardMedicalCheck(
        patient,
        injury,
        doctor,
        null,
        options,
        random,
      );

      expect(result.modifiers).toBeDefined();
      expect(Array.isArray(result.modifiers)).toBe(true);
      expect(result.modifiers.length).toBeGreaterThan(0);
    });

    it('should calculate target number correctly', () => {
      const random = createMockRandom([0.5, 0.5]);

      const result = standardMedicalCheck(
        patient,
        injury,
        doctor,
        null,
        options,
        random,
      );

      expect(result.targetNumber).toBeDefined();
      expect(typeof result.targetNumber).toBe('number');
      expect(result.targetNumber).toBeGreaterThan(0);
    });

    it('should apply tougher healing modifier when multiple injuries', () => {
      const injury2 = createTestInjury({ id: 'inj-2' });
      const injury3 = createTestInjury({ id: 'inj-3' });
      const patientWithMultipleInjuries = createTestEntry({
        injuries: [injury, injury2, injury3],
      });

      const random = createMockRandom([0.5, 0.5]);

      const result = standardMedicalCheck(
        patientWithMultipleInjuries,
        injury,
        doctor,
        null,
        options,
        random,
      );

      // With 3 injuries, tougher healing modifier = 3 - 2 = 1
      // Should increase target number above base medicine skill of 7
      expect(result.targetNumber).toBeGreaterThan(7);
    });

    it('should use the doctor roster medicine skill instead of a hardcoded target', () => {
      const eliteDoctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
        ...({ medicineSkill: 5 } as Partial<ICampaignRosterEntry> & {
          readonly medicineSkill: number;
        }),
      });
      const random = createMockRandom([0.4, 0.4]);

      const result = standardMedicalCheck(
        patient,
        injury,
        eliteDoctor,
        null,
        options,
        random,
      );

      expect(result.targetNumber).toBe(5);
      expect(result.outcome).toBe('healed');
    });

    it('should apply a shorthanded modifier when a doctor exceeds patient capacity', () => {
      const overloadedDoctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
        ...({
          medicineSkill: 5,
          patientCapacity: 1,
          assignedPatientIds: ['p1', 'p2', 'p3'],
        } as Partial<ICampaignRosterEntry> & {
          readonly medicineSkill: number;
          readonly patientCapacity: number;
          readonly assignedPatientIds: readonly string[];
        }),
      });
      const random = createMockRandom([0.4, 0.4]);

      const result = standardMedicalCheck(
        patient,
        injury,
        overloadedDoctor,
        null,
        options,
        random,
      );

      expect(result.modifiers).toContainEqual({
        name: 'Shorthanded',
        value: 2,
      });
      expect(result.targetNumber).toBe(7);
    });

    it('should be deterministic with seeded random', () => {
      const random1 = createMockRandom([0.5, 0.5]);
      const random2 = createMockRandom([0.5, 0.5]);

      const result1 = standardMedicalCheck(
        patient,
        injury,
        doctor,
        null,
        options,
        random1,
      );
      const result2 = standardMedicalCheck(
        patient,
        injury,
        doctor,
        null,
        options,
        random2,
      );

      expect(result1.roll).toBe(result2.roll);
      expect(result1.outcome).toBe(result2.outcome);
      expect(result1.margin).toBe(result2.margin);
    });
  });

  describe('without doctor (natural healing)', () => {
    it('should return natural healing result when doctor is null', () => {
      const random = createMockRandom([0.5]);

      const result = standardMedicalCheck(
        patient,
        injury,
        null,
        null,
        options,
        random,
      );

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

      const result = standardMedicalCheck(
        patient,
        injury,
        null,
        null,
        customOptions,
        random,
      );

      expect(result.outcome).toBe('no_change');
      expect(result.healingDaysReduced).toBe(0);
    });
  });
});

describe('naturalHealing', () => {
  let patient: ICampaignRosterEntry;
  let injury: IInjury;
  let options: ICampaignOptions;

  beforeEach(() => {
    patient = createTestEntry();
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
    const patient = createTestEntry();
    const doctor = createTestEntry({
      primaryRole: CampaignPersonnelRole.DOCTOR,
    });
    const injury1 = createTestInjury({ id: 'inj-1', daysToHeal: 10 });
    const injury2 = createTestInjury({ id: 'inj-2', daysToHeal: 20 });
    const options = createDefaultCampaignOptions();

    const random = createMockRandom([0.5, 0.5, 0.5, 0.5]);

    const result1 = standardMedicalCheck(
      patient,
      injury1,
      doctor,
      null,
      options,
      random,
    );
    const result2 = standardMedicalCheck(
      patient,
      injury2,
      doctor,
      null,
      options,
      random,
    );

    expect(result1.roll).toBe(result2.roll);
    expect(result1.outcome).toBe(result2.outcome);
  });

  it('should handle patient with no injuries', () => {
    const patient = createTestEntry({ injuries: [] });
    const doctor = createTestEntry({
      primaryRole: CampaignPersonnelRole.DOCTOR,
    });
    const injury = createTestInjury();
    const options = createDefaultCampaignOptions();

    const random = createMockRandom([0.5, 0.5]);

    const result = standardMedicalCheck(
      patient,
      injury,
      doctor,
      null,
      options,
      random,
    );

    expect(result).toBeDefined();
    expect(result.patientId).toBe(patient.pilotId);
  });

  it('should handle healing waiting period option', () => {
    const patient = createTestEntry();
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
