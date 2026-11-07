/**
 * PersonnelStatus enum expansion tests
 * Verifies 37 status values with proper grouping and severity mapping
 */

import {
  PersonnelStatus,
  STATUS_SEVERITY,
  ALL_PERSONNEL_STATUSES,
} from './PersonnelStatus';

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

  describe('STATUS_SEVERITY Mapping', () => {
    it('should map every status to a severity', () => {
      const allStatuses = Object.values(PersonnelStatus);
      allStatuses.forEach((status) => {
        expect(STATUS_SEVERITY[status]).toBeDefined();
        expect(['positive', 'neutral', 'warning', 'negative']).toContain(
          STATUS_SEVERITY[status],
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
