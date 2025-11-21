// Import realistic equipment database
import { 
  FULL_EQUIPMENT_DATABASE as NEW_EQUIPMENT_DB,
  getEquipmentByName,
  getJumpJetWeight,
  getHatchetSpecs,
  getSwordSpecs
} from './equipmentDatabase';

// Equipment data that can be shared across components
export interface EquipmentItem {
  id: string;
  name: string;
  damage: string | number;
  heat: number;
  minRange: number;
  range: string;
  shots: string;
  base: string;
  bv: number;
  weight: number;
  crits: number;
  reference?: string;
  year: number;
  techBase: string;
  category: string;
  isPrototype?: boolean;
  isOneShot?: boolean;
  isTorpedo?: boolean;
  isAmmo: boolean;
  weaponType?: string;
  techLevel?: string;
}

// Convert new equipment format to legacy format for compatibility
const convertToLegacyFormat = (items: typeof NEW_EQUIPMENT_DB): EquipmentItem[] => {
  return items.map(item => ({
    id: item.id,
    name: item.name,
    damage: item.damage || 0,
    heat: item.heat || 0,
    minRange: item.minRange || 0,
    range: item.range || '-',
    shots: item.shots || '-',
    base: item.techBase,
    bv: item.bv || 0,
    weight: item.weight,
    crits: item.crits,
    reference: 'TM',
    year: item.year,
    techBase: item.techBase,
    category: item.category,
    isPrototype: false,
    isOneShot: false,
    isTorpedo: false,
    isAmmo: item.category === 'Ammo',
    weaponType: item.category,
    techLevel: item.techLevel,
  }));
};

// Use the new realistic equipment database
export const EQUIPMENT_DATABASE: EquipmentItem[] = convertToLegacyFormat(NEW_EQUIPMENT_DB);

