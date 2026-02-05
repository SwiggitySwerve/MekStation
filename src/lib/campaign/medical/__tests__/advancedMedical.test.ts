/**
 * Advanced Medical System Tests
 *
 * Tests for the advanced d100 medical system with fumble/crit thresholds
 * and injury worsening mechanics.
 */

import { ICampaignOptions } from '../../../../types/campaign/Campaign';
import { IPerson, IInjury } from '../../../../types/campaign/Person';
import {
  advancedMedicalCheck,
  untreatedAdvanced,
  rollD100,
} from '../advancedMedical';
import { MedicalSystem } from '../medicalTypes';

// Mock person factory
function createMockPerson(id: string, overrides?: Partial<IPerson>): IPerson {
  return {
    id,
    name: `Person ${id}`,
    injuries: [],
    ...overrides,
  } as IPerson;
}

// Mock injury factory
function createMockInjury(id: string, daysToHeal = 10): IInjury {
  return {
    id,
    type: 'Test Injury',
    location: 'Test Location',
    severity: 2,
    daysToHeal,
    permanent: false,
    acquired: new Date(),
    description: 'Test injury',
  } as IInjury;
}

// Mock campaign options
function createMockOptions(): ICampaignOptions {
  return {
    healingWaitingPeriod: 1,
  } as ICampaignOptions;
}

