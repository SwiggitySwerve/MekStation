import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';

type RosterStatus = Pick<ICampaignRosterEntry, 'status' | 'departureReason'>;

/** Employment departure, including legacy markers whose status stayed Active. */
export function isRosterPilotDeparted(entry: RosterStatus): boolean {
  return (
    entry.departureReason != null ||
    entry.status === CampaignPilotStatus.Retired ||
    entry.status === CampaignPilotStatus.Deserted
  );
}

/** Preserve existing injury/MIA salary rules; exclude deaths and departures. */
export function isRosterPilotSalaryEligible(entry: RosterStatus): boolean {
  return (
    entry.status !== CampaignPilotStatus.KIA && !isRosterPilotDeparted(entry)
  );
}

export function isRosterPilotDeployable(entry: RosterStatus): boolean {
  return (
    entry.status === CampaignPilotStatus.Active && !isRosterPilotDeparted(entry)
  );
}

export function rosterStatusForDeparture(
  reason: 'retired' | 'deserted',
): CampaignPilotStatus {
  return reason === 'retired'
    ? CampaignPilotStatus.Retired
    : CampaignPilotStatus.Deserted;
}

/** Correct known legacy Active departures without changing other saved statuses. */
export function normalizeRosterPilotDeparture(
  entry: ICampaignRosterEntry,
): ICampaignRosterEntry {
  const reason = entry.departureReason;
  if (
    entry.status !== CampaignPilotStatus.Active ||
    (reason !== 'retired' && reason !== 'deserted')
  )
    return entry;
  return { ...entry, status: rosterStatusForDeparture(reason) };
}

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
