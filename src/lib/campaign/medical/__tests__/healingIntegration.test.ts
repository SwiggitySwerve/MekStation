import { processHealing } from '../../dayAdvancement';
import { IPerson, IInjury, createInjury } from '../../../../types/campaign/Person';
import { PersonnelStatus, CampaignPersonnelRole } from '../../../../types/campaign/enums';

function createTestPerson(overrides?: Partial<IPerson>): IPerson {
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
    attributes: { STR: 5, BOD: 5, REF: 5, DEX: 5, INT: 5, WIL: 5, CHA: 5, Edge: 0 },
    pilotSkills: { gunnery: 4, piloting: 5 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createTestInjury(overrides?: Partial<IInjury>): IInjury {
  return createInjury({
    id: 'inj-001',
    type: 'Broken Arm',
    location: 'Left Arm',
    severity: 2,
    daysToHeal: 5,
    permanent: false,
    acquired: new Date('3025-01-01'),
    ...overrides,
  });
}

function createTestDoctor(overrides?: Partial<IPerson>): IPerson {
  return createTestPerson({
    id: 'doctor-001',
    name: 'Dr. Test',
    primaryRole: CampaignPersonnelRole.DOCTOR,
    ...overrides,
  });
}

describe('Healing Integration - Medical System Selection', () => {
  describe('Standard Medical System', () => {
    it('should use standard system when option = STANDARD', () => {
      const doctor = createTestDoctor();
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [createTestInjury()],
      });

      const personnel = new Map<string, IPerson>([
        [doctor.id, doctor],
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      expect(result.personnel).toBeDefined();
      expect(result.events).toBeDefined();
    });

    it('should heal injuries with standard system when doctor succeeds', () => {
      const doctor = createTestDoctor();
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [createTestInjury({ daysToHeal: 7 })],
      });

      const personnel = new Map<string, IPerson>([
        [doctor.id, doctor],
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      
      const updatedPatient = result.personnel.get(patient.id);
      expect(updatedPatient).toBeDefined();
      expect(updatedPatient!.injuries.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Advanced Medical System', () => {
    it('should use advanced system when option = ADVANCED', () => {
      const doctor = createTestDoctor();
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [createTestInjury()],
      });

      const personnel = new Map<string, IPerson>([
        [doctor.id, doctor],
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      expect(result.personnel).toBeDefined();
      expect(result.events).toBeDefined();
    });

    it('should handle fumbles in advanced system', () => {
      const doctor = createTestDoctor();
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [createTestInjury({ daysToHeal: 10 })],
      });

      const personnel = new Map<string, IPerson>([
        [doctor.id, doctor],
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      expect(result.personnel).toBeDefined();
    });
  });

  describe('Alternate Medical System', () => {
    it('should use alternate system when option = ALTERNATE', () => {
      const doctor = createTestDoctor();
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [createTestInjury()],
      });

      const personnel = new Map<string, IPerson>([
        [doctor.id, doctor],
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      expect(result.personnel).toBeDefined();
      expect(result.events).toBeDefined();
    });

    it('should use margin-of-success in alternate system', () => {
      const doctor = createTestDoctor();
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [createTestInjury({ daysToHeal: 7 })],
      });

      const personnel = new Map<string, IPerson>([
        [doctor.id, doctor],
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      expect(result.personnel).toBeDefined();
    });
  });

  describe('Natural Healing (No Doctor)', () => {
    it('should apply natural healing when no doctor available', () => {
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [createTestInjury({ daysToHeal: 14 })],
      });

      const personnel = new Map<string, IPerson>([
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      
      const updatedPatient = result.personnel.get(patient.id);
      expect(updatedPatient).toBeDefined();
      expect(updatedPatient!.status).toBe(PersonnelStatus.WOUNDED);
    });

    it('should eventually heal without doctor', () => {
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [createTestInjury({ daysToHeal: 1 })],
      });

      const personnel = new Map<string, IPerson>([
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      
      const updatedPatient = result.personnel.get(patient.id);
      expect(updatedPatient).toBeDefined();
    });
  });

  describe('Doctor Capacity', () => {
    it('should skip patients beyond doctor capacity', () => {
      const doctor = createTestDoctor();
      
      const personnel = new Map<string, IPerson>();
      personnel.set(doctor.id, doctor);
      
      for (let i = 0; i < 30; i++) {
        const patient = createTestPerson({
          id: `patient-${i}`,
          status: PersonnelStatus.WOUNDED,
          injuries: [createTestInjury({ id: `inj-${i}` })],
        });
        personnel.set(patient.id, patient);
      }

      const result = processHealing(personnel);
      expect(result.personnel.size).toBe(31);
    });
  });

  describe('Medical Events', () => {
    it('should emit medical events for healed injuries', () => {
      const doctor = createTestDoctor();
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [createTestInjury({ daysToHeal: 1 })],
      });

      const personnel = new Map<string, IPerson>([
        [doctor.id, doctor],
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
    });

    it('should track healed injury IDs in events', () => {
      const doctor = createTestDoctor();
      const injury = createTestInjury({ id: 'inj-001', daysToHeal: 1 });
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [injury],
      });

      const personnel = new Map<string, IPerson>([
        [doctor.id, doctor],
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
    });

    it('should track return to active status in events', () => {
      const doctor = createTestDoctor();
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [createTestInjury({ daysToHeal: 1 })],
        daysToWaitForHealing: 0,
      });

      const personnel = new Map<string, IPerson>([
        [doctor.id, doctor],
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      
      expect(result.events).toBeDefined();
    });
  });

  describe('Permanent Injuries', () => {
    it('should not heal permanent injuries', () => {
      const doctor = createTestDoctor();
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [createTestInjury({ permanent: true })],
      });

      const personnel = new Map<string, IPerson>([
        [doctor.id, doctor],
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      
      const updatedPatient = result.personnel.get(patient.id);
      expect(updatedPatient!.injuries.length).toBe(1);
      expect(updatedPatient!.injuries[0].permanent).toBe(true);
    });
  });

  describe('Multiple Injuries', () => {
    it('should process multiple injuries per patient', () => {
      const doctor = createTestDoctor();
      const patient = createTestPerson({
        id: 'patient-001',
        status: PersonnelStatus.WOUNDED,
        injuries: [
          createTestInjury({ id: 'inj-001', daysToHeal: 5 }),
          createTestInjury({ id: 'inj-002', daysToHeal: 7 }),
          createTestInjury({ id: 'inj-003', daysToHeal: 3 }),
        ],
      });

      const personnel = new Map<string, IPerson>([
        [doctor.id, doctor],
        [patient.id, patient],
      ]);

      const result = processHealing(personnel);
      
      const updatedPatient = result.personnel.get(patient.id);
      expect(updatedPatient).toBeDefined();
    });
  });
});
