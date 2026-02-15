/**
 * Equipment Classification by Name
 * Pattern-based detection for equipment without category metadata
 */

import { EquipmentCategory } from '@/types/equipment';

// =============================================================================
// Classification Patterns
// =============================================================================

/**
 * Patterns for classifying equipment by name.
 */
export const EQUIPMENT_NAME_PATTERNS: Record<
  EquipmentCategory | 'heatsink',
  readonly string[]
> = {
  // Heat sinks (special case - not a category but needs detection)
  heatsink: ['heat sink', 'heatsink'],

  // Weapons
  [EquipmentCategory.ENERGY_WEAPON]: ['laser', 'ppc', 'flamer'],
  [EquipmentCategory.BALLISTIC_WEAPON]: [
    'autocannon',
    'ac/',
    'gauss',
    'machine gun',
    'ultra ac',
    'lb-x',
    'rotary ac',
  ],
  [EquipmentCategory.MISSILE_WEAPON]: [
    'lrm',
    'srm',
    'mrm',
    'atm',
    'mml',
    'narc',
    'streak',
  ],
  [EquipmentCategory.ARTILLERY]: ['arrow iv', 'long tom', 'sniper', 'thumper'],
  [EquipmentCategory.CAPITAL_WEAPON]: ['naval', 'capital'],
  [EquipmentCategory.PHYSICAL_WEAPON]: [
    'hatchet',
    'sword',
    'claw',
    'mace',
    'lance',
    'talons',
  ],

  // Ammunition
  [EquipmentCategory.AMMUNITION]: ['ammo', 'ammunition', 'rounds'],

  // Other
  [EquipmentCategory.ELECTRONICS]: [
    'computer',
    'ecm',
    'bap',
    'probe',
    'c3',
    'tag',
    'targeting',
  ],
  [EquipmentCategory.MOVEMENT]: [
    'jump jet',
    'masc',
    'supercharger',
    'partial wing',
    'tsm',
  ],
  [EquipmentCategory.STRUCTURAL]: [
    'endo steel',
    'endo-steel',
    'ferro-fibrous',
    'ferro fibrous',
  ],
  [EquipmentCategory.MISC_EQUIPMENT]: [],
};

/**
 * Priority order for classification
 */
const CLASSIFICATION_PRIORITY: readonly (EquipmentCategory | 'heatsink')[] = [
  'heatsink',
  EquipmentCategory.AMMUNITION,
  EquipmentCategory.ENERGY_WEAPON,
  EquipmentCategory.BALLISTIC_WEAPON,
  EquipmentCategory.MISSILE_WEAPON,
  EquipmentCategory.ARTILLERY,
  EquipmentCategory.CAPITAL_WEAPON,
  EquipmentCategory.ELECTRONICS,
  EquipmentCategory.PHYSICAL_WEAPON,
  EquipmentCategory.MOVEMENT,
  EquipmentCategory.STRUCTURAL,
];

/**
 * Classify equipment by name into a category.
 * Returns 'heatsink' for heat sinks (special case) or misc if no match.
 */
export function classifyEquipmentByName(
  name: string,
): EquipmentCategory | 'heatsink' {
  const lowerName = name.toLowerCase();

  for (const category of CLASSIFICATION_PRIORITY) {
    const patterns = EQUIPMENT_NAME_PATTERNS[category];
    if (patterns.some((pattern) => lowerName.includes(pattern))) {
      return category;
    }
  }

  return EquipmentCategory.MISC_EQUIPMENT;
}
