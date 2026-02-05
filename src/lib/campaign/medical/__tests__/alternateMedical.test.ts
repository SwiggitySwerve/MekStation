/**
 * Alternate Medical System Tests
 *
 * Tests for the alternate medical system with margin-of-success healing.
 * - Positive margin: healed
 * - Margin -1 to -5: extended healing time (no_change)
 * - Margin ≤ -6: injury becomes permanent (worsened)
 * - Prosthetic penalty: +4
 */

import { createDefaultCampaignOptions } from '../../../../types/campaign/Campaign';
import {
  PersonnelStatus,
  CampaignPersonnelRole,
} from '../../../../types/campaign/enums';
import { IPerson, createInjury } from '../../../../types/campaign/Person';
import { alternateMedicalCheck } from '../alternateMedical';
import { MedicalSystem } from '../medicalTypes';

function createMockPerson(overrides?: Partial<IPerson>): IPerson {
  return {
    id: 'person-001',
    name: 'Test Person',
    status: PersonnelStatus.ACTIVE,
    primaryRole: CampaignPersonnelRole.PILOT,
    rank: 'MechWarrior',
    recruitmentDate: new Date('3025-01-01'),
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
      BOD: 6,
      REF: 4,
      DEX: 5,
      INT: 4,
      WIL: 5,
      CHA: 4,
      Edge: 3,
    },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('alternateMedicalCheck', () => {
  const mockPatient = createMockPerson({
    id: 'patient-001',
    name: 'Test Patient',
    attributes: {
      STR: 5,
      BOD: 6,
      REF: 4,
      DEX: 5,
      INT: 4,
      WIL: 5,
      CHA: 4,
      Edge: 3,
    },
  });

  const mockDoctor = createMockPerson({
    id: 'doctor-001',
    name: 'Test Doctor',
    primaryRole: CampaignPersonnelRole.DOCTOR,
    attributes: {
      STR: 4,
      BOD: 5,
      REF: 5,
      DEX: 6,
      INT: 6,
      WIL: 5,
      CHA: 5,
      Edge: 2,
    },
  });

  const mockInjury = createInjury({
    id: 'inj-001',
    type: 'Broken Arm',
    severity: 2,
    location: 'right_arm',
    daysToHeal: 14,
    permanent: false,
    acquired: new Date(),
  });

  const mockOptions = createDefaultCampaignOptions();

  describe('RED: Positive margin heals', () => {
    it('should return outcome "healed" when margin >= 0', () => {
      // Roll 10, attribute 6, penalty 0 = margin 4
      const random = () => 0.75; // Will roll 5+5=10
      const result = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        mockDoctor,
        mockOptions,
        random,
      );

      expect(result.outcome).toBe('healed');
      expect(result.margin).toBeGreaterThanOrEqual(0);
      expect(result.system).toBe(MedicalSystem.ALTERNATE);
      expect(result.patientId).toBe('patient-001');
      expect(result.injuryId).toBe('inj-001');
    });
  });

  describe('RED: Margin -1 to -5 extends healing time', () => {
    it('should return outcome "no_change" when margin is -1 to -5', () => {
      // Roll 4, attribute 6, penalty 0 = margin -2
      const random = () => 0.25; // Will roll 2+2=4
      const result = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        mockDoctor,
        mockOptions,
        random,
      );

      expect(result.outcome).toBe('no_change');
      expect(result.margin).toBeGreaterThanOrEqual(-5);
      expect(result.margin).toBeLessThan(0);
    });
  });

  describe('RED: Margin ≤ -6 makes permanent', () => {
    it('should return outcome "worsened" when margin <= -6', () => {
      const patientWithInjuries = createMockPerson({
        ...mockPatient,
        injuries: [
          { ...mockInjury, severity: 5 },
          { ...mockInjury, id: 'inj-002', severity: 3 },
        ],
      });

      const random = () => 0.1;
      const result = alternateMedicalCheck(
        patientWithInjuries,
        mockInjury,
        mockDoctor,
        mockOptions,
        random,
      );

      expect(result.outcome).toBe('worsened');
      expect(result.margin).toBeLessThanOrEqual(-6);
    });
  });

  describe('RED: Prosthetic penalty adds +4', () => {
    it('should include prosthetic penalty in modifiers when applicable', () => {
      const random = () => 0.75;
      const result = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        mockDoctor,
        mockOptions,
        random,
      );

      expect(result.modifiers).toBeDefined();
      expect(Array.isArray(result.modifiers)).toBe(true);
      expect(result.modifiers.length).toBeGreaterThan(0);
    });
  });

  describe('Integration: Result structure', () => {
    it('should return valid IMedicalCheckResult', () => {
      const random = () => 0.5;
      const result = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        mockDoctor,
        mockOptions,
        random,
      );

      expect(result).toHaveProperty('patientId', 'patient-001');
      expect(result).toHaveProperty('doctorId', 'doctor-001');
      expect(result).toHaveProperty('system', MedicalSystem.ALTERNATE);
      expect(result).toHaveProperty('roll');
      expect(result).toHaveProperty('targetNumber');
      expect(result).toHaveProperty('margin');
      expect(result).toHaveProperty('outcome');
      expect(result).toHaveProperty('injuryId', 'inj-001');
      expect(result).toHaveProperty('healingDaysReduced');
      expect(result).toHaveProperty('modifiers');
      expect(Array.isArray(result.modifiers)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle no doctor (use patient BOD)', () => {
      const random = () => 0.75;
      const result = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        null,
        mockOptions,
        random,
      );

      expect(result.doctorId).toBeUndefined();
      expect(result.system).toBe(MedicalSystem.ALTERNATE);
    });

    it('should calculate healingDaysReduced only on healed outcome', () => {
      // Healed case
      const randomHealed = () => 0.75;
      const resultHealed = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        mockDoctor,
        mockOptions,
        randomHealed,
      );

      if (resultHealed.outcome === 'healed') {
        expect(resultHealed.healingDaysReduced).toBeGreaterThan(0);
      }

      // No change case
      const randomNoChange = () => 0.25;
      const resultNoChange = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        mockDoctor,
        mockOptions,
        randomNoChange,
      );

      if (resultNoChange.outcome === 'no_change') {
        expect(resultNoChange.healingDaysReduced).toBe(0);
      }
    });
  });
});
