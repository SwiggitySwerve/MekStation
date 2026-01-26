/**
 * Role base salary mapping
 * Defines monthly C-bill salaries for all 48 campaign personnel roles
 */

import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

/**
 * Base monthly salary in C-bills for each role
 * Salaries reflect skill level, responsibility, and market rates in the BattleTech universe
 */
export const BASE_SALARY_BY_ROLE: Record<CampaignPersonnelRole, number> = {
  // Combat Roles (14)
  [CampaignPersonnelRole.PILOT]: 1500,
  [CampaignPersonnelRole.LAM_PILOT]: 1500,
  [CampaignPersonnelRole.AEROSPACE_PILOT]: 1500,
  [CampaignPersonnelRole.VEHICLE_DRIVER]: 900,
  [CampaignPersonnelRole.VEHICLE_CREW_NAVAL]: 800,
  [CampaignPersonnelRole.VEHICLE_CREW_VTOL]: 900,
  [CampaignPersonnelRole.CONVENTIONAL_AIRCRAFT_PILOT]: 1200,
  [CampaignPersonnelRole.PROTOMEK_PILOT]: 1200,
  [CampaignPersonnelRole.BATTLE_ARMOUR]: 1200,
  [CampaignPersonnelRole.SOLDIER]: 600,
  [CampaignPersonnelRole.VESSEL_PILOT]: 1100,
  [CampaignPersonnelRole.VESSEL_GUNNER]: 900,
  [CampaignPersonnelRole.VESSEL_CREW]: 700,
  [CampaignPersonnelRole.VESSEL_NAVIGATOR]: 1000,

  // Support Roles (12)
  [CampaignPersonnelRole.TECH]: 800,
  [CampaignPersonnelRole.MEK_TECH]: 800,
  [CampaignPersonnelRole.MECHANIC]: 700,
  [CampaignPersonnelRole.AERO_TEK]: 800,
  [CampaignPersonnelRole.BA_TECH]: 800,
  [CampaignPersonnelRole.ASTECH]: 500,
  [CampaignPersonnelRole.DOCTOR]: 1200,
  [CampaignPersonnelRole.MEDIC]: 600,
  [CampaignPersonnelRole.ADMIN_COMMAND]: 700,
  [CampaignPersonnelRole.ADMIN_LOGISTICS]: 700,
  [CampaignPersonnelRole.ADMIN_TRANSPORT]: 700,
  [CampaignPersonnelRole.ADMIN_HR]: 700,

  // Civilian Roles (19)
  [CampaignPersonnelRole.DEPENDENT]: 0,
  [CampaignPersonnelRole.CIVILIAN_OTHER]: 400,
  [CampaignPersonnelRole.MERCHANT]: 600,
  [CampaignPersonnelRole.TEACHER]: 500,
  [CampaignPersonnelRole.LAWYER]: 800,
  [CampaignPersonnelRole.MUSICIAN]: 400,
  [CampaignPersonnelRole.CHEF]: 500,
  [CampaignPersonnelRole.BARTENDER]: 400,
  [CampaignPersonnelRole.FIREFIGHTER]: 600,
  [CampaignPersonnelRole.FARMER]: 400,
  [CampaignPersonnelRole.MINER]: 500,
  [CampaignPersonnelRole.FACTORY_WORKER]: 500,
  [CampaignPersonnelRole.COURIER]: 500,
  [CampaignPersonnelRole.GAMBLER]: 300,
  [CampaignPersonnelRole.HISTORIAN]: 600,
  [CampaignPersonnelRole.PAINTER]: 400,
  [CampaignPersonnelRole.RELIGIOUS_LEADER]: 500,
  [CampaignPersonnelRole.PSYCHOLOGIST]: 700,
  [CampaignPersonnelRole.NOBLE]: 1000,

  // Legacy Roles (3)
  [CampaignPersonnelRole.ADMIN]: 700,
  [CampaignPersonnelRole.SUPPORT]: 500,
  [CampaignPersonnelRole.UNASSIGNED]: 0,
};

/**
 * Get the base monthly salary for a given role
 * @param role The campaign personnel role
 * @returns Monthly salary in C-bills (defaults to 500 if role not found)
 */
export function getBaseSalary(role: CampaignPersonnelRole): number {
  return BASE_SALARY_BY_ROLE[role] ?? 500;
}
