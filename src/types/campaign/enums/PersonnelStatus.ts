/**
 * PersonnelStatus - Campaign personnel status enumeration
 * Defines the operational status of personnel in a campaign.
 * 
 * Based on MekHQ personnel status model with essential statuses for MVP.
 */

/**
 * Personnel operational status in campaign
 */
export enum PersonnelStatus {
  /** Personnel actively serving in the unit */
  ACTIVE = 'Active',
  
  /** Personnel missing in action */
  MIA = 'MIA',
  
  /** Personnel killed in action */
  KIA = 'KIA',
  
  /** Personnel retired from service */
  RETIRED = 'Retired',
  
  /** Personnel wounded and recovering */
  WOUNDED = 'Wounded',
  
  /** Personnel on leave */
  ON_LEAVE = 'On Leave',
  
  /** Personnel prisoner of war */
  POW = 'POW',
  
  /** Personnel absent without leave */
  AWOL = 'AWOL',
  
  /** Personnel deserted */
  DESERTED = 'Deserted',
  
  /** Personnel student/training */
  STUDENT = 'Student',
}

/**
 * Array of all valid PersonnelStatus values for iteration
 */
export const ALL_PERSONNEL_STATUSES: readonly PersonnelStatus[] = Object.freeze([
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
