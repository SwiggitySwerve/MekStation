/**
 * CampaignPersonnelRole - Campaign personnel role enumeration
 * Defines the roles personnel can have in a campaign.
 * 
 * Expanded from basic pilot roles to include support personnel.
 */

/**
 * Personnel role in campaign
 */
export enum CampaignPersonnelRole {
  /** Mech pilot */
  PILOT = 'Pilot',
  
  /** Aerospace pilot */
  AEROSPACE_PILOT = 'Aerospace Pilot',
  
  /** Vehicle driver */
  VEHICLE_DRIVER = 'Vehicle Driver',
  
  /** Technician - maintains equipment */
  TECH = 'Technician',
  
  /** Doctor - medical personnel */
  DOCTOR = 'Doctor',
  
  /** Administrator - logistics and command */
  ADMIN = 'Administrator',
  
  /** Medic - field medical support */
  MEDIC = 'Medic',
  
  /** Support staff */
  SUPPORT = 'Support Staff',
  
  /** Soldier - infantry */
  SOLDIER = 'Soldier',
  
  /** Unassigned */
  UNASSIGNED = 'Unassigned',
}

/**
 * Array of all valid CampaignPersonnelRole values for iteration
 */
export const ALL_CAMPAIGN_PERSONNEL_ROLES: readonly CampaignPersonnelRole[] = Object.freeze([
  CampaignPersonnelRole.PILOT,
  CampaignPersonnelRole.AEROSPACE_PILOT,
  CampaignPersonnelRole.VEHICLE_DRIVER,
  CampaignPersonnelRole.TECH,
  CampaignPersonnelRole.DOCTOR,
  CampaignPersonnelRole.ADMIN,
  CampaignPersonnelRole.MEDIC,
  CampaignPersonnelRole.SUPPORT,
  CampaignPersonnelRole.SOLDIER,
  CampaignPersonnelRole.UNASSIGNED,
]);

/**
 * Check if a value is a valid CampaignPersonnelRole
 */
export function isValidCampaignPersonnelRole(value: unknown): value is CampaignPersonnelRole {
  return Object.values(CampaignPersonnelRole).includes(value as CampaignPersonnelRole);
}

/**
 * Display name for CampaignPersonnelRole
 */
export function displayCampaignPersonnelRole(role: CampaignPersonnelRole): string {
  return role;
}
