/**
 * Equipment Database with Realistic BattleTech Values
 * Includes accurate tonnage and critical slot requirements
 */

export interface EquipmentItem {
  id: string;
  name: string;
  category: 'Energy' | 'Ballistic' | 'Missile' | 'Artillery' | 'Physical' | 'Electronics' | 'Equipment' | 'Ammo';
  weight: number;  // in tons
  crits: number;   // critical slots required
  damage?: number | string;
  heat?: number;
  minRange?: number;
  range?: string;  // e.g., "3/6/9"
  shots?: string;  // for ammo
  techBase: 'IS' | 'Clan' | 'Both';
  techLevel: 'Introductory' | 'Standard' | 'Advanced' | 'Experimental';
  year: number;
  bv?: number;     // Battle Value
  cost?: number;   // C-bills
  ammoFor?: string; // For ammo items, what weapon they're for
  special?: string[]; // Special rules
}

// Energy Weapons
export const ENERGY_WEAPONS: EquipmentItem[] = [
  // Inner Sphere Energy
  {
    id: 'small-laser',
    name: 'Small Laser',
    category: 'Energy',
    weight: 0.5,
    crits: 1,
    damage: 3,
    heat: 1,
    minRange: 0,
    range: '1/2/3',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2300,
    bv: 9,
  },
  {
    id: 'medium-laser',
    name: 'Medium Laser',
    category: 'Energy',
    weight: 1,
    crits: 1,
    damage: 5,
    heat: 3,
    minRange: 0,
    range: '3/6/9',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2300,
    bv: 46,
  },
  {
    id: 'large-laser',
    name: 'Large Laser',
    category: 'Energy',
    weight: 5,
    crits: 2,
    damage: 8,
    heat: 8,
    minRange: 0,
    range: '5/10/15',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2316,
    bv: 124,
  },
  {
    id: 'ppc',
    name: 'PPC',
    category: 'Energy',
    weight: 7,
    crits: 3,
    damage: 10,
    heat: 10,
    minRange: 3,
    range: '6/12/18',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2460,
    bv: 176,
  },
  {
    id: 'er-large-laser',
    name: 'ER Large Laser',
    category: 'Energy',
    weight: 5,
    crits: 2,
    damage: 8,
    heat: 12,
    minRange: 0,
    range: '7/14/19',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3037,
    bv: 163,
  },
  {
    id: 'er-ppc',
    name: 'ER PPC',
    category: 'Energy',
    weight: 7,
    crits: 3,
    damage: 10,
    heat: 15,
    minRange: 0,
    range: '7/14/23',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3037,
    bv: 229,
  },
  
  // Clan Energy
  {
    id: 'clan-er-small-laser',
    name: 'ER Small Laser (Clan)',
    category: 'Energy',
    weight: 0.5,
    crits: 1,
    damage: 5,
    heat: 2,
    minRange: 0,
    range: '2/4/5',
    techBase: 'Clan',
    techLevel: 'Standard',
    year: 2825,
    bv: 31,
  },
  {
    id: 'clan-er-medium-laser',
    name: 'ER Medium Laser (Clan)',
    category: 'Energy',
    weight: 1,
    crits: 1,
    damage: 7,
    heat: 5,
    minRange: 0,
    range: '5/10/15',
    techBase: 'Clan',
    techLevel: 'Standard',
    year: 2824,
    bv: 108,
  },
  {
    id: 'clan-er-large-laser',
    name: 'ER Large Laser (Clan)',
    category: 'Energy',
    weight: 4,
    crits: 1,
    damage: 10,
    heat: 12,
    minRange: 0,
    range: '8/15/25',
    techBase: 'Clan',
    techLevel: 'Standard',
    year: 2820,
    bv: 248,
  },
  
  // Pulse Lasers
  {
    id: 'small-pulse-laser',
    name: 'Small Pulse Laser',
    category: 'Energy',
    weight: 1,
    crits: 1,
    damage: 3,
    heat: 2,
    minRange: 0,
    range: '1/2/3',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3037,
    bv: 12,
    special: ['-2 to-hit'],
  },
  {
    id: 'medium-pulse-laser',
    name: 'Medium Pulse Laser',
    category: 'Energy',
    weight: 2,
    crits: 1,
    damage: 6,
    heat: 4,
    minRange: 0,
    range: '2/4/6',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3037,
    bv: 48,
    special: ['-2 to-hit'],
  },
  {
    id: 'large-pulse-laser',
    name: 'Large Pulse Laser',
    category: 'Energy',
    weight: 7,
    crits: 2,
    damage: 9,
    heat: 10,
    minRange: 0,
    range: '3/7/10',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3037,
    bv: 119,
    special: ['-2 to-hit'],
  },
];

