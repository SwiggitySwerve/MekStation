import {
  MedicalSystem,
  IMedicalCheckResult,
  ISurgeryResult,
  isMedicalSystem,
  isMedicalCheckResult,
  isSurgeryResult,
} from '../medicalTypes';

describe('MedicalSystem', () => {
  it('should have exactly 3 values', () => {
    const values = Object.values(MedicalSystem);
    expect(values).toHaveLength(3);
  });

  it('should have STANDARD value', () => {
    expect(MedicalSystem.STANDARD).toBe('standard');
  });

  it('should have ADVANCED value', () => {
    expect(MedicalSystem.ADVANCED).toBe('advanced');
  });

  it('should have ALTERNATE value', () => {
    expect(MedicalSystem.ALTERNATE).toBe('alternate');
  });
});

describe('IMedicalCheckResult', () => {
  it('should have all required outcome types', () => {
    const validOutcomes = [
      'healed',
      'no_change',
      'worsened',
      'permanent_healed',
      'critical_success',
      'fumble',
    ];
    expect(validOutcomes).toHaveLength(6);
  });

  it('should create a valid medical check result', () => {
    const result: IMedicalCheckResult = {
      patientId: 'person-001',
      doctorId: 'person-002',
      system: MedicalSystem.STANDARD,
      roll: 8,
      targetNumber: 6,
      margin: 2,
      outcome: 'healed',
      injuryId: 'inj-001',
      healingDaysReduced: 7,
      modifiers: [
        { name: 'Doctor Skill', value: 2 },
        { name: 'Injury Severity', value: -1 },
      ],
    };

    expect(result.patientId).toBe('person-001');
    expect(result.doctorId).toBe('person-002');
    expect(result.system).toBe(MedicalSystem.STANDARD);
    expect(result.roll).toBe(8);
    expect(result.targetNumber).toBe(6);
    expect(result.margin).toBe(2);
    expect(result.outcome).toBe('healed');
    expect(result.injuryId).toBe('inj-001');
    expect(result.healingDaysReduced).toBe(7);
    expect(result.modifiers).toHaveLength(2);
  });

  it('should allow optional doctorId', () => {
    const result: IMedicalCheckResult = {
      patientId: 'person-001',
      system: MedicalSystem.STANDARD,
      roll: 8,
      targetNumber: 6,
      margin: 2,
      outcome: 'healed',
      injuryId: 'inj-001',
      healingDaysReduced: 7,
      modifiers: [],
    };

    expect(result.doctorId).toBeUndefined();
  });

  it('should support all outcome types', () => {
    const outcomes: IMedicalCheckResult['outcome'][] = [
      'healed',
      'no_change',
      'worsened',
      'permanent_healed',
      'critical_success',
      'fumble',
    ];

    outcomes.forEach((outcome) => {
      const result: IMedicalCheckResult = {
        patientId: 'person-001',
        system: MedicalSystem.STANDARD,
        roll: 8,
        targetNumber: 6,
        margin: 2,
        outcome,
        injuryId: 'inj-001',
        healingDaysReduced: 7,
        modifiers: [],
      };

      expect(result.outcome).toBe(outcome);
    });
  });
});

