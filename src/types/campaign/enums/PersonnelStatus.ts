/**
 * Personnel operational status in campaign
 * Expanded to 37 values matching MekHQ with MekStation-specific WOUNDED status
 */
export enum PersonnelStatus {
  // Active/Employed (7)
  ACTIVE = 'Active',
  CAMP_FOLLOWER = 'Camp Follower',
  RETIRED = 'Retired',
  STUDENT = 'Student',
  MISSING = 'Missing',
  DESERTED = 'Deserted',
  AWOL = 'AWOL',

  // Absent (4)
  ON_LEAVE = 'On Leave',
  ON_MATERNITY_LEAVE = 'On Maternity Leave',
  POW = 'POW',
  BACKGROUND_CHARACTER = 'Background Character',

  // Departed (9)
  RESIGNED = 'Resigned',
  FIRED = 'Fired',
  LEFT = 'Left',
  SACKED = 'Sacked',
  DEFECTED = 'Defected',
  STUDENT_GRADUATED = 'Student Graduated',
  RETIRED_FROM_WOUNDS = 'Retired from Wounds',
  MEDICAL_RETIREMENT = 'Medical Retirement',
  CONTRACT_ENDED = 'Contract Ended',

  // Dead (14 causes)
  KIA = 'KIA',
  ACCIDENTAL_DEATH = 'Accidental Death',
  DISEASE = 'Disease',
  NATURAL_CAUSES = 'Natural Causes',
  MURDER = 'Murder',
  WOUNDS = 'Died of Wounds',
  MIA_PRESUMED_DEAD = 'MIA Presumed Dead',
  OLD_AGE = 'Old Age',
  PREGNANCY_COMPLICATIONS = 'Pregnancy Complications',
  UNDETERMINED = 'Undetermined',
  MEDICAL_COMPLICATIONS = 'Medical Complications',
  SUICIDE = 'Suicide',
  EXECUTION = 'Execution',
  MISSING_PRESUMED_DEAD = 'Missing Presumed Dead',

  // Other (1)
  DEPENDENT = 'Dependent',

  // MekStation-specific (not in MekHQ)
  WOUNDED = 'Wounded',
  MIA = 'MIA',
}

export type StatusSeverity = 'positive' | 'neutral' | 'warning' | 'negative';

export const STATUS_SEVERITY: Record<PersonnelStatus, StatusSeverity> = {
  // Active/Employed - positive
  [PersonnelStatus.ACTIVE]: 'positive',
  [PersonnelStatus.CAMP_FOLLOWER]: 'positive',
  [PersonnelStatus.RETIRED]: 'neutral',
  [PersonnelStatus.STUDENT]: 'positive',
  [PersonnelStatus.MISSING]: 'warning',
  [PersonnelStatus.DESERTED]: 'warning',
  [PersonnelStatus.AWOL]: 'warning',

  // Absent - warning
  [PersonnelStatus.ON_LEAVE]: 'neutral',
  [PersonnelStatus.ON_MATERNITY_LEAVE]: 'neutral',
  [PersonnelStatus.POW]: 'warning',
  [PersonnelStatus.BACKGROUND_CHARACTER]: 'neutral',

  // Departed - neutral/warning
  [PersonnelStatus.RESIGNED]: 'neutral',
  [PersonnelStatus.FIRED]: 'warning',
  [PersonnelStatus.LEFT]: 'neutral',
  [PersonnelStatus.SACKED]: 'warning',
  [PersonnelStatus.DEFECTED]: 'negative',
  [PersonnelStatus.STUDENT_GRADUATED]: 'positive',
  [PersonnelStatus.RETIRED_FROM_WOUNDS]: 'warning',
  [PersonnelStatus.MEDICAL_RETIREMENT]: 'warning',
  [PersonnelStatus.CONTRACT_ENDED]: 'neutral',

  // Dead - negative
  [PersonnelStatus.KIA]: 'negative',
  [PersonnelStatus.ACCIDENTAL_DEATH]: 'negative',
  [PersonnelStatus.DISEASE]: 'negative',
  [PersonnelStatus.NATURAL_CAUSES]: 'negative',
  [PersonnelStatus.MURDER]: 'negative',
  [PersonnelStatus.WOUNDS]: 'negative',
  [PersonnelStatus.MIA_PRESUMED_DEAD]: 'negative',
  [PersonnelStatus.OLD_AGE]: 'negative',
  [PersonnelStatus.PREGNANCY_COMPLICATIONS]: 'negative',
  [PersonnelStatus.UNDETERMINED]: 'negative',
  [PersonnelStatus.MEDICAL_COMPLICATIONS]: 'negative',
  [PersonnelStatus.SUICIDE]: 'negative',
  [PersonnelStatus.EXECUTION]: 'negative',
  [PersonnelStatus.MISSING_PRESUMED_DEAD]: 'negative',

  // Other
  [PersonnelStatus.DEPENDENT]: 'neutral',

  // MekStation-specific
  [PersonnelStatus.WOUNDED]: 'warning',
  [PersonnelStatus.MIA]: 'warning',
};

export const ALL_PERSONNEL_STATUSES: readonly PersonnelStatus[] = Object.freeze([
  PersonnelStatus.ACTIVE,
  PersonnelStatus.CAMP_FOLLOWER,
  PersonnelStatus.RETIRED,
  PersonnelStatus.STUDENT,
  PersonnelStatus.MISSING,
  PersonnelStatus.DESERTED,
  PersonnelStatus.AWOL,
  PersonnelStatus.ON_LEAVE,
  PersonnelStatus.ON_MATERNITY_LEAVE,
  PersonnelStatus.POW,
  PersonnelStatus.BACKGROUND_CHARACTER,
  PersonnelStatus.RESIGNED,
  PersonnelStatus.FIRED,
  PersonnelStatus.LEFT,
  PersonnelStatus.SACKED,
  PersonnelStatus.DEFECTED,
  PersonnelStatus.STUDENT_GRADUATED,
  PersonnelStatus.RETIRED_FROM_WOUNDS,
  PersonnelStatus.MEDICAL_RETIREMENT,
  PersonnelStatus.CONTRACT_ENDED,
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
  PersonnelStatus.DEPENDENT,
  PersonnelStatus.WOUNDED,
  PersonnelStatus.MIA,
]);

/**
 * Check if a value is a valid PersonnelStatus
 */
export function isValidPersonnelStatus(value: unknown): value is PersonnelStatus {
  return Object.values(PersonnelStatus).includes(value as PersonnelStatus);
}

/**
 * Display name for PersonnelStatus
 */
export function displayPersonnelStatus(status: PersonnelStatus): string {
  return status;
}