// Ballistic Weapons
export const BALLISTIC_WEAPONS: EquipmentItem[] = [
  // Autocannons
  {
    id: 'ac2',
    name: 'AC/2',
    category: 'Ballistic',
    weight: 6,
    crits: 1,
    damage: 2,
    heat: 1,
    minRange: 4,
    range: '8/16/24',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2290,
    bv: 37,
  },
  {
    id: 'ac5',
    name: 'AC/5',
    category: 'Ballistic',
    weight: 8,
    crits: 4,
    damage: 5,
    heat: 1,
    minRange: 3,
    range: '6/12/18',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2240,
    bv: 70,
  },
  {
    id: 'ac10',
    name: 'AC/10',
    category: 'Ballistic',
    weight: 12,
    crits: 7,
    damage: 10,
    heat: 3,
    minRange: 0,
    range: '5/10/15',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2443,
    bv: 124,
  },
  {
    id: 'ac20',
    name: 'AC/20',
    category: 'Ballistic',
    weight: 14,
    crits: 10,
    damage: 20,
    heat: 7,
    minRange: 0,
    range: '3/6/9',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2490,
    bv: 178,
  },
  
  // Ultra Autocannons
  {
    id: 'uac2',
    name: 'Ultra AC/2',
    category: 'Ballistic',
    weight: 7,
    crits: 3,
    damage: '2/4',
    heat: 1,
    minRange: 2,
    range: '8/17/25',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3037,
    bv: 56,
    special: ['Double rate of fire'],
  },
  {
    id: 'uac5',
    name: 'Ultra AC/5',
    category: 'Ballistic',
    weight: 9,
    crits: 5,
    damage: '5/10',
    heat: 1,
    minRange: 0,
    range: '6/13/20',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3037,
    bv: 112,
    special: ['Double rate of fire'],
  },
  
  // LB-X Autocannons
  {
    id: 'lb10x',
    name: 'LB 10-X AC',
    category: 'Ballistic',
    weight: 11,
    crits: 6,
    damage: 10,
    heat: 2,
    minRange: 0,
    range: '6/12/18',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3035,
    bv: 148,
    special: ['Cluster ammo available'],
  },
  
  // Gauss Rifle
  {
    id: 'gauss-rifle',
    name: 'Gauss Rifle',
    category: 'Ballistic',
    weight: 15,
    crits: 7,
    damage: 15,
    heat: 1,
    minRange: 2,
    range: '7/15/22',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3040,
    bv: 320,
    special: ['Explodes on critical hit'],
  },
  
  // Machine Guns
  {
    id: 'machine-gun',
    name: 'Machine Gun',
    category: 'Ballistic',
    weight: 0.5,
    crits: 1,
    damage: 2,
    heat: 0,
    minRange: 0,
    range: '1/2/3',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 1950,
    bv: 5,
    special: ['+2 damage vs infantry'],
  },
];

// Missile Weapons
export const MISSILE_WEAPONS: EquipmentItem[] = [
  // SRM
  {
    id: 'srm2',
    name: 'SRM 2',
    category: 'Missile',
    weight: 1,
    crits: 1,
    damage: '2/missile',
    heat: 2,
    minRange: 0,
    range: '3/6/9',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2370,
    bv: 21,
  },
  {
    id: 'srm4',
    name: 'SRM 4',
    category: 'Missile',
    weight: 2,
    crits: 1,
    damage: '2/missile',
    heat: 3,
    minRange: 0,
    range: '3/6/9',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2370,
    bv: 39,
  },
  {
    id: 'srm6',
    name: 'SRM 6',
    category: 'Missile',
    weight: 3,
    crits: 2,
    damage: '2/missile',
    heat: 4,
    minRange: 0,
    range: '3/6/9',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2370,
    bv: 59,
  },
  
  // LRM
  {
    id: 'lrm5',
    name: 'LRM 5',
    category: 'Missile',
    weight: 2,
    crits: 1,
    damage: '1/missile',
    heat: 2,
    minRange: 6,
    range: '7/14/21',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2300,
    bv: 45,
  },
  {
    id: 'lrm10',
    name: 'LRM 10',
    category: 'Missile',
    weight: 5,
    crits: 2,
    damage: '1/missile',
    heat: 4,
    minRange: 6,
    range: '7/14/21',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2300,
    bv: 90,
  },
  {
    id: 'lrm15',
    name: 'LRM 15',
    category: 'Missile',
    weight: 7,
    crits: 3,
    damage: '1/missile',
    heat: 5,
    minRange: 6,
    range: '7/14/21',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2300,
    bv: 136,
  },
  {
    id: 'lrm20',
    name: 'LRM 20',
    category: 'Missile',
    weight: 10,
    crits: 5,
    damage: '1/missile',
    heat: 6,
    minRange: 6,
    range: '7/14/21',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2300,
    bv: 181,
  },
  
  // Streak SRM
  {
    id: 'streak-srm2',
    name: 'Streak SRM 2',
    category: 'Missile',
    weight: 1.5,
    crits: 1,
    damage: '2/missile',
    heat: 2,
    minRange: 0,
    range: '3/6/9',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3035,
    bv: 30,
    special: ['All missiles hit'],
  },
];

