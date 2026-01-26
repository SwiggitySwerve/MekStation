/**
 * MissionStatus - Campaign mission status enumeration
 * Defines the outcome status of a mission.
 */

/**
 * Mission outcome status
 */
export enum MissionStatus {
  /** Mission currently active/in progress */
  ACTIVE = 'Active',
  
  /** Mission completed successfully */
  SUCCESS = 'Success',
  
  /** Mission partially completed */
  PARTIAL = 'Partial Success',
  
  /** Mission failed */
  FAILED = 'Failed',
  
  /** Mission resulted in unit breach/rout */
  BREACH = 'Breach',
  
  /** Mission cancelled */
  CANCELLED = 'Cancelled',
  
  /** Mission pending start */
  PENDING = 'Pending',
  
  /** Mission aborted */
  ABORTED = 'Aborted',
}

/**
 * Array of all valid MissionStatus values for iteration
 */
export const ALL_MISSION_STATUSES: readonly MissionStatus[] = Object.freeze([
  MissionStatus.ACTIVE,
  MissionStatus.SUCCESS,
  MissionStatus.PARTIAL,
  MissionStatus.FAILED,
  MissionStatus.BREACH,
  MissionStatus.CANCELLED,
  MissionStatus.PENDING,
  MissionStatus.ABORTED,
]);

/**
 * Check if a value is a valid MissionStatus
 */
export function isValidMissionStatus(value: unknown): value is MissionStatus {
  return Object.values(MissionStatus).includes(value as MissionStatus);
}

/**
 * Display name for MissionStatus
 */
export function displayMissionStatus(status: MissionStatus): string {
  return status;
}