describe('ISurgeryResult', () => {
  it('should extend IMedicalCheckResult', () => {
    const result: ISurgeryResult = {
      patientId: 'person-001',
      doctorId: 'person-002',
      system: MedicalSystem.ADVANCED,
      roll: 10,
      targetNumber: 8,
      margin: 2,
      outcome: 'permanent_healed',
      injuryId: 'inj-001',
      healingDaysReduced: 30,
      modifiers: [{ name: 'Surgical Facility', value: 2 }],
      permanentRemoved: true,
      prostheticInstalled: false,
    };

    expect(result.patientId).toBe('person-001');
    expect(result.permanentRemoved).toBe(true);
    expect(result.prostheticInstalled).toBe(false);
  });

  it('should support permanent removal', () => {
    const result: ISurgeryResult = {
      patientId: 'person-001',
      system: MedicalSystem.ADVANCED,
      roll: 10,
      targetNumber: 8,
      margin: 2,
      outcome: 'permanent_healed',
      injuryId: 'inj-001',
      healingDaysReduced: 30,
      modifiers: [],
      permanentRemoved: true,
      prostheticInstalled: false,
    };

    expect(result.permanentRemoved).toBe(true);
  });

  it('should support prosthetic installation', () => {
    const result: ISurgeryResult = {
      patientId: 'person-001',
      system: MedicalSystem.ADVANCED,
      roll: 10,
      targetNumber: 8,
      margin: 2,
      outcome: 'permanent_healed',
      injuryId: 'inj-001',
      healingDaysReduced: 30,
      modifiers: [],
      permanentRemoved: false,
      prostheticInstalled: true,
    };

    expect(result.prostheticInstalled).toBe(true);
  });
});

describe('Type Guards', () => {
  describe('isMedicalSystem', () => {
    it('should return true for STANDARD', () => {
      expect(isMedicalSystem(MedicalSystem.STANDARD)).toBe(true);
    });

    it('should return true for ADVANCED', () => {
      expect(isMedicalSystem(MedicalSystem.ADVANCED)).toBe(true);
    });

    it('should return true for ALTERNATE', () => {
      expect(isMedicalSystem(MedicalSystem.ALTERNATE)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isMedicalSystem('invalid')).toBe(false);
      expect(isMedicalSystem(null)).toBe(false);
      expect(isMedicalSystem(undefined)).toBe(false);
      expect(isMedicalSystem(123)).toBe(false);
    });
  });

  describe('isMedicalCheckResult', () => {
    it('should return true for valid IMedicalCheckResult', () => {
      const result: IMedicalCheckResult = {
        patientId: 'person-001',
        system: MedicalSystem.STANDARD,
        roll: 8,
        targetNumber: 6,
        margin: 2,
        outcome: 'healed',
        injuryId: 'inj-001',
        healingDaysReduced: 7,
        modifiers: [],
      };

      expect(isMedicalCheckResult(result)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isMedicalCheckResult(null)).toBe(false);
      expect(isMedicalCheckResult(undefined)).toBe(false);
      expect(isMedicalCheckResult({})).toBe(false);
      expect(isMedicalCheckResult({ patientId: 'person-001' })).toBe(false);
    });

    it('should return false for invalid outcome', () => {
      const result = {
        patientId: 'person-001',
        system: MedicalSystem.STANDARD,
        roll: 8,
        targetNumber: 6,
        margin: 2,
        outcome: 'invalid_outcome',
        injuryId: 'inj-001',
        healingDaysReduced: 7,
        modifiers: [],
      };

      expect(isMedicalCheckResult(result)).toBe(false);
    });
  });

  describe('isSurgeryResult', () => {
    it('should return true for valid ISurgeryResult', () => {
      const result: ISurgeryResult = {
        patientId: 'person-001',
        system: MedicalSystem.ADVANCED,
        roll: 10,
        targetNumber: 8,
        margin: 2,
        outcome: 'permanent_healed',
        injuryId: 'inj-001',
        healingDaysReduced: 30,
        modifiers: [],
        permanentRemoved: true,
        prostheticInstalled: false,
      };

      expect(isSurgeryResult(result)).toBe(true);
    });

    it('should return false for IMedicalCheckResult without surgery fields', () => {
      const result: IMedicalCheckResult = {
        patientId: 'person-001',
        system: MedicalSystem.STANDARD,
        roll: 8,
        targetNumber: 6,
        margin: 2,
        outcome: 'healed',
        injuryId: 'inj-001',
        healingDaysReduced: 7,
        modifiers: [],
      };

      expect(isSurgeryResult(result)).toBe(false);
    });

    it('should return false for invalid objects', () => {
      expect(isSurgeryResult(null)).toBe(false);
      expect(isSurgeryResult(undefined)).toBe(false);
      expect(isSurgeryResult({})).toBe(false);
    });
  });
});