// Equipment
export const EQUIPMENT: EquipmentItem[] = [
  // Electronics
  {
    id: 'beagle-probe',
    name: 'Beagle Active Probe',
    category: 'Electronics',
    weight: 1.5,
    crits: 2,
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3045,
    bv: 10,
    special: ['Detects hidden units'],
  },
  {
    id: 'guardian-ecm',
    name: 'Guardian ECM Suite',
    category: 'Electronics',
    weight: 1.5,
    crits: 2,
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3045,
    bv: 61,
    special: ['Blocks enemy electronics'],
  },
  {
    id: 'tag',
    name: 'TAG',
    category: 'Electronics',
    weight: 1,
    crits: 1,
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3044,
    bv: 0,
    special: ['Designates targets for artillery'],
  },
  {
    id: 'narc',
    name: 'Narc Missile Beacon',
    category: 'Electronics',
    weight: 3,
    crits: 2,
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3035,
    bv: 30,
    special: ['Improves missile accuracy'],
  },
  
  // Physical Weapons
  {
    id: 'hatchet',
    name: 'Hatchet',
    category: 'Physical',
    weight: 0, // Weight = tonnage/15
    crits: 0, // Crits = tonnage/15
    damage: '2x tonnage/5',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3022,
    bv: 0,
    special: ['Melee weapon'],
  },
  {
    id: 'sword',
    name: 'Sword',
    category: 'Physical',
    weight: 0, // Weight = tonnage/20 + 0.5
    crits: 0, // Crits = tonnage/20 + 1
    damage: 'tonnage/10 + 1',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3058,
    bv: 0,
    special: ['Melee weapon'],
  },
  
  // Jump Jets
  {
    id: 'jump-jet',
    name: 'Jump Jet',
    category: 'Equipment',
    weight: 0, // Weight varies by mech tonnage
    crits: 1,
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2100,
    bv: 0,
    special: ['Provides 1 jump MP'],
  },
  {
    id: 'improved-jump-jet',
    name: 'Improved Jump Jet',
    category: 'Equipment',
    weight: 0, // Weight = 2x standard JJ
    crits: 2,
    techBase: 'IS',
    techLevel: 'Advanced',
    year: 3069,
    bv: 0,
    special: ['Provides 1 jump MP, increased range'],
  },
  
  // Heat Sinks (handled by system components)
  {
    id: 'heat-sink',
    name: 'Heat Sink',
    category: 'Equipment',
    weight: 1,
    crits: 1,
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2022,
    bv: 0,
    special: ['Dissipates 1 heat'],
  },
  {
    id: 'double-heat-sink',
    name: 'Double Heat Sink',
    category: 'Equipment',
    weight: 1,
    crits: 3,
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3040,
    bv: 0,
    special: ['Dissipates 2 heat'],
  },
  {
    id: 'clan-double-heat-sink',
    name: 'Double Heat Sink (Clan)',
    category: 'Equipment',
    weight: 1,
    crits: 2,
    techBase: 'Clan',
    techLevel: 'Standard',
    year: 2850,
    bv: 0,
    special: ['Dissipates 2 heat'],
  },
  
  // CASE
  {
    id: 'case',
    name: 'CASE',
    category: 'Equipment',
    weight: 0.5,
    crits: 1,
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3036,
    bv: 50,
    special: ['Prevents ammo explosion damage transfer'],
  },
  {
    id: 'clan-case',
    name: 'CASE (Clan)',
    category: 'Equipment',
    weight: 0,
    crits: 0,
    techBase: 'Clan',
    techLevel: 'Standard',
    year: 2850,
    bv: 0,
    special: ['Built into all Clan locations'],
  },
];

