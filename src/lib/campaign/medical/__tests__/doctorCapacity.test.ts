import {
  getDoctorCapacity,
  getAssignedPatientCount,
  isDoctorOverloaded,
  getOverloadPenalty,
  getBestAvailableDoctor,
} from '../doctorCapacity';
import type { IPerson } from '../../../../types/campaign/Person';
import type { ICampaignOptions } from '../../../../types/campaign/Campaign';
import { createDefaultCampaignOptions } from '../../../../types/campaign/Campaign';
import { PersonnelStatus } from '../../../../types/campaign/enums/PersonnelStatus';
import { CampaignPersonnelRole } from '../../../../types/campaign/enums/CampaignPersonnelRole';

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

describe('Doctor Capacity Management', () => {
  let defaultOptions: ICampaignOptions;

  beforeEach(() => {
    defaultOptions = createDefaultCampaignOptions();
  });

  describe('getDoctorCapacity', () => {
    it('should return base capacity of 25 patients by default', () => {
      const doctor = createTestPerson({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const capacity = getDoctorCapacity(doctor, options);

      expect(capacity).toBe(25);
    });

    it('should return custom maxPatientsPerDoctor when set', () => {
      const doctor = createTestPerson({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const options = { ...defaultOptions, maxPatientsPerDoctor: 30 };

      const capacity = getDoctorCapacity(doctor, options);

      expect(capacity).toBe(30);
    });

    it('should increase capacity with administration skill when doctorsUseAdministration is true', () => {
      const doctor = createTestPerson({
        primaryRole: CampaignPersonnelRole.DOCTOR,
        skills: {
          administration: {
            typeId: 'administration',
            level: 3,
            bonus: 0,
            xpProgress: 0,
          },
        },
      });
      const options = {
        ...defaultOptions,
        maxPatientsPerDoctor: 25,
        doctorsUseAdministration: true,
      };

      const capacity = getDoctorCapacity(doctor, options);

      // base 25 + (3 * 25 * 0.2) = 25 + 15 = 40
      expect(capacity).toBe(40);
    });

    it('should not increase capacity if doctorsUseAdministration is false', () => {
      const doctor = createTestPerson({
        primaryRole: CampaignPersonnelRole.DOCTOR,
        skills: {
          administration: {
            typeId: 'administration',
            level: 3,
            bonus: 0,
            xpProgress: 0,
          },
        },
      });
      const options = {
        ...defaultOptions,
        maxPatientsPerDoctor: 25,
        doctorsUseAdministration: false,
      };

      const capacity = getDoctorCapacity(doctor, options);

      expect(capacity).toBe(25);
    });

    it('should handle doctor with no administration skill', () => {
      const doctor = createTestPerson({
        primaryRole: CampaignPersonnelRole.DOCTOR,
        skills: {},
      });
      const options = {
        ...defaultOptions,
        maxPatientsPerDoctor: 25,
        doctorsUseAdministration: true,
      };

      const capacity = getDoctorCapacity(doctor, options);

      // base 25 + (0 * 25 * 0.2) = 25
      expect(capacity).toBe(25);
    });

    it('should handle high administration skill', () => {
      const doctor = createTestPerson({
        primaryRole: CampaignPersonnelRole.DOCTOR,
        skills: {
          administration: {
            typeId: 'administration',
            level: 5,
            bonus: 0,
            xpProgress: 0,
          },
        },
      });
      const options = {
        ...defaultOptions,
        maxPatientsPerDoctor: 25,
        doctorsUseAdministration: true,
      };

      const capacity = getDoctorCapacity(doctor, options);

      // base 25 + (5 * 25 * 0.2) = 25 + 25 = 50
      expect(capacity).toBe(50);
    });
  });

  describe('getAssignedPatientCount', () => {
    it('should return 0 when no patients are assigned to doctor', () => {
      const doctor = createTestPerson({
        id: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const personnel: IPerson[] = [
        createTestPerson({ id: 'patient-001', primaryRole: CampaignPersonnelRole.PILOT }),
        createTestPerson({ id: 'patient-002', primaryRole: CampaignPersonnelRole.PILOT }),
      ];

      const count = getAssignedPatientCount(doctor, personnel);

      expect(count).toBe(0);
    });

    it('should count patients assigned to doctor', () => {
      const doctor = createTestPerson({
        id: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const personnel: IPerson[] = [
        createTestPerson({
          id: 'patient-001',
          primaryRole: CampaignPersonnelRole.PILOT,
          doctorId: 'doctor-001',
          injuries: [
            {
              id: 'inj-001',
              type: 'Broken Arm',
              location: 'Left Arm',
              severity: 2,
              daysToHeal: 14,
              permanent: false,
              acquired: new Date(),
            },
          ],
          daysToWaitForHealing: 7,
        }),
        createTestPerson({
          id: 'patient-002',
          primaryRole: CampaignPersonnelRole.PILOT,
          doctorId: 'doctor-001',
          injuries: [
            {
              id: 'inj-002',
              type: 'Concussion',
              location: 'Head',
              severity: 1,
              daysToHeal: 7,
              permanent: false,
              acquired: new Date(),
            },
          ],
          daysToWaitForHealing: 3,
        }),
      ];

      const count = getAssignedPatientCount(doctor, personnel);

      expect(count).toBe(2);
    });

    it('should only count patients with injuries', () => {
      const doctor = createTestPerson({
        id: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const personnel: IPerson[] = [
        createTestPerson({
          id: 'patient-001',
          primaryRole: CampaignPersonnelRole.PILOT,
          doctorId: 'doctor-001',
          injuries: [
            {
              id: 'inj-001',
              type: 'Broken Arm',
              location: 'Left Arm',
              severity: 2,
              daysToHeal: 14,
              permanent: false,
              acquired: new Date(),
            },
          ],
          daysToWaitForHealing: 7,
        }),
        createTestPerson({
          id: 'patient-002',
          primaryRole: CampaignPersonnelRole.PILOT,
          doctorId: 'doctor-001',
          injuries: [],
          daysToWaitForHealing: 0,
        }),
      ];

      const count = getAssignedPatientCount(doctor, personnel);

      expect(count).toBe(1);
    });
  });

  describe('isDoctorOverloaded', () => {
    it('should return false when doctor has no patients', () => {
      const doctor = createTestPerson({
        id: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const personnel: IPerson[] = [];
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const overloaded = isDoctorOverloaded(doctor, personnel, options);

      expect(overloaded).toBe(false);
    });

    it('should return false when doctor is at capacity', () => {
      const doctor = createTestPerson({
        id: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const personnel: IPerson[] = Array.from({ length: 25 }, (_, i) =>
        createTestPerson({
          id: `patient-${i}`,
          primaryRole: CampaignPersonnelRole.PILOT,
          doctorId: 'doctor-001',
          injuries: [
            {
              id: `inj-${i}`,
              type: 'Injury',
              location: 'Body',
              severity: 1,
              daysToHeal: 7,
              permanent: false,
              acquired: new Date(),
            },
          ],
          daysToWaitForHealing: 3,
        })
      );
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const overloaded = isDoctorOverloaded(doctor, personnel, options);

      expect(overloaded).toBe(false);
    });

    it('should return true when doctor exceeds capacity', () => {
      const doctor = createTestPerson({
        id: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const personnel: IPerson[] = Array.from({ length: 26 }, (_, i) =>
        createTestPerson({
          id: `patient-${i}`,
          primaryRole: CampaignPersonnelRole.PILOT,
          doctorId: 'doctor-001',
          injuries: [
            {
              id: `inj-${i}`,
              type: 'Injury',
              location: 'Body',
              severity: 1,
              daysToHeal: 7,
              permanent: false,
              acquired: new Date(),
            },
          ],
          daysToWaitForHealing: 3,
        })
      );
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const overloaded = isDoctorOverloaded(doctor, personnel, options);

      expect(overloaded).toBe(true);
    });
  });

  describe('getOverloadPenalty', () => {
    it('should return 0 when doctor is not overloaded', () => {
      const doctor = createTestPerson({
        id: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const personnel: IPerson[] = Array.from({ length: 20 }, (_, i) =>
        createTestPerson({
          id: `patient-${i}`,
          primaryRole: CampaignPersonnelRole.PILOT,
          doctorId: 'doctor-001',
          injuries: [
            {
              id: `inj-${i}`,
              type: 'Injury',
              location: 'Body',
              severity: 1,
              daysToHeal: 7,
              permanent: false,
              acquired: new Date(),
            },
          ],
          daysToWaitForHealing: 3,
        })
      );
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const penalty = getOverloadPenalty(doctor, personnel, options);

      expect(penalty).toBe(0);
    });

    it('should return penalty equal to excess patients', () => {
      const doctor = createTestPerson({
        id: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const personnel: IPerson[] = Array.from({ length: 30 }, (_, i) =>
        createTestPerson({
          id: `patient-${i}`,
          primaryRole: CampaignPersonnelRole.PILOT,
          doctorId: 'doctor-001',
          injuries: [
            {
              id: `inj-${i}`,
              type: 'Injury',
              location: 'Body',
              severity: 1,
              daysToHeal: 7,
              permanent: false,
              acquired: new Date(),
            },
          ],
          daysToWaitForHealing: 3,
        })
      );
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const penalty = getOverloadPenalty(doctor, personnel, options);

      expect(penalty).toBe(5);
    });

    it('should scale penalty with large overload', () => {
      const doctor = createTestPerson({
        id: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const personnel: IPerson[] = Array.from({ length: 50 }, (_, i) =>
        createTestPerson({
          id: `patient-${i}`,
          primaryRole: CampaignPersonnelRole.PILOT,
          doctorId: 'doctor-001',
          injuries: [
            {
              id: `inj-${i}`,
              type: 'Injury',
              location: 'Body',
              severity: 1,
              daysToHeal: 7,
              permanent: false,
              acquired: new Date(),
            },
          ],
          daysToWaitForHealing: 3,
        })
      );
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const penalty = getOverloadPenalty(doctor, personnel, options);

      expect(penalty).toBe(25);
    });
  });

  describe('getBestAvailableDoctor', () => {
    it('should return null when no doctors available', () => {
      const patient = createTestPerson({
        id: 'patient-001',
        primaryRole: CampaignPersonnelRole.PILOT,
      });
      const personnel: IPerson[] = [
        createTestPerson({
          id: 'pilot-001',
          primaryRole: CampaignPersonnelRole.PILOT,
        }),
      ];
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const doctor = getBestAvailableDoctor(patient, personnel, options);

      expect(doctor).toBeNull();
    });

    it('should return doctor with lowest patient count', () => {
      const patient = createTestPerson({
        id: 'patient-001',
        primaryRole: CampaignPersonnelRole.PILOT,
      });
      const doctor1 = createTestPerson({
        id: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const doctor2 = createTestPerson({
        id: 'doctor-002',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const personnel: IPerson[] = [
        doctor1,
        doctor2,
        ...Array.from({ length: 5 }, (_, i) =>
          createTestPerson({
            id: `patient-d1-${i}`,
            primaryRole: CampaignPersonnelRole.PILOT,
            doctorId: 'doctor-001',
            injuries: [
              {
                id: `inj-d1-${i}`,
                type: 'Injury',
                location: 'Body',
                severity: 1,
                daysToHeal: 7,
                permanent: false,
                acquired: new Date(),
              },
            ],
            daysToWaitForHealing: 3,
          })
        ),
        ...Array.from({ length: 3 }, (_, i) =>
          createTestPerson({
            id: `patient-d2-${i}`,
            primaryRole: CampaignPersonnelRole.PILOT,
            doctorId: 'doctor-002',
            injuries: [
              {
                id: `inj-d2-${i}`,
                type: 'Injury',
                location: 'Body',
                severity: 1,
                daysToHeal: 7,
                permanent: false,
                acquired: new Date(),
              },
            ],
            daysToWaitForHealing: 3,
          })
        ),
      ];
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const bestDoctor = getBestAvailableDoctor(patient, personnel, options);

      expect(bestDoctor?.id).toBe('doctor-002');
    });

    it('should return null when all doctors are overloaded', () => {
      const patient = createTestPerson({
        id: 'patient-new',
        primaryRole: CampaignPersonnelRole.PILOT,
      });
      const doctor = createTestPerson({
        id: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const personnel: IPerson[] = [
        doctor,
        ...Array.from({ length: 26 }, (_, i) =>
          createTestPerson({
            id: `patient-${i}`,
            primaryRole: CampaignPersonnelRole.PILOT,
            doctorId: 'doctor-001',
            injuries: [
              {
                id: `inj-${i}`,
                type: 'Injury',
                location: 'Body',
                severity: 1,
                daysToHeal: 7,
                permanent: false,
                acquired: new Date(),
              },
            ],
            daysToWaitForHealing: 3,
          })
        ),
      ];
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const bestDoctor = getBestAvailableDoctor(patient, personnel, options);

      expect(bestDoctor).toBeNull();
    });

    it('should prefer doctor with capacity over overloaded doctor', () => {
      const patient = createTestPerson({
        id: 'patient-new',
        primaryRole: CampaignPersonnelRole.PILOT,
      });
      const doctor1 = createTestPerson({
        id: 'doctor-001',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const doctor2 = createTestPerson({
        id: 'doctor-002',
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const personnel: IPerson[] = [
        doctor1,
        doctor2,
        ...Array.from({ length: 26 }, (_, i) =>
          createTestPerson({
            id: `patient-d1-${i}`,
            primaryRole: CampaignPersonnelRole.PILOT,
            doctorId: 'doctor-001',
            injuries: [
              {
                id: `inj-d1-${i}`,
                type: 'Injury',
                location: 'Body',
                severity: 1,
                daysToHeal: 7,
                permanent: false,
                acquired: new Date(),
              },
            ],
            daysToWaitForHealing: 3,
          })
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          createTestPerson({
            id: `patient-d2-${i}`,
            primaryRole: CampaignPersonnelRole.PILOT,
            doctorId: 'doctor-002',
            injuries: [
              {
                id: `inj-d2-${i}`,
                type: 'Injury',
                location: 'Body',
                severity: 1,
                daysToHeal: 7,
                permanent: false,
                acquired: new Date(),
              },
            ],
            daysToWaitForHealing: 3,
          })
        ),
      ];
      const options = { ...defaultOptions, maxPatientsPerDoctor: 25 };

      const bestDoctor = getBestAvailableDoctor(patient, personnel, options);

      expect(bestDoctor?.id).toBe('doctor-002');
    });
  });
});