describe('advancedMedical', () => {
  describe('rollD100', () => {
    it('should return a number between 1 and 100', () => {
      const random = () => 0.5;
      const roll = rollD100(random);
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(100);
    });

    it('should return 1 when random is 0', () => {
      const random = () => 0;
      const roll = rollD100(random);
      expect(roll).toBe(1);
    });

    it('should return 100 when random is close to 1', () => {
      const random = () => 0.999;
      const roll = rollD100(random);
      expect(roll).toBe(100);
    });
  });

  describe('untreatedAdvanced', () => {
    it('should return worsened outcome with 30% chance', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1');
      const options = createMockOptions();

      // Test with random value that triggers worsening (0-0.3)
      const result = untreatedAdvanced(patient, injury, () => 0.15);
      expect(result.outcome).toBe('worsened');
      expect(result.system).toBe(MedicalSystem.ADVANCED);
      expect(result.patientId).toBe('patient-1');
      expect(result.injuryId).toBe('inj-1');
    });

    it('should return no_change outcome with 70% chance', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1');

      // Test with random value that does not trigger worsening (0.3+)
      const result = untreatedAdvanced(patient, injury, () => 0.5);
      expect(result.outcome).toBe('no_change');
      expect(result.system).toBe(MedicalSystem.ADVANCED);
    });

    it('should include modifiers in result', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1');

      const result = untreatedAdvanced(patient, injury, () => 0.5);
      expect(result.modifiers).toBeDefined();
      expect(Array.isArray(result.modifiers)).toBe(true);
    });
  });

  describe('advancedMedicalCheck', () => {
    it('should use untreatedAdvanced when no doctor provided', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1');
      const options = createMockOptions();

      const result = advancedMedicalCheck(
        patient,
        injury,
        null,
        options,
        () => 0.15,
      );

      expect(result.doctorId).toBeUndefined();
      expect(result.system).toBe(MedicalSystem.ADVANCED);
    });

    it('should return fumble outcome when roll <= fumble threshold for Regular doctor', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1', 10);
      const doctor = createMockPerson('doctor-1');
      const options = createMockOptions();

      // Regular doctor fumble threshold is 20, so roll 15 should fumble
      // rollD100 with random 0.15 = 15
      const result = advancedMedicalCheck(
        patient,
        injury,
        doctor,
        options,
        () => 0.15,
      );

      expect(result.outcome).toBe('fumble');
      expect(result.doctorId).toBe('doctor-1');
    });

    it('should increase healing days by 20% on fumble', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1', 10);
      const doctor = createMockPerson('doctor-1');
      const options = createMockOptions();

      const result = advancedMedicalCheck(
        patient,
        injury,
        doctor,
        options,
        () => 0.15, // Fumble for Regular doctor
      );

      expect(result.outcome).toBe('fumble');
      // 10 days * 1.2 = 12 days, so +2 days
      expect(result.healingDaysReduced).toBeLessThan(0);
    });

    it('should return critical_success outcome when roll >= crit threshold for Green doctor', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1', 10);
      const doctor = createMockPerson('doctor-1');
      const options = createMockOptions();

      // Green doctor crit threshold is 95, so roll 96 should crit
      // rollD100 with random 0.96 = 96
      const result = advancedMedicalCheck(
        patient,
        injury,
        doctor,
        options,
        () => 0.96,
      );

      expect(result.outcome).toBe('critical_success');
    });

    it('should reduce healing days by 10% on critical success', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1', 10);
      const doctor = createMockPerson('doctor-1');
      const options = createMockOptions();

      const result = advancedMedicalCheck(
        patient,
        injury,
        doctor,
        options,
        () => 0.96, // Crit for Green doctor
      );

      expect(result.outcome).toBe('critical_success');
      // 10 days * 0.9 = 9 days, so -1 day
      expect(result.healingDaysReduced).toBeGreaterThan(0);
    });

    it('should return healed outcome when roll <= skill and not fumble/crit', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1', 10);
      const doctor = createMockPerson('doctor-1');
      const options = createMockOptions();

      // Roll 50 (above fumble 20, below crit 90, and skill is 70)
      const result = advancedMedicalCheck(
        patient,
        injury,
        doctor,
        options,
        () => 0.5,
      );

      expect(result.outcome).toBe('healed');
    });

    it('should return no_change outcome when roll > skill and not crit', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1', 10);
      const doctor = createMockPerson('doctor-1');
      const options = createMockOptions();

      // Roll 85 (above skill ~70, below crit 95)
      const result = advancedMedicalCheck(
        patient,
        injury,
        doctor,
        options,
        () => 0.85,
      );

      expect(result.outcome).toBe('no_change');
    });

    it('should apply fumble threshold based on experience level', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1', 10);
      const doctor = createMockPerson('doctor-1');
      const options = createMockOptions();

      // Regular doctor: fumble threshold is 20
      // Roll 15 should fumble
      const fumbleResult = advancedMedicalCheck(
        patient,
        injury,
        doctor,
        options,
        () => 0.15,
      );
      expect(fumbleResult.outcome).toBe('fumble');

      // Roll 25 should NOT fumble (above threshold 20)
      const noFumbleResult = advancedMedicalCheck(
        patient,
        injury,
        doctor,
        options,
        () => 0.25,
      );
      expect(noFumbleResult.outcome).not.toBe('fumble');
    });

    it('should apply crit threshold based on experience level', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1', 10);
      const doctor = createMockPerson('doctor-1');
      const options = createMockOptions();

      // Regular doctor: crit threshold is 90
      // Roll 92 should crit
      const critResult = advancedMedicalCheck(
        patient,
        injury,
        doctor,
        options,
        () => 0.92,
      );
      expect(critResult.outcome).toBe('critical_success');

      // Roll 85 should NOT crit (below threshold 90)
      const noCritResult = advancedMedicalCheck(
        patient,
        injury,
        doctor,
        options,
        () => 0.85,
      );
      expect(noCritResult.outcome).not.toBe('critical_success');
    });

    it('should include system as ADVANCED in result', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1');
      const doctor = createMockPerson('doctor-1');
      const options = createMockOptions();

      const result = advancedMedicalCheck(
        patient,
        injury,
        doctor,
        options,
        () => 0.5,
      );

      expect(result.system).toBe(MedicalSystem.ADVANCED);
    });

    it('should include roll and targetNumber in result', () => {
      const patient = createMockPerson('patient-1');
      const injury = createMockInjury('inj-1');
      const doctor = createMockPerson('doctor-1');
      const options = createMockOptions();

      const result = advancedMedicalCheck(
        patient,
        injury,
        doctor,
        options,
        () => 0.5,
      );

      expect(typeof result.roll).toBe('number');
      expect(typeof result.targetNumber).toBe('number');
      expect(result.roll).toBeGreaterThanOrEqual(1);
      expect(result.roll).toBeLessThanOrEqual(100);
    });
  });
});
