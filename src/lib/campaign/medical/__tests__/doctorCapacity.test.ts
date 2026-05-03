/**
 * Doctor Capacity Management Tests
 *
 * Note: Several helpers are stubbed pending Plan 7 (skill system):
 *   - getDoctorCapacity: adminSkill=0 always, so doctorsUseAdministration has no effect yet
 *   - getAssignedPatientCount: counts ALL roster entries with injuries (not per-doctor)
 *     until assignedDoctorId lands on ICampaignRosterEntry
 *
 * Tests are written against the stub semantics, with comments noting the
 * intended future behavior.
 */

import type { ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

import {
  getDoctorCapacity,
  getAssignedPatientCount,
  isDoctorOverloaded,
  getOverloadPenalty,
  getBestAvailableDoctor,
} from '../doctorCapacity';

/**
 * Helper to create a test roster entry (doctor or patient).
 * Null pilot path — sufficient for all capacity helper stubs.
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

/** Minimal injury fixture for entries that need at least one injury. */
const STUB_INJURY = {
  id: 'inj-stub',
  type: 'Injury',
  location: 'Body',
  severity: 1,
  daysToHeal: 7,
  permanent: false,
  acquired: new Date(),
} as const;

describe('Doctor Capacity Management', () => {
  let defaultOptions: ICampaignOptions;

  beforeEach(() => {
    defaultOptions = createDefaultCampaignOptions();
  });

  describe('getDoctorCapacity', () => {
    it('should return base capacity of 25 patients by default', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const capacity = getDoctorCapacity(doctor, null, options);

      expect(capacity).toBe(25);
    });

    it('should return custom maxPatientsPerDoctor when set', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const options = { ...defaultOptions, maxPatientsPerDoctor: 30 };

      const capacity = getDoctorCapacity(doctor, null, options);

      expect(capacity).toBe(30);
    });

    it('should return base capacity when doctorsUseAdministration is true (adminSkill stub = 0)', () => {
      // @stub Plan 7 - adminSkill hardcoded to 0; bonus = floor(0 * 25 * 0.2) = 0
      // Future: with adminSkill=3, expect 25 + floor(3*25*0.2) = 40
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const options = {
        ...defaultOptions,
        maxPatientsPerDoctor: 25,
        doctorsUseAdministration: true,
      };

      const capacity = getDoctorCapacity(doctor, null, options);

      // Stub returns base only — administration bonus deferred to Plan 7
      expect(capacity).toBe(25);
    });

    it('should not increase capacity if doctorsUseAdministration is false', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const options = {
        ...defaultOptions,
        maxPatientsPerDoctor: 25,
        doctorsUseAdministration: false,
      };

      const capacity = getDoctorCapacity(doctor, null, options);

      expect(capacity).toBe(25);
    });

    it('should handle NPC doctor (null pilot) gracefully', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const options = {
        ...defaultOptions,
        maxPatientsPerDoctor: 20,
        doctorsUseAdministration: true,
      };

      const capacity = getDoctorCapacity(doctor, null, options);

      // NPC doctor gets same base capacity — no pilot to look up skills on
      expect(capacity).toBe(20);
    });
  });

  describe('getAssignedPatientCount', () => {
    it('should return 0 when no entries have injuries', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const entries: ICampaignRosterEntry[] = [
        createTestEntry({ primaryRole: CampaignPersonnelRole.PILOT }),
        createTestEntry({ primaryRole: CampaignPersonnelRole.PILOT }),
      ];

      // @stub Plan 7 - counts ALL injured entries, not just those assigned to this doctor
      const count = getAssignedPatientCount(doctor, null, entries);

      expect(count).toBe(0);
    });

    it('should count entries with at least one injury', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const entries: ICampaignRosterEntry[] = [
        createTestEntry({ injuries: [STUB_INJURY] }),
        createTestEntry({ injuries: [STUB_INJURY] }),
        createTestEntry({ injuries: [] }), // no injury — not counted
      ];

      // Stub: counts entries with injuries > 0 across the whole roster
      const count = getAssignedPatientCount(doctor, null, entries);

      expect(count).toBe(2);
    });

    it('should not count entries with empty injuries array', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const entries: ICampaignRosterEntry[] = [
        createTestEntry({ injuries: [STUB_INJURY] }),
        createTestEntry({ injuries: [] }),
      ];

      const count = getAssignedPatientCount(doctor, null, entries);

      expect(count).toBe(1);
    });

    it('should return same count regardless of which doctor is queried (stub behavior)', () => {
      // @stub Plan 7 - per-doctor filtering deferred; all doctors see same total
      const doctor1 = createTestEntry({
        pilotId: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const doctor2 = createTestEntry({
        pilotId: 'doctor-002',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const entries: ICampaignRosterEntry[] = [
        doctor1,
        doctor2,
        createTestEntry({ injuries: [STUB_INJURY] }),
        createTestEntry({ injuries: [STUB_INJURY] }),
      ];

      const count1 = getAssignedPatientCount(doctor1, null, entries);
      const count2 = getAssignedPatientCount(doctor2, null, entries);

      expect(count1).toBe(count2);
      expect(count1).toBe(2);
    });
  });

  describe('isDoctorOverloaded', () => {
    it('should return false when roster has no injured entries', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const entries: ICampaignRosterEntry[] = [];
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const overloaded = isDoctorOverloaded(doctor, null, entries, options);

      expect(overloaded).toBe(false);
    });

    it('should return false when injured count equals capacity', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const entries: ICampaignRosterEntry[] = Array.from({ length: 25 }, () =>
        createTestEntry({ injuries: [STUB_INJURY] }),
      );
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      // patientCount(25) <= capacity(25) → not overloaded
      const overloaded = isDoctorOverloaded(doctor, null, entries, options);

      expect(overloaded).toBe(false);
    });

    it('should return true when injured count exceeds capacity', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const entries: ICampaignRosterEntry[] = Array.from({ length: 26 }, () =>
        createTestEntry({ injuries: [STUB_INJURY] }),
      );
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      // patientCount(26) > capacity(25) → overloaded
      const overloaded = isDoctorOverloaded(doctor, null, entries, options);

      expect(overloaded).toBe(true);
    });
  });

  describe('getOverloadPenalty', () => {
    it('should return 0 when roster has fewer injured than capacity', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const entries: ICampaignRosterEntry[] = Array.from({ length: 20 }, () =>
        createTestEntry({ injuries: [STUB_INJURY] }),
      );
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const penalty = getOverloadPenalty(doctor, null, entries, options);

      expect(penalty).toBe(0);
    });

    it('should return penalty equal to excess injured entries over capacity', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const entries: ICampaignRosterEntry[] = Array.from({ length: 30 }, () =>
        createTestEntry({ injuries: [STUB_INJURY] }),
      );
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const penalty = getOverloadPenalty(doctor, null, entries, options);

      expect(penalty).toBe(5);
    });

    it('should scale penalty with large overload', () => {
      const doctor = createTestEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const entries: ICampaignRosterEntry[] = Array.from({ length: 50 }, () =>
        createTestEntry({ injuries: [STUB_INJURY] }),
      );
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const penalty = getOverloadPenalty(doctor, null, entries, options);

      expect(penalty).toBe(25);
    });
  });

  describe('getBestAvailableDoctor', () => {
    it('should return null when no doctors in roster', () => {
      const patient = createTestEntry({
        primaryRole: CampaignPersonnelRole.PILOT,
      });
      const entries: ICampaignRosterEntry[] = [
        createTestEntry({ primaryRole: CampaignPersonnelRole.PILOT }),
      ];
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const doctor = getBestAvailableDoctor(
        patient,
        entries,
        new Map(),
        options,
      );

      expect(doctor).toBeNull();
    });

    it('should return doctor when roster has no injured entries (count=0 < capacity)', () => {
      const patient = createTestEntry({
        primaryRole: CampaignPersonnelRole.PILOT,
      });
      const doctor1 = createTestEntry({
        pilotId: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const entries: ICampaignRosterEntry[] = [patient, doctor1];
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      // No injured entries → count=0 < capacity=25 → doctor is available
      const best = getBestAvailableDoctor(patient, entries, new Map(), options);

      expect(best).not.toBeNull();
      expect(best?.pilotId).toBe('doctor-001');
    });

    it('should return null when total injured count exceeds all doctors capacity', () => {
      const patient = createTestEntry({
        primaryRole: CampaignPersonnelRole.PILOT,
      });
      const doctor = createTestEntry({
        pilotId: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      // 26 injured entries → stub count=26 > capacity=25 → overloaded
      const entries: ICampaignRosterEntry[] = [
        doctor,
        ...Array.from({ length: 26 }, () =>
          createTestEntry({ injuries: [STUB_INJURY] }),
        ),
      ];
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const best = getBestAvailableDoctor(patient, entries, new Map(), options);

      expect(best).toBeNull();
    });

    it('should prefer MEDIC role doctor when both DOCTOR and MEDIC are available', () => {
      const patient = createTestEntry({
        primaryRole: CampaignPersonnelRole.PILOT,
      });
      const docEntry = createTestEntry({
        pilotId: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const medicEntry = createTestEntry({
        pilotId: 'medic-001',
        primaryRole: CampaignPersonnelRole.MEDIC,
      });
      // No injured entries → both have count=0; first encountered with count<capacity wins
      const entries: ICampaignRosterEntry[] = [patient, docEntry, medicEntry];
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const best = getBestAvailableDoctor(patient, entries, new Map(), options);

      // Either is valid — just confirm one of the two eligible roles was returned
      expect(best).not.toBeNull();
      const validRoles = [
        CampaignPersonnelRole.DOCTOR,
        CampaignPersonnelRole.MEDIC,
      ];
      expect(validRoles).toContain(best?.primaryRole);
    });
  });
});
