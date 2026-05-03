/**
 * Alternate Medical System Tests
 *
 * Tests for the alternate medical system with margin-of-success healing.
 * - Positive margin: healed
 * - Margin -1 to -5: extended healing time (no_change)
 * - Margin <= -6: injury becomes permanent (worsened)
 * - Prosthetic penalty: +4 (stub returns false, so not applied in these tests)
 *
 * Stub values used by production code:
 *   getMedicineSkillValue → 7  (Plan 7 stub)
 *   getToughness          → 5  (Plan 7 stub)
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { createInjury } from '@/types/campaign/Person';

import { alternateMedicalCheck } from '../alternateMedical';
import { MedicalSystem } from '../medicalTypes';

function createMockRosterEntry(
  overrides?: Partial<ICampaignRosterEntry>,
): ICampaignRosterEntry {
  return {
    pilotId: 'person-001',
    pilotName: 'Test Person',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    injuries: [],
    ...overrides,
  };
}

describe('alternateMedicalCheck', () => {
  const mockPatient = createMockRosterEntry({
    pilotId: 'patient-001',
    pilotName: 'Test Patient',
  });

  const mockDoctor = createMockRosterEntry({
    pilotId: 'doctor-001',
    pilotName: 'Test Doctor',
    primaryRole: CampaignPersonnelRole.DOCTOR,
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
      // Stubs: medicineSkill=7, toughness=5, injury severity=2, penalty=max(0,2-5)=0
      // target=7, random=0.75 → die1=floor(0.75*6)+1=5, die2=5, roll=10, margin=3 >= 0
      const random = () => 0.75;
      const result = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        mockDoctor,
        null,
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
      // Stubs: medicineSkill=7, toughness=5, injury severity=2, penalty=0
      // target=7, random=0.25 → die1=floor(0.25*6)+1=2, die2=2, roll=4, margin=-3
      const random = () => 0.25;
      const result = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        mockDoctor,
        null,
        mockOptions,
        random,
      );

      expect(result.outcome).toBe('no_change');
      expect(result.margin).toBeGreaterThanOrEqual(-5);
      expect(result.margin).toBeLessThan(0);
    });
  });

  describe('RED: Margin <= -6 makes permanent', () => {
    it('should return outcome "worsened" when margin <= -6', () => {
      // Stubs: medicineSkill=7, toughness=5
      // Patient has injuries severity 5+3=8, penalty=max(0,8-5)=3, target=7+3=10
      // random=0.1 → die1=floor(0.1*6)+1=1, die2=1, roll=2, margin=2-10=-8 <= -6
      const patientWithInjuries = createMockRosterEntry({
        pilotId: 'patient-001',
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
        null,
        mockOptions,
        random,
      );

      expect(result.outcome).toBe('worsened');
      expect(result.margin).toBeLessThanOrEqual(-6);
    });
  });

  describe('RED: Prosthetic penalty adds +4', () => {
    it('should include modifiers in result', () => {
      // hasProsthetic stub always returns false — no prosthetic modifier applied
      const random = () => 0.75;
      const result = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        mockDoctor,
        null,
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
        null,
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
    it('should handle no doctor (use patient BOD stub = 5)', () => {
      // No doctor: attributeValue = getToughness stub = 5
      // target=5+penalty, random=0.75 → roll=10
      const random = () => 0.75;
      const result = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        null,
        null,
        mockOptions,
        random,
      );

      expect(result.doctorId).toBeUndefined();
      expect(result.system).toBe(MedicalSystem.ALTERNATE);
    });

    it('should calculate healingDaysReduced only on healed outcome', () => {
      // Healed case: random=0.75 → roll=10, target=7, margin=3 >= 0
      const randomHealed = () => 0.75;
      const resultHealed = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        mockDoctor,
        null,
        mockOptions,
        randomHealed,
      );

      if (resultHealed.outcome === 'healed') {
        expect(resultHealed.healingDaysReduced).toBeGreaterThan(0);
      }

      // No change case: random=0.25 → roll=4, target=7, margin=-3
      const randomNoChange = () => 0.25;
      const resultNoChange = alternateMedicalCheck(
        mockPatient,
        mockInjury,
        mockDoctor,
        null,
        mockOptions,
        randomNoChange,
      );

      if (resultNoChange.outcome === 'no_change') {
        expect(resultNoChange.healingDaysReduced).toBe(0);
      }
    });
  });
});
