/**
 * Status behavioral rules tests
 * Verifies helper functions for determining personnel status properties
 */

import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';

import {
  isAbsent,
  isSalaryEligible,
  isDead,
  isDepartedUnit,
  isActiveFlexible,
  getNotificationSeverity,
} from './statusRules';

describe('Status Behavioral Rules', () => {
  describe('isAbsent()', () => {
    it('should return true for MIA', () => {
      expect(isAbsent(PersonnelStatus.MIA)).toBe(true);
    });

    it('should return true for POW', () => {
      expect(isAbsent(PersonnelStatus.POW)).toBe(true);
    });

    it('should return true for ON_LEAVE', () => {
      expect(isAbsent(PersonnelStatus.ON_LEAVE)).toBe(true);
    });

    it('should return true for ON_MATERNITY_LEAVE', () => {
      expect(isAbsent(PersonnelStatus.ON_MATERNITY_LEAVE)).toBe(true);
    });

    it('should return true for AWOL', () => {
      expect(isAbsent(PersonnelStatus.AWOL)).toBe(true);
    });

    it('should return true for STUDENT', () => {
      expect(isAbsent(PersonnelStatus.STUDENT)).toBe(true);
    });

    it('should return true for WOUNDED (MekStation-specific)', () => {
      expect(isAbsent(PersonnelStatus.WOUNDED)).toBe(true);
    });

    it('should return false for ACTIVE', () => {
      expect(isAbsent(PersonnelStatus.ACTIVE)).toBe(false);
    });

    it('should return false for KIA', () => {
      expect(isAbsent(PersonnelStatus.KIA)).toBe(false);
    });

    it('should return false for RETIRED', () => {
      expect(isAbsent(PersonnelStatus.RETIRED)).toBe(false);
    });
  });

  describe('isSalaryEligible()', () => {
    it('should return true for ACTIVE', () => {
      expect(isSalaryEligible(PersonnelStatus.ACTIVE)).toBe(true);
    });

    it('should return true for POW', () => {
      expect(isSalaryEligible(PersonnelStatus.POW)).toBe(true);
    });

    it('should return true for ON_LEAVE', () => {
      expect(isSalaryEligible(PersonnelStatus.ON_LEAVE)).toBe(true);
    });

    it('should return true for ON_MATERNITY_LEAVE', () => {
      expect(isSalaryEligible(PersonnelStatus.ON_MATERNITY_LEAVE)).toBe(true);
    });

    it('should return true for STUDENT', () => {
      expect(isSalaryEligible(PersonnelStatus.STUDENT)).toBe(true);
    });

    it('should return false for MIA', () => {
      expect(isSalaryEligible(PersonnelStatus.MIA)).toBe(false);
    });

    it('should return false for AWOL', () => {
      expect(isSalaryEligible(PersonnelStatus.AWOL)).toBe(false);
    });

    it('should return false for RETIRED', () => {
      expect(isSalaryEligible(PersonnelStatus.RETIRED)).toBe(false);
    });

    it('should return false for KIA', () => {
      expect(isSalaryEligible(PersonnelStatus.KIA)).toBe(false);
    });

    it('should return false for WOUNDED', () => {
      expect(isSalaryEligible(PersonnelStatus.WOUNDED)).toBe(false);
    });
  });

  describe('isDead()', () => {
    it('should return true for KIA', () => {
      expect(isDead(PersonnelStatus.KIA)).toBe(true);
    });

    it('should return true for ACCIDENTAL_DEATH', () => {
      expect(isDead(PersonnelStatus.ACCIDENTAL_DEATH)).toBe(true);
    });

    it('should return true for DISEASE', () => {
      expect(isDead(PersonnelStatus.DISEASE)).toBe(true);
    });

    it('should return true for NATURAL_CAUSES', () => {
      expect(isDead(PersonnelStatus.NATURAL_CAUSES)).toBe(true);
    });

    it('should return true for MURDER', () => {
      expect(isDead(PersonnelStatus.MURDER)).toBe(true);
    });

    it('should return true for WOUNDS', () => {
      expect(isDead(PersonnelStatus.WOUNDS)).toBe(true);
    });

    it('should return true for MIA_PRESUMED_DEAD', () => {
      expect(isDead(PersonnelStatus.MIA_PRESUMED_DEAD)).toBe(true);
    });

    it('should return true for OLD_AGE', () => {
      expect(isDead(PersonnelStatus.OLD_AGE)).toBe(true);
    });

    it('should return true for PREGNANCY_COMPLICATIONS', () => {
      expect(isDead(PersonnelStatus.PREGNANCY_COMPLICATIONS)).toBe(true);
    });

    it('should return true for UNDETERMINED', () => {
      expect(isDead(PersonnelStatus.UNDETERMINED)).toBe(true);
    });

    it('should return true for MEDICAL_COMPLICATIONS', () => {
      expect(isDead(PersonnelStatus.MEDICAL_COMPLICATIONS)).toBe(true);
    });

    it('should return true for SUICIDE', () => {
      expect(isDead(PersonnelStatus.SUICIDE)).toBe(true);
    });

    it('should return true for EXECUTION', () => {
      expect(isDead(PersonnelStatus.EXECUTION)).toBe(true);
    });

    it('should return true for MISSING_PRESUMED_DEAD', () => {
      expect(isDead(PersonnelStatus.MISSING_PRESUMED_DEAD)).toBe(true);
    });

    it('should return false for ACTIVE', () => {
      expect(isDead(PersonnelStatus.ACTIVE)).toBe(false);
    });

    it('should return false for RETIRED', () => {
      expect(isDead(PersonnelStatus.RETIRED)).toBe(false);
    });

    it('should return false for MIA', () => {
      expect(isDead(PersonnelStatus.MIA)).toBe(false);
    });
  });

  describe('isDepartedUnit()', () => {
    it('should return true for all death statuses', () => {
      const deathStatuses = [
        PersonnelStatus.KIA,
        PersonnelStatus.ACCIDENTAL_DEATH,
        PersonnelStatus.DISEASE,
        PersonnelStatus.NATURAL_CAUSES,
        PersonnelStatus.MURDER,
        PersonnelStatus.WOUNDS,
        PersonnelStatus.MIA_PRESUMED_DEAD,
        PersonnelStatus.OLD_AGE,
        PersonnelStatus.PREGNANCY_COMPLICATIONS,
        PersonnelStatus.UNDETERMINED,
        PersonnelStatus.MEDICAL_COMPLICATIONS,
        PersonnelStatus.SUICIDE,
        PersonnelStatus.EXECUTION,
        PersonnelStatus.MISSING_PRESUMED_DEAD,
      ];

      deathStatuses.forEach((status) => {
        expect(isDepartedUnit(status)).toBe(true);
      });
    });

    it('should return true for RESIGNED', () => {
      expect(isDepartedUnit(PersonnelStatus.RESIGNED)).toBe(true);
    });

    it('should return true for FIRED', () => {
      expect(isDepartedUnit(PersonnelStatus.FIRED)).toBe(true);
    });

    it('should return true for LEFT', () => {
      expect(isDepartedUnit(PersonnelStatus.LEFT)).toBe(true);
    });

    it('should return true for SACKED', () => {
      expect(isDepartedUnit(PersonnelStatus.SACKED)).toBe(true);
    });

    it('should return true for DEFECTED', () => {
      expect(isDepartedUnit(PersonnelStatus.DEFECTED)).toBe(true);
    });

    it('should return true for STUDENT_GRADUATED', () => {
      expect(isDepartedUnit(PersonnelStatus.STUDENT_GRADUATED)).toBe(true);
    });

    it('should return true for RETIRED_FROM_WOUNDS', () => {
      expect(isDepartedUnit(PersonnelStatus.RETIRED_FROM_WOUNDS)).toBe(true);
    });

    it('should return true for MEDICAL_RETIREMENT', () => {
      expect(isDepartedUnit(PersonnelStatus.MEDICAL_RETIREMENT)).toBe(true);
    });

    it('should return true for CONTRACT_ENDED', () => {
      expect(isDepartedUnit(PersonnelStatus.CONTRACT_ENDED)).toBe(true);
    });

    it('should return false for ACTIVE', () => {
      expect(isDepartedUnit(PersonnelStatus.ACTIVE)).toBe(false);
    });

    it('should return false for RETIRED (not in departed list)', () => {
      expect(isDepartedUnit(PersonnelStatus.RETIRED)).toBe(false);
    });

    it('should return false for MIA', () => {
      expect(isDepartedUnit(PersonnelStatus.MIA)).toBe(false);
    });

    it('should return false for ON_LEAVE', () => {
      expect(isDepartedUnit(PersonnelStatus.ON_LEAVE)).toBe(false);
    });
  });

  describe('isActiveFlexible()', () => {
    it('should return true for ACTIVE', () => {
      expect(isActiveFlexible(PersonnelStatus.ACTIVE)).toBe(true);
    });

    it('should return true for CAMP_FOLLOWER', () => {
      expect(isActiveFlexible(PersonnelStatus.CAMP_FOLLOWER)).toBe(true);
    });

    it('should return false for RETIRED', () => {
      expect(isActiveFlexible(PersonnelStatus.RETIRED)).toBe(false);
    });

    it('should return false for MIA', () => {
      expect(isActiveFlexible(PersonnelStatus.MIA)).toBe(false);
    });

    it('should return false for KIA', () => {
      expect(isActiveFlexible(PersonnelStatus.KIA)).toBe(false);
    });

    it('should return false for STUDENT', () => {
      expect(isActiveFlexible(PersonnelStatus.STUDENT)).toBe(false);
    });
  });

  describe('getNotificationSeverity()', () => {
    it('should return POSITIVE for ACTIVE', () => {
      expect(getNotificationSeverity(PersonnelStatus.ACTIVE)).toBe('POSITIVE');
    });

    it('should return POSITIVE for STUDENT', () => {
      expect(getNotificationSeverity(PersonnelStatus.STUDENT)).toBe('POSITIVE');
    });

    it('should return POSITIVE for STUDENT_GRADUATED', () => {
      expect(getNotificationSeverity(PersonnelStatus.STUDENT_GRADUATED)).toBe(
        'POSITIVE',
      );
    });

    it('should return POSITIVE for CAMP_FOLLOWER', () => {
      expect(getNotificationSeverity(PersonnelStatus.CAMP_FOLLOWER)).toBe(
        'POSITIVE',
      );
    });

    it('should return NEUTRAL for RETIRED', () => {
      expect(getNotificationSeverity(PersonnelStatus.RETIRED)).toBe('NEUTRAL');
    });

    it('should return NEUTRAL for ON_LEAVE', () => {
      expect(getNotificationSeverity(PersonnelStatus.ON_LEAVE)).toBe('NEUTRAL');
    });

    it('should return NEUTRAL for ON_MATERNITY_LEAVE', () => {
      expect(getNotificationSeverity(PersonnelStatus.ON_MATERNITY_LEAVE)).toBe(
        'NEUTRAL',
      );
    });

    it('should return NEUTRAL for RESIGNED', () => {
      expect(getNotificationSeverity(PersonnelStatus.RESIGNED)).toBe('NEUTRAL');
    });

    it('should return NEUTRAL for LEFT', () => {
      expect(getNotificationSeverity(PersonnelStatus.LEFT)).toBe('NEUTRAL');
    });

    it('should return NEUTRAL for CONTRACT_ENDED', () => {
      expect(getNotificationSeverity(PersonnelStatus.CONTRACT_ENDED)).toBe(
        'NEUTRAL',
      );
    });

    it('should return NEUTRAL for DEPENDENT', () => {
      expect(getNotificationSeverity(PersonnelStatus.DEPENDENT)).toBe(
        'NEUTRAL',
      );
    });

    it('should return NEUTRAL for BACKGROUND_CHARACTER', () => {
      expect(
        getNotificationSeverity(PersonnelStatus.BACKGROUND_CHARACTER),
      ).toBe('NEUTRAL');
    });

    it('should return WARNING for MIA', () => {
      expect(getNotificationSeverity(PersonnelStatus.MIA)).toBe('WARNING');
    });

    it('should return WARNING for POW', () => {
      expect(getNotificationSeverity(PersonnelStatus.POW)).toBe('WARNING');
    });

    it('should return WARNING for AWOL', () => {
      expect(getNotificationSeverity(PersonnelStatus.AWOL)).toBe('WARNING');
    });

    it('should return WARNING for MISSING', () => {
      expect(getNotificationSeverity(PersonnelStatus.MISSING)).toBe('WARNING');
    });

    it('should return WARNING for DESERTED', () => {
      expect(getNotificationSeverity(PersonnelStatus.DESERTED)).toBe('WARNING');
    });

    it('should return WARNING for WOUNDED', () => {
      expect(getNotificationSeverity(PersonnelStatus.WOUNDED)).toBe('WARNING');
    });

    it('should return WARNING for FIRED', () => {
      expect(getNotificationSeverity(PersonnelStatus.FIRED)).toBe('WARNING');
    });

    it('should return WARNING for SACKED', () => {
      expect(getNotificationSeverity(PersonnelStatus.SACKED)).toBe('WARNING');
    });

    it('should return WARNING for RETIRED_FROM_WOUNDS', () => {
      expect(getNotificationSeverity(PersonnelStatus.RETIRED_FROM_WOUNDS)).toBe(
        'WARNING',
      );
    });

    it('should return WARNING for MEDICAL_RETIREMENT', () => {
      expect(getNotificationSeverity(PersonnelStatus.MEDICAL_RETIREMENT)).toBe(
        'WARNING',
      );
    });

    it('should return NEGATIVE for KIA', () => {
      expect(getNotificationSeverity(PersonnelStatus.KIA)).toBe('NEGATIVE');
    });

    it('should return NEGATIVE for all death statuses', () => {
      const deathStatuses = [
        PersonnelStatus.KIA,
        PersonnelStatus.ACCIDENTAL_DEATH,
        PersonnelStatus.DISEASE,
        PersonnelStatus.NATURAL_CAUSES,
        PersonnelStatus.MURDER,
        PersonnelStatus.WOUNDS,
        PersonnelStatus.MIA_PRESUMED_DEAD,
        PersonnelStatus.OLD_AGE,
        PersonnelStatus.PREGNANCY_COMPLICATIONS,
        PersonnelStatus.UNDETERMINED,
        PersonnelStatus.MEDICAL_COMPLICATIONS,
        PersonnelStatus.SUICIDE,
        PersonnelStatus.EXECUTION,
        PersonnelStatus.MISSING_PRESUMED_DEAD,
      ];

      deathStatuses.forEach((status) => {
        expect(getNotificationSeverity(status)).toBe('NEGATIVE');
      });
    });

    it('should return NEGATIVE for DEFECTED', () => {
      expect(getNotificationSeverity(PersonnelStatus.DEFECTED)).toBe(
        'NEGATIVE',
      );
    });
  });
});