// Ammunition
export const AMMUNITION: EquipmentItem[] = [
  // AC Ammo
  {
    id: 'ac2-ammo',
    name: 'AC/2 Ammo',
    category: 'Ammo',
    weight: 1,
    crits: 1,
    shots: '45',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2290,
    bv: 5,
    ammoFor: 'AC/2',
  },
  {
    id: 'ac5-ammo',
    name: 'AC/5 Ammo',
    category: 'Ammo',
    weight: 1,
    crits: 1,
    shots: '20',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2240,
    bv: 9,
    ammoFor: 'AC/5',
  },
  {
    id: 'ac10-ammo',
    name: 'AC/10 Ammo',
    category: 'Ammo',
    weight: 1,
    crits: 1,
    shots: '10',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2443,
    bv: 15,
    ammoFor: 'AC/10',
  },
  {
    id: 'ac20-ammo',
    name: 'AC/20 Ammo',
    category: 'Ammo',
    weight: 1,
    crits: 1,
    shots: '5',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2490,
    bv: 22,
    ammoFor: 'AC/20',
  },
  
  // Gauss Ammo
  {
    id: 'gauss-ammo',
    name: 'Gauss Ammo',
    category: 'Ammo',
    weight: 1,
    crits: 1,
    shots: '8',
    techBase: 'IS',
    techLevel: 'Standard',
    year: 3040,
    bv: 40,
    ammoFor: 'Gauss Rifle',
  },
  
  // SRM Ammo
  {
    id: 'srm-ammo',
    name: 'SRM Ammo',
    category: 'Ammo',
    weight: 1,
    crits: 1,
    shots: '100',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2370,
    bv: 27,
    ammoFor: 'SRM',
  },
  
  // LRM Ammo
  {
    id: 'lrm-ammo',
    name: 'LRM Ammo',
    category: 'Ammo',
    weight: 1,
    crits: 1,
    shots: '120',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 2300,
    bv: 30,
    ammoFor: 'LRM',
  },
  
  // Machine Gun Ammo
  {
    id: 'mg-ammo',
    name: 'Machine Gun Ammo',
    category: 'Ammo',
    weight: 1,
    crits: 1,
    shots: '200',
    techBase: 'Both',
    techLevel: 'Introductory',
    year: 1950,
    bv: 1,
    ammoFor: 'Machine Gun',
  },
];

// Combined database
export const FULL_EQUIPMENT_DATABASE: EquipmentItem[] = [
  ...ENERGY_WEAPONS,
  ...BALLISTIC_WEAPONS,
  ...MISSILE_WEAPONS,
  ...EQUIPMENT,
  ...AMMUNITION,
];

// Helper functions
export function getEquipmentById(id: string): EquipmentItem | undefined {
  return FULL_EQUIPMENT_DATABASE.find(item => item.id === id);
}

export function getEquipmentByName(name: string): EquipmentItem | undefined {
  return FULL_EQUIPMENT_DATABASE.find(item => item.name === name);
}

export function getEquipmentByCategory(category: string): EquipmentItem[] {
  return FULL_EQUIPMENT_DATABASE.filter(item => item.category === category);
}

export function getAmmoForWeapon(weaponName: string): EquipmentItem[] {
  // Handle generic ammo types
  if (weaponName.includes('SRM')) return AMMUNITION.filter(a => a.ammoFor === 'SRM');
  if (weaponName.includes('LRM')) return AMMUNITION.filter(a => a.ammoFor === 'LRM');
  
  // Handle specific weapons
  return AMMUNITION.filter(ammo => ammo.ammoFor === weaponName);
}

// Jump jet weight calculation
export function getJumpJetWeight(mechTonnage: number): number {
  if (mechTonnage <= 55) return 0.5;
  if (mechTonnage <= 85) return 1.0;
  return 2.0;
}

// Physical weapon calculations
export function getHatchetSpecs(mechTonnage: number): { weight: number; crits: number; damage: number } {
  const weight = Math.ceil(mechTonnage / 15);
  const crits = Math.ceil(mechTonnage / 15);
  const damage = Math.floor(mechTonnage / 5) * 2;
  return { weight, crits, damage };
}

export function getSwordSpecs(mechTonnage: number): { weight: number; crits: number; damage: number } {
  const weight = Math.ceil(mechTonnage / 20) + 0.5;
  const crits = Math.ceil(mechTonnage / 20) + 1;
  const damage = Math.floor(mechTonnage / 10) + 1;
  return { weight, crits, damage };
}
