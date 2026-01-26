/**
 * PersonnelStatus enum expansion tests
 * Verifies 37 status values with proper grouping and severity mapping
 */

import { PersonnelStatus, STATUS_SEVERITY, ALL_PERSONNEL_STATUSES } from './PersonnelStatus';

describe('PersonnelStatus Enum Expansion', () => {
  describe('Enum Values Count', () => {
    it('should have exactly 37 status values', () => {
      const statusValues = Object.values(PersonnelStatus);
      expect(statusValues).toHaveLength(37);
    });

    it('should include all original 10 statuses', () => {
      const originalStatuses = [
        PersonnelStatus.ACTIVE,
        PersonnelStatus.MIA,
        PersonnelStatus.KIA,
        PersonnelStatus.RETIRED,
        PersonnelStatus.WOUNDED,
        PersonnelStatus.ON_LEAVE,
        PersonnelStatus.POW,
        PersonnelStatus.AWOL,
        PersonnelStatus.DESERTED,
        PersonnelStatus.STUDENT,
      ];

      originalStatuses.forEach((status) => {
        expect(Object.values(PersonnelStatus)).toContain(status);
      });
    });

    it('should preserve original status string values', () => {
      expect(PersonnelStatus.ACTIVE).toBe('Active');
      expect(PersonnelStatus.MIA).toBe('MIA');
      expect(PersonnelStatus.KIA).toBe('KIA');
      expect(PersonnelStatus.RETIRED).toBe('Retired');
      expect(PersonnelStatus.WOUNDED).toBe('Wounded');
      expect(PersonnelStatus.ON_LEAVE).toBe('On Leave');
      expect(PersonnelStatus.POW).toBe('POW');
      expect(PersonnelStatus.AWOL).toBe('AWOL');
      expect(PersonnelStatus.DESERTED).toBe('Deserted');
      expect(PersonnelStatus.STUDENT).toBe('Student');
    });
  });

  describe('Active/Employed Group (7 values)', () => {
    it('should have ACTIVE status', () => {
      expect(PersonnelStatus.ACTIVE).toBeDefined();
    });

    it('should have CAMP_FOLLOWER status', () => {
      expect(PersonnelStatus.CAMP_FOLLOWER).toBeDefined();
    });

    it('should have RETIRED status', () => {
      expect(PersonnelStatus.RETIRED).toBeDefined();
    });

    it('should have STUDENT status', () => {
      expect(PersonnelStatus.STUDENT).toBeDefined();
    });

    it('should have MISSING status', () => {
      expect(PersonnelStatus.MISSING).toBeDefined();
    });

    it('should have DESERTED status', () => {
      expect(PersonnelStatus.DESERTED).toBeDefined();
    });

    it('should have AWOL status', () => {
      expect(PersonnelStatus.AWOL).toBeDefined();
    });
  });

  describe('Absent Group (4 values)', () => {
    it('should have ON_LEAVE status', () => {
      expect(PersonnelStatus.ON_LEAVE).toBeDefined();
    });

    it('should have ON_MATERNITY_LEAVE status', () => {
      expect(PersonnelStatus.ON_MATERNITY_LEAVE).toBeDefined();
    });

    it('should have POW status', () => {
      expect(PersonnelStatus.POW).toBeDefined();
    });

    it('should have BACKGROUND_CHARACTER status', () => {
      expect(PersonnelStatus.BACKGROUND_CHARACTER).toBeDefined();
    });
  });

  describe('Departed Group (9 values)', () => {
    it('should have RESIGNED status', () => {
      expect(PersonnelStatus.RESIGNED).toBeDefined();
    });

    it('should have FIRED status', () => {
      expect(PersonnelStatus.FIRED).toBeDefined();
    });

    it('should have LEFT status', () => {
      expect(PersonnelStatus.LEFT).toBeDefined();
    });

    it('should have SACKED status', () => {
      expect(PersonnelStatus.SACKED).toBeDefined();
    });

    it('should have DEFECTED status', () => {
      expect(PersonnelStatus.DEFECTED).toBeDefined();
    });

    it('should have STUDENT_GRADUATED status', () => {
      expect(PersonnelStatus.STUDENT_GRADUATED).toBeDefined();
    });

    it('should have RETIRED_FROM_WOUNDS status', () => {
      expect(PersonnelStatus.RETIRED_FROM_WOUNDS).toBeDefined();
    });

    it('should have MEDICAL_RETIREMENT status', () => {
      expect(PersonnelStatus.MEDICAL_RETIREMENT).toBeDefined();
    });

    it('should have CONTRACT_ENDED status', () => {
      expect(PersonnelStatus.CONTRACT_ENDED).toBeDefined();
    });
  });

  describe('Dead Group (14 values)', () => {
    it('should have KIA status', () => {
      expect(PersonnelStatus.KIA).toBeDefined();
    });

    it('should have ACCIDENTAL_DEATH status', () => {
      expect(PersonnelStatus.ACCIDENTAL_DEATH).toBeDefined();
    });

    it('should have DISEASE status', () => {
      expect(PersonnelStatus.DISEASE).toBeDefined();
    });

    it('should have NATURAL_CAUSES status', () => {
      expect(PersonnelStatus.NATURAL_CAUSES).toBeDefined();
    });

    it('should have MURDER status', () => {
      expect(PersonnelStatus.MURDER).toBeDefined();
    });

    it('should have WOUNDS status', () => {
      expect(PersonnelStatus.WOUNDS).toBeDefined();
    });

    it('should have MIA_PRESUMED_DEAD status', () => {
      expect(PersonnelStatus.MIA_PRESUMED_DEAD).toBeDefined();
    });

    it('should have OLD_AGE status', () => {
      expect(PersonnelStatus.OLD_AGE).toBeDefined();
    });

    it('should have PREGNANCY_COMPLICATIONS status', () => {
      expect(PersonnelStatus.PREGNANCY_COMPLICATIONS).toBeDefined();
    });

    it('should have UNDETERMINED status', () => {
      expect(PersonnelStatus.UNDETERMINED).toBeDefined();
    });

    it('should have MEDICAL_COMPLICATIONS status', () => {
      expect(PersonnelStatus.MEDICAL_COMPLICATIONS).toBeDefined();
    });

    it('should have SUICIDE status', () => {
      expect(PersonnelStatus.SUICIDE).toBeDefined();
    });

    it('should have EXECUTION status', () => {
      expect(PersonnelStatus.EXECUTION).toBeDefined();
    });

    it('should have MISSING_PRESUMED_DEAD status', () => {
      expect(PersonnelStatus.MISSING_PRESUMED_DEAD).toBeDefined();
    });
  });

  describe('Other Group (1 value)', () => {
    it('should have DEPENDENT status', () => {
      expect(PersonnelStatus.DEPENDENT).toBeDefined();
    });
  });

  describe('STATUS_SEVERITY Mapping', () => {
    it('should map every status to a severity', () => {
      const allStatuses = Object.values(PersonnelStatus);
      allStatuses.forEach((status) => {
        expect(STATUS_SEVERITY[status]).toBeDefined();
        expect(['positive', 'neutral', 'warning', 'negative']).toContain(
          STATUS_SEVERITY[status]
        );
      });
    });

    it('should have exactly 37 severity mappings', () => {
      const severityKeys = Object.keys(STATUS_SEVERITY);
      expect(severityKeys).toHaveLength(37);
    });

    it('should mark ACTIVE as positive', () => {
      expect(STATUS_SEVERITY[PersonnelStatus.ACTIVE]).toBe('positive');
    });

    it('should mark STUDENT as positive', () => {
      expect(STATUS_SEVERITY[PersonnelStatus.STUDENT]).toBe('positive');
    });

    it('should mark WOUNDED as warning', () => {
      expect(STATUS_SEVERITY[PersonnelStatus.WOUNDED]).toBe('warning');
    });

    it('should mark all death statuses as negative', () => {
      const deathStatuses = [
        PersonnelStatus.KIA,
        PersonnelStatus.ACCIDENTAL_DEATH,
        PersonnelStatus.DISEASE,
        PersonnelStatus.NATURAL_CAUSES,
        PersonnelStatus.MURDER,
        PersonnelStatus.WOUNDS,
        PersonnelStatus.MIA_PRESUMED_DEAD,
        PersonnelStatus.OLD_AGE,
        PersonnelStatus.MEDICAL_COMPLICATIONS,
        PersonnelStatus.PREGNANCY_COMPLICATIONS,
        PersonnelStatus.UNDETERMINED,
        PersonnelStatus.SUICIDE,
        PersonnelStatus.EXECUTION,
        PersonnelStatus.MISSING_PRESUMED_DEAD,
      ];

      deathStatuses.forEach((status) => {
        expect(STATUS_SEVERITY[status]).toBe('negative');
      });
    });

    it('should mark MIA as warning', () => {
      expect(STATUS_SEVERITY[PersonnelStatus.MIA]).toBe('warning');
    });

    it('should mark RETIRED as neutral', () => {
      expect(STATUS_SEVERITY[PersonnelStatus.RETIRED]).toBe('neutral');
    });
  });

  describe('ALL_PERSONNEL_STATUSES Array', () => {
    it('should contain all 37 statuses', () => {
      expect(ALL_PERSONNEL_STATUSES).toHaveLength(37);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(ALL_PERSONNEL_STATUSES)).toBe(true);
    });

    it('should contain all enum values', () => {
      const enumValues = Object.values(PersonnelStatus);
      enumValues.forEach((status) => {
        expect(ALL_PERSONNEL_STATUSES).toContain(status);
      });
    });
  });
});
