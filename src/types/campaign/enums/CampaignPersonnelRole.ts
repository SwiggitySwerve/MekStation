export enum CampaignPersonnelRole {
  // Combat (14)
  PILOT = 'Pilot',
  LAM_PILOT = 'LAM Pilot',
  AEROSPACE_PILOT = 'Aerospace Pilot',
  VEHICLE_DRIVER = 'Vehicle Driver',
  VEHICLE_CREW_NAVAL = 'Naval Vehicle Crew',
  VEHICLE_CREW_VTOL = 'VTOL Pilot',
  CONVENTIONAL_AIRCRAFT_PILOT = 'Conv. Aircraft Pilot',
  PROTOMEK_PILOT = 'ProtoMech Pilot',
  BATTLE_ARMOUR = 'Battle Armor',
  SOLDIER = 'Soldier',
  VESSEL_PILOT = 'Vessel Pilot',
  VESSEL_GUNNER = 'Vessel Gunner',
  VESSEL_CREW = 'Vessel Crew',
  VESSEL_NAVIGATOR = 'Vessel Navigator',

  // Support (12)
  TECH = 'Technician',
  MEK_TECH = 'Mech Tech',
  MECHANIC = 'Mechanic',
  AERO_TEK = 'Aero Tech',
  BA_TECH = 'BA Tech',
  ASTECH = 'AsTech',
  DOCTOR = 'Doctor',
  MEDIC = 'Medic',
  ADMIN_COMMAND = 'Admin (Command)',
  ADMIN_LOGISTICS = 'Admin (Logistics)',
  ADMIN_TRANSPORT = 'Admin (Transport)',
  ADMIN_HR = 'Admin (HR)',

  // Civilian (20)
  DEPENDENT = 'Dependent',
  CIVILIAN_OTHER = 'Civilian',
  MERCHANT = 'Merchant',
  TEACHER = 'Teacher',
  LAWYER = 'Lawyer',
  MUSICIAN = 'Musician',
  CHEF = 'Chef',
  BARTENDER = 'Bartender',
  FIREFIGHTER = 'Firefighter',
  FARMER = 'Farmer',
  MINER = 'Miner',
  FACTORY_WORKER = 'Factory Worker',
  COURIER = 'Courier',
  GAMBLER = 'Gambler',
  HISTORIAN = 'Historian',
  PAINTER = 'Painter',
  RELIGIOUS_LEADER = 'Religious Leader',
  PSYCHOLOGIST = 'Psychologist',
  NOBLE = 'Noble',

  // Legacy (3)
  ADMIN = 'Administrator',
  SUPPORT = 'Support Staff',
  UNASSIGNED = 'Unassigned',
}

export type RoleCategory = 'combat' | 'support' | 'civilian';

const COMBAT_ROLES = new Set([
  CampaignPersonnelRole.PILOT,
  CampaignPersonnelRole.LAM_PILOT,
  CampaignPersonnelRole.AEROSPACE_PILOT,
  CampaignPersonnelRole.VEHICLE_DRIVER,
  CampaignPersonnelRole.VEHICLE_CREW_NAVAL,
  CampaignPersonnelRole.VEHICLE_CREW_VTOL,
  CampaignPersonnelRole.CONVENTIONAL_AIRCRAFT_PILOT,
  CampaignPersonnelRole.PROTOMEK_PILOT,
  CampaignPersonnelRole.BATTLE_ARMOUR,
  CampaignPersonnelRole.SOLDIER,
  CampaignPersonnelRole.VESSEL_PILOT,
  CampaignPersonnelRole.VESSEL_GUNNER,
  CampaignPersonnelRole.VESSEL_CREW,
  CampaignPersonnelRole.VESSEL_NAVIGATOR,
]);

const SUPPORT_ROLES = new Set([
  CampaignPersonnelRole.TECH,
  CampaignPersonnelRole.MEK_TECH,
  CampaignPersonnelRole.MECHANIC,
  CampaignPersonnelRole.AERO_TEK,
  CampaignPersonnelRole.BA_TECH,
  CampaignPersonnelRole.ASTECH,
  CampaignPersonnelRole.DOCTOR,
  CampaignPersonnelRole.MEDIC,
  CampaignPersonnelRole.ADMIN_COMMAND,
  CampaignPersonnelRole.ADMIN_LOGISTICS,
  CampaignPersonnelRole.ADMIN_TRANSPORT,
  CampaignPersonnelRole.ADMIN_HR,
]);