// Keep legacy database as fallback
export const LEGACY_EQUIPMENT_DATABASE: EquipmentItem[] = [
  // Ballistic Weapons (Inner Sphere)
  { id: '1', name: 'AC/2', damage: 2, heat: 1, minRange: 4, range: '8/16/24', shots: '-', base: 'All', bv: 37, weight: 6, crits: 1, reference: '208, TM', year: 2300, techBase: 'IS', category: 'Ballistic', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '2', name: 'AC/5', damage: 5, heat: 1, minRange: 3, range: '6/12/18', shots: '-', base: 'All', bv: 70, weight: 8, crits: 4, reference: '208, TM', year: 2300, techBase: 'IS', category: 'Ballistic', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '3', name: 'AC/10', damage: 10, heat: 3, minRange: 0, range: '5/10/15', shots: '-', base: 'All', bv: 123, weight: 12, crits: 7, reference: '208, TM', year: 2300, techBase: 'IS', category: 'Ballistic', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '4', name: 'AC/20', damage: 20, heat: 7, minRange: 0, range: '3/6/9', shots: '-', base: 'All', bv: 178, weight: 14, crits: 10, reference: '208, TM', year: 2300, techBase: 'IS', category: 'Ballistic', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '21', name: 'Machine Gun', damage: 2, heat: 0, minRange: 0, range: '1/2/3', shots: '-', base: 'All', bv: 5, weight: 0.5, crits: 1, reference: '228, TM', year: 1950, techBase: 'IS', category: 'Ballistic', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '22', name: 'Gauss Rifle', damage: 15, heat: 1, minRange: 2, range: '7/15/22', shots: '-', base: 'All', bv: 320, weight: 15, crits: 7, reference: '219, TM', year: 2590, techBase: 'IS', category: 'Ballistic', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '23', name: 'Light Gauss Rifle', damage: 8, heat: 1, minRange: 3, range: '8/17/25', shots: '-', base: 'All', bv: 159, weight: 12, crits: 5, reference: '219, TM', year: 3056, techBase: 'IS', category: 'Ballistic', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '24', name: 'Ultra AC/5', damage: 5, heat: 1, minRange: 2, range: '6/13/20', shots: '-', base: 'All', bv: 112, weight: 9, crits: 5, reference: '208, TM', year: 3035, techBase: 'IS', category: 'Ballistic', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '25', name: 'LB 10-X AC', damage: 10, heat: 2, minRange: 0, range: '6/12/18', shots: '-', base: 'All', bv: 148, weight: 11, crits: 6, reference: '208, TM', year: 2595, techBase: 'IS', category: 'Ballistic', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  
  // Energy Weapons (Inner Sphere)
  { id: '5', name: 'Medium Laser', damage: 5, heat: 3, minRange: 0, range: '3/6/9', shots: '-', base: 'All', bv: 46, weight: 1, crits: 1, reference: '227, TM', year: 2300, techBase: 'IS', category: 'Energy', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '6', name: 'Large Laser', damage: 8, heat: 8, minRange: 0, range: '5/10/15', shots: '-', base: 'All', bv: 123, weight: 5, crits: 2, reference: '227, TM', year: 2300, techBase: 'IS', category: 'Energy', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '7', name: 'Small Laser', damage: 3, heat: 1, minRange: 0, range: '1/2/3', shots: '-', base: 'All', bv: 9, weight: 0.5, crits: 1, reference: '227, TM', year: 2300, techBase: 'IS', category: 'Energy', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '8', name: 'PPC', damage: 10, heat: 10, minRange: 3, range: '6/12/18', shots: '-', base: 'All', bv: 176, weight: 7, crits: 3, reference: '229, TM', year: 2751, techBase: 'IS', category: 'Energy', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '20', name: 'Flamer', damage: 2, heat: 3, minRange: 0, range: '1/2/3', shots: '-', base: 'All', bv: 6, weight: 1, crits: 1, reference: '218, TM', year: 2025, techBase: 'IS', category: 'Energy', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '26', name: 'ER Large Laser', damage: 8, heat: 12, minRange: 0, range: '7/14/19', shots: '-', base: 'All', bv: 163, weight: 5, crits: 2, reference: '226, TM', year: 2620, techBase: 'IS', category: 'Energy', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '27', name: 'ER PPC', damage: 10, heat: 15, minRange: 0, range: '7/14/23', shots: '-', base: 'All', bv: 229, weight: 7, crits: 3, reference: '229, TM', year: 2751, techBase: 'IS', category: 'Energy', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '28', name: 'Medium Pulse Laser', damage: 6, heat: 4, minRange: 0, range: '2/4/6', shots: '-', base: 'All', bv: 48, weight: 2, crits: 1, reference: '226, TM', year: 2609, techBase: 'IS', category: 'Energy', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '29', name: 'Large Pulse Laser', damage: 9, heat: 10, minRange: 0, range: '3/7/10', shots: '-', base: 'All', bv: 119, weight: 7, crits: 2, reference: '226, TM', year: 2609, techBase: 'IS', category: 'Energy', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '30', name: 'Small Pulse Laser', damage: 3, heat: 2, minRange: 0, range: '1/2/3', shots: '-', base: 'All', bv: 12, weight: 1, crits: 1, reference: '226, TM', year: 2609, techBase: 'IS', category: 'Energy', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  
  // Missile Weapons (Inner Sphere)
  { id: '9', name: 'LRM 5', damage: '1/msl', heat: 2, minRange: 6, range: '7/14/21', shots: '-', base: 'IS', bv: 45, weight: 2, crits: 1, reference: '229, TM', year: 2300, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '10', name: 'LRM 10', damage: '1/msl', heat: 4, minRange: 6, range: '7/14/21', shots: '-', base: 'IS', bv: 104, weight: 5, crits: 2, reference: '229, TM', year: 2300, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '11', name: 'LRM 15', damage: '1/msl', heat: 5, minRange: 6, range: '7/14/21', shots: '-', base: 'IS', bv: 157, weight: 7, crits: 3, reference: '229, TM', year: 2300, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '12', name: 'LRM 20', damage: '1/msl', heat: 6, minRange: 6, range: '7/14/21', shots: '-', base: 'IS', bv: 210, weight: 10, crits: 5, reference: '229, TM', year: 2300, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '13', name: 'SRM 2', damage: '2/msl', heat: 2, minRange: 0, range: '3/6/9', shots: '-', base: 'All', bv: 21, weight: 1, crits: 1, reference: '229, TM', year: 2370, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '14', name: 'SRM 4', damage: '2/msl', heat: 3, minRange: 0, range: '3/6/9', shots: '-', base: 'All', bv: 39, weight: 2, crits: 1, reference: '229, TM', year: 2370, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '15', name: 'SRM 6', damage: '2/msl', heat: 4, minRange: 0, range: '3/6/9', shots: '-', base: 'All', bv: 59, weight: 3, crits: 2, reference: '229, TM', year: 2370, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '31', name: 'Streak SRM 2', damage: '2/msl', heat: 2, minRange: 0, range: '3/6/9', shots: '-', base: 'All', bv: 30, weight: 1.5, crits: 1, reference: '230, TM', year: 2665, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '32', name: 'Streak SRM 4', damage: '2/msl', heat: 3, minRange: 0, range: '3/6/9', shots: '-', base: 'All', bv: 59, weight: 3, crits: 1, reference: '230, TM', year: 2665, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '33', name: 'Streak SRM 6', damage: '2/msl', heat: 4, minRange: 0, range: '3/6/9', shots: '-', base: 'All', bv: 89, weight: 4.5, crits: 2, reference: '230, TM', year: 2665, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '34', name: 'MRM 10', damage: 1, heat: 4, minRange: 0, range: '3/8/15', shots: '-', base: 'IS', bv: 56, weight: 3, crits: 2, reference: '229, TM', year: 3058, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '35', name: 'MRM 20', damage: 1, heat: 6, minRange: 0, range: '3/8/15', shots: '-', base: 'IS', bv: 112, weight: 7, crits: 3, reference: '229, TM', year: 3058, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '36', name: 'MRM 30', damage: 1, heat: 10, minRange: 0, range: '3/8/15', shots: '-', base: 'IS', bv: 168, weight: 10, crits: 5, reference: '229, TM', year: 3058, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '37', name: 'MRM 40', damage: 1, heat: 12, minRange: 0, range: '3/8/15', shots: '-', base: 'IS', bv: 224, weight: 12, crits: 7, reference: '229, TM', year: 3058, techBase: 'IS', category: 'Missile', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  
  // Ammunition (Inner Sphere)
  { id: '100', name: 'AC/2 Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '45', base: 'All', bv: 5, weight: 1, crits: 1, reference: '208, TM', year: 2300, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '101', name: 'AC/5 Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '20', base: 'All', bv: 9, weight: 1, crits: 1, reference: '208, TM', year: 2300, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '102', name: 'AC/10 Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '10', base: 'All', bv: 15, weight: 1, crits: 1, reference: '208, TM', year: 2300, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '103', name: 'AC/20 Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '5', base: 'All', bv: 22, weight: 1, crits: 1, reference: '208, TM', year: 2300, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '104', name: 'Machine Gun Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '200', base: 'All', bv: 1, weight: 1, crits: 1, reference: '228, TM', year: 1950, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '105', name: 'Gauss Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '8', base: 'All', bv: 40, weight: 1, crits: 1, reference: '219, TM', year: 2590, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '106', name: 'Light Gauss Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '16', base: 'All', bv: 20, weight: 1, crits: 1, reference: '219, TM', year: 3056, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '107', name: 'LRM Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '120', base: 'IS', bv: 6, weight: 1, crits: 1, reference: '229, TM', year: 2300, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '108', name: 'SRM Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '100', base: 'All', bv: 3, weight: 1, crits: 1, reference: '229, TM', year: 2370, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '109', name: 'Streak SRM Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '100', base: 'All', bv: 4, weight: 1, crits: 1, reference: '230, TM', year: 2665, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '110', name: 'MRM Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '240', base: 'IS', bv: 3, weight: 1, crits: 1, reference: '229, TM', year: 3058, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '111', name: 'Ultra AC/5 Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '20', base: 'All', bv: 14, weight: 1, crits: 1, reference: '208, TM', year: 3035, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '112', name: 'LB 10-X Cluster Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '10', base: 'All', bv: 19, weight: 1, crits: 1, reference: '208, TM', year: 2595, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '113', name: 'LB 10-X Slug Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '10', base: 'All', bv: 15, weight: 1, crits: 1, reference: '208, TM', year: 2595, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  { id: '115', name: 'AMS Ammo', damage: 0, heat: 0, minRange: 0, range: '-', shots: '12', base: 'All', bv: 11, weight: 1, crits: 1, reference: '204, TM', year: 3045, techBase: 'IS', category: 'Ammunition', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: true },
  
  // Equipment - Heat Sinks
  { id: '200', name: 'Heat Sink', damage: 0, heat: -1, minRange: 0, range: '-', shots: '-', base: 'All', bv: 0, weight: 1, crits: 1, reference: '250, TM', year: 2022, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '201', name: 'Double Heat Sink', damage: 0, heat: -2, minRange: 0, range: '-', shots: '-', base: 'All', bv: 0, weight: 1, crits: 3, reference: '250, TM', year: 2567, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  
  // Equipment - Jump Jets
  { id: '202', name: 'Jump Jet', damage: 0, heat: 0, minRange: 0, range: '-', shots: '-', base: 'All', bv: 0, weight: 0.5, crits: 1, reference: '248, TM', year: 2471, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '203', name: 'Improved Jump Jet', damage: 0, heat: 0, minRange: 0, range: '-', shots: '-', base: 'All', bv: 0, weight: 1, crits: 2, reference: '248, TM', year: 3069, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  
  // Equipment - Electronics
  { id: '207', name: 'C3 Slave', damage: 0, heat: 0, minRange: 0, range: '-', shots: '-', base: 'IS', bv: 0, weight: 1, crits: 1, reference: '212, TM', year: 3050, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '208', name: 'C3 Master Computer', damage: 0, heat: 0, minRange: 0, range: '-', shots: '-', base: 'IS', bv: 0, weight: 5, crits: 5, reference: '212, TM', year: 3050, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '209', name: 'C3i Computer', damage: 0, heat: 0, minRange: 0, range: '-', shots: '-', base: 'IS', bv: 0, weight: 2.5, crits: 2, reference: '212, TM', year: 3062, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '210', name: 'TAG', damage: 0, heat: 0, minRange: 0, range: '5/9/15', shots: '-', base: 'All', bv: 0, weight: 1, crits: 1, reference: '237, TM', year: 2600, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '211', name: 'ECM Suite', damage: 0, heat: 0, minRange: 0, range: '-', shots: '-', base: 'All', bv: 61, weight: 1.5, crits: 2, reference: '213, TM', year: 2597, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '212', name: 'Active Probe', damage: 0, heat: 0, minRange: 0, range: '-', shots: '-', base: 'All', bv: 12, weight: 1, crits: 1, reference: '203, TM', year: 3023, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '213', name: 'Targeting Computer', damage: 0, heat: 0, minRange: 0, range: '-', shots: '-', base: 'All', bv: 0, weight: 1, crits: 1, reference: '238, TM', year: 3062, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  
  // Equipment - Defensive
  { id: '214', name: 'AMS', damage: 0, heat: 1, minRange: 0, range: '-', shots: '-', base: 'All', bv: 32, weight: 0.5, crits: 1, reference: '204, TM', year: 3045, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
  { id: '216', name: 'CASE', damage: 0, heat: 0, minRange: 0, range: '-', shots: '-', base: 'IS', bv: 0, weight: 0.5, crits: 1, reference: '210, TM', year: 3036, techBase: 'IS', category: 'Equipment', isPrototype: false, isOneShot: false, isTorpedo: false, isAmmo: false },
];

// Calculate heat generation from weapons
export function calculateHeatGeneration(weapons: { item_name: string }[]): number {
  return weapons.reduce((total, weapon) => {
    const equipment = EQUIPMENT_DATABASE.find(e => e.name === weapon.item_name);
    return total + (equipment?.heat || 0);
  }, 0);
}

// Calculate total equipment weight
export function calculateEquipmentWeight(equipment: { item_name: string }[]): number {
  return equipment.reduce((total, item) => {
    const equip = EQUIPMENT_DATABASE.find(e => e.name === item.item_name);
    return total + (equip?.weight || 0);
  }, 0);
}

// Calculate total critical slots used
export function calculateCriticalSlots(equipment: { item_name: string }[]): number {
  return equipment.reduce((total, item) => {
    const equip = EQUIPMENT_DATABASE.find(e => e.name === item.item_name);
    return total + (equip?.crits || 0);
  }, 0);
}

// Calculate battle value from equipment
export function calculateEquipmentBV(equipment: { item_name: string }[]): number {
  return equipment.reduce((total, item) => {
    const equip = EQUIPMENT_DATABASE.find(e => e.name === item.item_name);
    return total + (equip?.bv || 0);
  }, 0);
}
