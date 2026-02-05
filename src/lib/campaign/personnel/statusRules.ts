import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';

const ABSENT_STATUSES = new Set([
  PersonnelStatus.MIA,
  PersonnelStatus.POW,
  PersonnelStatus.ON_LEAVE,
  PersonnelStatus.ON_MATERNITY_LEAVE,
  PersonnelStatus.AWOL,
  PersonnelStatus.STUDENT,
  PersonnelStatus.WOUNDED,
]);

const SALARY_ELIGIBLE = new Set([
  PersonnelStatus.ACTIVE,
  PersonnelStatus.POW,
  PersonnelStatus.ON_LEAVE,
  PersonnelStatus.ON_MATERNITY_LEAVE,
  PersonnelStatus.STUDENT,
]);

const DEAD_STATUSES = new Set([
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
]);

const DEPARTED_STATUSES = new Set([
  PersonnelStatus.RESIGNED,
  PersonnelStatus.FIRED,
  PersonnelStatus.LEFT,
  PersonnelStatus.SACKED,
  PersonnelStatus.DEFECTED,
  PersonnelStatus.STUDENT_GRADUATED,
  PersonnelStatus.RETIRED_FROM_WOUNDS,
  PersonnelStatus.MEDICAL_RETIREMENT,
  PersonnelStatus.CONTRACT_ENDED,
]);

export type NotificationSeverity =
  | 'POSITIVE'
  | 'NEUTRAL'
  | 'WARNING'
  | 'NEGATIVE';

export function isAbsent(status: PersonnelStatus): boolean {
  return ABSENT_STATUSES.has(status);
}

export function isSalaryEligible(status: PersonnelStatus): boolean {
  return SALARY_ELIGIBLE.has(status);
}

export function isDead(status: PersonnelStatus): boolean {
  return DEAD_STATUSES.has(status);
}

export function isDepartedUnit(status: PersonnelStatus): boolean {
  return isDead(status) || DEPARTED_STATUSES.has(status);
}

export function isActiveFlexible(status: PersonnelStatus): boolean {
  return (
    status === PersonnelStatus.ACTIVE ||
    status === PersonnelStatus.CAMP_FOLLOWER
  );
}

export function getNotificationSeverity(
  status: PersonnelStatus,
): NotificationSeverity {
  if (isDead(status)) {
    return 'NEGATIVE';
  }

  if (status === PersonnelStatus.DEFECTED) {
    return 'NEGATIVE';
  }

  if (
    status === PersonnelStatus.ACTIVE ||
    status === PersonnelStatus.CAMP_FOLLOWER ||
    status === PersonnelStatus.STUDENT ||
    status === PersonnelStatus.STUDENT_GRADUATED
  ) {
    return 'POSITIVE';
  }

  if (
    status === PersonnelStatus.MIA ||
    status === PersonnelStatus.POW ||
    status === PersonnelStatus.AWOL ||
    status === PersonnelStatus.MISSING ||
    status === PersonnelStatus.DESERTED ||
    status === PersonnelStatus.WOUNDED ||
    status === PersonnelStatus.FIRED ||
    status === PersonnelStatus.SACKED ||
    status === PersonnelStatus.RETIRED_FROM_WOUNDS ||
    status === PersonnelStatus.MEDICAL_RETIREMENT
  ) {
    return 'WARNING';
  }

  return 'NEUTRAL';
}