const CIVILIAN_ROLES = new Set([
  CampaignPersonnelRole.DEPENDENT,
  CampaignPersonnelRole.CIVILIAN_OTHER,
  CampaignPersonnelRole.MERCHANT,
  CampaignPersonnelRole.TEACHER,
  CampaignPersonnelRole.LAWYER,
  CampaignPersonnelRole.MUSICIAN,
  CampaignPersonnelRole.CHEF,
  CampaignPersonnelRole.BARTENDER,
  CampaignPersonnelRole.FIREFIGHTER,
  CampaignPersonnelRole.FARMER,
  CampaignPersonnelRole.MINER,
  CampaignPersonnelRole.FACTORY_WORKER,
  CampaignPersonnelRole.COURIER,
  CampaignPersonnelRole.GAMBLER,
  CampaignPersonnelRole.HISTORIAN,
  CampaignPersonnelRole.PAINTER,
  CampaignPersonnelRole.RELIGIOUS_LEADER,
  CampaignPersonnelRole.PSYCHOLOGIST,
  CampaignPersonnelRole.NOBLE,
]);

export const ALL_CAMPAIGN_PERSONNEL_ROLES: readonly CampaignPersonnelRole[] =
  Object.freeze([
    CampaignPersonnelRole.PILOT,
    CampaignPersonnelRole.LAM_PILOT,
    CampaignPersonnelRole.AEROSPACE_PILOT,
    CampaignPersonnelRole.VEHICLE_DRIVER,
    CampaignPersonnelRole.VEHICLE_CREW_NAVAL,
    CampaignPersonnelRole.VEHICLE_CREW_VTOL,
    CampaignPersonnelRole.CONVENTIONAL_AIRCRAFT_PILOT,
    CampaignPersonnelRole.PROTOMEK_PILOT,
    CampaignPersonnelRole.BATTLE_ARMOUR,
    CampaignPersonnelRole.SOLDIER,
    CampaignPersonnelRole.VESSEL_PILOT,
    CampaignPersonnelRole.VESSEL_GUNNER,
    CampaignPersonnelRole.VESSEL_CREW,
    CampaignPersonnelRole.VESSEL_NAVIGATOR,
    CampaignPersonnelRole.TECH,
    CampaignPersonnelRole.MEK_TECH,
    CampaignPersonnelRole.MECHANIC,
    CampaignPersonnelRole.AERO_TEK,
    CampaignPersonnelRole.BA_TECH,
    CampaignPersonnelRole.ASTECH,
    CampaignPersonnelRole.DOCTOR,
    CampaignPersonnelRole.MEDIC,
    CampaignPersonnelRole.ADMIN_COMMAND,
    CampaignPersonnelRole.ADMIN_LOGISTICS,
    CampaignPersonnelRole.ADMIN_TRANSPORT,
    CampaignPersonnelRole.ADMIN_HR,
    CampaignPersonnelRole.DEPENDENT,
    CampaignPersonnelRole.CIVILIAN_OTHER,
    CampaignPersonnelRole.MERCHANT,
    CampaignPersonnelRole.TEACHER,
    CampaignPersonnelRole.LAWYER,
    CampaignPersonnelRole.MUSICIAN,
    CampaignPersonnelRole.CHEF,
    CampaignPersonnelRole.BARTENDER,
    CampaignPersonnelRole.FIREFIGHTER,
    CampaignPersonnelRole.FARMER,
    CampaignPersonnelRole.MINER,
    CampaignPersonnelRole.FACTORY_WORKER,
    CampaignPersonnelRole.COURIER,
    CampaignPersonnelRole.GAMBLER,
    CampaignPersonnelRole.HISTORIAN,
    CampaignPersonnelRole.PAINTER,
    CampaignPersonnelRole.RELIGIOUS_LEADER,
    CampaignPersonnelRole.PSYCHOLOGIST,
    CampaignPersonnelRole.NOBLE,
    CampaignPersonnelRole.ADMIN,
    CampaignPersonnelRole.SUPPORT,
    CampaignPersonnelRole.UNASSIGNED,
  ]);

export function isValidCampaignPersonnelRole(
  value: unknown,
): value is CampaignPersonnelRole {
  return Object.values(CampaignPersonnelRole).includes(
    value as CampaignPersonnelRole,
  );
}

export function displayCampaignPersonnelRole(
  role: CampaignPersonnelRole,
): string {
  return role;
}

export function getRoleCategory(role: CampaignPersonnelRole): RoleCategory {
  if (COMBAT_ROLES.has(role)) {
    return 'combat';
  }
  if (SUPPORT_ROLES.has(role)) {
    return 'support';
  }
  return 'civilian';
}

export function isCombatRole(role: CampaignPersonnelRole): boolean {
  return COMBAT_ROLES.has(role);
}

export function isSupportRole(role: CampaignPersonnelRole): boolean {
  return SUPPORT_ROLES.has(role);
}

export function isCivilianRole(role: CampaignPersonnelRole): boolean {
  return CIVILIAN_ROLES.has(role);
}

export function getRolesByCategory(
  category: RoleCategory,
): CampaignPersonnelRole[] {
  if (category === 'combat') {
    return Array.from(COMBAT_ROLES);
  }
  if (category === 'support') {
    return Array.from(SUPPORT_ROLES);
  }
  return Array.from(CIVILIAN_ROLES);
}
