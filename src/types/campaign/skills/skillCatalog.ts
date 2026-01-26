import { ISkillType } from './ISkillType';

/**
 * Complete catalog of all skill types in the MekStation campaign system.
 *
 * Skills are organized into 6 categories:
 * - Combat: Weapon and vehicle operation skills
 * - Technical: Maintenance and repair skills
 * - Medical: Health and healing skills
 * - Administrative: Leadership and management skills
 * - Physical: Movement and physical action skills
 * - Knowledge: Information and learning skills
 *
 * Each skill defines its base difficulty (targetNumber), XP cost progression,
 * and the attribute it's linked to for skill checks.
 */
export const SKILL_CATALOG: Record<string, ISkillType> = {
  // Combat Skills (11 total)
  'gunnery': {
    id: 'gunnery',
    name: 'Gunnery',
    description: 'Ranged weapon accuracy',
    targetNumber: 7,
    costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120],
    linkedAttribute: 'REF',
  },
  'piloting': {
    id: 'piloting',
    name: 'Piloting',
    description: 'BattleMech/vehicle handling',
    targetNumber: 7,
    costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120],
    linkedAttribute: 'DEX',
  },
  'gunnery-aerospace': {
    id: 'gunnery-aerospace',
    name: 'Gunnery/Aerospace',
    description: 'Aerospace weapon systems',
    targetNumber: 7,
    costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120],
    linkedAttribute: 'REF',
  },
  'piloting-aerospace': {
    id: 'piloting-aerospace',
    name: 'Piloting/Aerospace',
    description: 'Aerospace craft handling',
    targetNumber: 7,
    costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120],
    linkedAttribute: 'DEX',
  },
  'gunnery-vehicle': {
    id: 'gunnery-vehicle',
    name: 'Gunnery/Vehicle',
    description: 'Vehicle weapon systems',
    targetNumber: 7,
    costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120],
    linkedAttribute: 'REF',
  },
  'driving': {
    id: 'driving',
    name: 'Driving',
    description: 'Ground vehicle operation',
    targetNumber: 7,
    costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120],
    linkedAttribute: 'DEX',
  },
  'gunnery-ba': {
    id: 'gunnery-ba',
    name: 'Gunnery/Battle Armor',
    description: 'Battle armor weapons',
    targetNumber: 7,
    costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120],
    linkedAttribute: 'REF',
  },
  'anti-mek': {
    id: 'anti-mek',
    name: 'Anti-Mech',
    description: 'Infantry anti-Mech tactics',
    targetNumber: 7,
    costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120],
    linkedAttribute: 'DEX',
  },
  'small-arms': {
    id: 'small-arms',
    name: 'Small Arms',
    description: 'Personal firearms',
    targetNumber: 7,
    costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60],
    linkedAttribute: 'REF',
  },
  'artillery': {
    id: 'artillery',
    name: 'Artillery',
    description: 'Long-range artillery systems',
    targetNumber: 7,
    costs: [0, 8, 8, 12, 16, 24, 32, 48, 64, 80, 120],
    linkedAttribute: 'INT',
  },
  'tactics': {
    id: 'tactics',
    name: 'Tactics',
    description: 'Combat tactics and strategy',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'INT',
  },

  // Technical Skills (6 total)
  'tech-mech': {
    id: 'tech-mech',
    name: 'Tech/Mech',
    description: 'BattleMech maintenance and repair',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'DEX',
  },
  'tech-aero': {
    id: 'tech-aero',
    name: 'Tech/Aero',
    description: 'Aerospace maintenance',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'DEX',
  },
  'tech-mechanic': {
    id: 'tech-mechanic',
    name: 'Tech/Mechanic',
    description: 'Vehicle maintenance',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'DEX',
  },
  'tech-ba': {
    id: 'tech-ba',
    name: 'Tech/BA',
    description: 'Battle armor maintenance',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'DEX',
  },
  'tech-vessel': {
    id: 'tech-vessel',
    name: 'Tech/Vessel',
    description: 'DropShip/JumpShip maintenance',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'DEX',
  },
  'astech': {
    id: 'astech',
    name: 'AsTech',
    description: 'Technical assistant work',
    targetNumber: 7,
    costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60],
    linkedAttribute: 'DEX',
  },
  'tech-general': {
    id: 'tech-general',
    name: 'Tech',
    description: 'General technical maintenance and repair ability',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'DEX',
  },

  // Medical Skills (3 total)
  'medicine': {
    id: 'medicine',
    name: 'Medicine',
    description: 'Medical treatment and surgery',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'INT',
  },
  'medtech': {
    id: 'medtech',
    name: 'MedTech',
    description: 'Field medical assistance',
    targetNumber: 7,
    costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60],
    linkedAttribute: 'INT',
  },
  'veterinary': {
    id: 'veterinary',
    name: 'Veterinary Medicine',
    description: 'Animal care (beast-mounted infantry)',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'INT',
  },

  // Administrative Skills (5 total)
  'administration': {
    id: 'administration',
    name: 'Administration',
    description: 'Organizational management and logistics',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'INT',
  },
  'negotiation': {
    id: 'negotiation',
    name: 'Negotiation',
    description: 'Contract and deal negotiation',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'CHA',
  },
  'leadership': {
    id: 'leadership',
    name: 'Leadership',
    description: 'Unit command and morale management',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'CHA',
  },
  'strategy': {
    id: 'strategy',
    name: 'Strategy',
    description: 'Long-term strategic planning',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'INT',
  },
  'communications': {
    id: 'communications',
    name: 'Communications',
    description: 'Electronic warfare and signals',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'INT',
  },

  // Physical Skills (6 total)
  'melee': {
    id: 'melee',
    name: 'Melee Combat',
    description: 'Hand-to-hand and melee weapons',
    targetNumber: 7,
    costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60],
    linkedAttribute: 'STR',
  },
  'stealth': {
    id: 'stealth',
    name: 'Stealth',
    description: 'Covert movement and concealment',
    targetNumber: 7,
    costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60],
    linkedAttribute: 'DEX',
  },
  'survival': {
    id: 'survival',
    name: 'Survival',
    description: 'Wilderness survival',
    targetNumber: 7,
    costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60],
    linkedAttribute: 'BOD',
  },
  'tracking': {
    id: 'tracking',
    name: 'Tracking',
    description: 'Target tracking and pursuit',
    targetNumber: 7,
    costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60],
    linkedAttribute: 'INT',
  },
  'demolitions': {
    id: 'demolitions',
    name: 'Demolitions',
    description: 'Explosives handling',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'INT',
  },
  'zero-g': {
    id: 'zero-g',
    name: 'Zero-G Operations',
    description: 'Microgravity maneuvers',
    targetNumber: 7,
    costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60],
    linkedAttribute: 'DEX',
  },

  // Knowledge Skills (8 total)
  'computers': {
    id: 'computers',
    name: 'Computers',
    description: 'Computer systems and hacking',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'INT',
  },
  'navigation': {
    id: 'navigation',
    name: 'Navigation',
    description: 'Interstellar and planetary navigation',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'INT',
  },
  'sensor-operations': {
    id: 'sensor-operations',
    name: 'Sensor Operations',
    description: 'Sensor and scanning systems',
    targetNumber: 7,
    costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60],
    linkedAttribute: 'INT',
  },
  'protocol': {
    id: 'protocol',
    name: 'Protocol/Etiquette',
    description: 'Formal diplomatic conduct',
    targetNumber: 7,
    costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60],
    linkedAttribute: 'CHA',
  },
  'interest': {
    id: 'interest',
    name: 'Interest',
    description: 'Hobby or academic knowledge',
    targetNumber: 7,
    costs: [0, 2, 4, 6, 8, 10, 14, 18, 24, 32, 40],
    linkedAttribute: 'INT',
  },
  'language': {
    id: 'language',
    name: 'Language',
    description: 'Foreign language proficiency',
    targetNumber: 7,
    costs: [0, 2, 4, 6, 8, 10, 14, 18, 24, 32, 40],
    linkedAttribute: 'INT',
  },
  'training': {
    id: 'training',
    name: 'Training',
    description: 'Ability to train others',
    targetNumber: 7,
    costs: [0, 4, 8, 12, 20, 30, 45, 60, 80, 100, 150],
    linkedAttribute: 'CHA',
  },
  'scrounge': {
    id: 'scrounge',
    name: 'Scrounge',
    description: 'Finding and acquiring supplies',
    targetNumber: 7,
    costs: [0, 4, 4, 8, 12, 16, 20, 28, 36, 44, 60],
    linkedAttribute: 'CHA',
  },
};

/**
 * Skill categories for organizing and filtering skills.
 */
export const SKILL_CATEGORIES = [
  'combat',
  'technical',
  'medical',
  'administrative',
  'physical',
  'knowledge',
] as const;

/**
 * Mapping of skill IDs to their categories.
 */
const SKILL_CATEGORY_MAP: Record<string, string> = {
  // Combat
  gunnery: 'combat',
  piloting: 'combat',
  'gunnery-aerospace': 'combat',
  'piloting-aerospace': 'combat',
  'gunnery-vehicle': 'combat',
  driving: 'combat',
  'gunnery-ba': 'combat',
  'anti-mek': 'combat',
  'small-arms': 'combat',
  artillery: 'combat',
  tactics: 'combat',

  // Technical
  'tech-mech': 'technical',
  'tech-aero': 'technical',
  'tech-mechanic': 'technical',
  'tech-ba': 'technical',
  'tech-vessel': 'technical',
  astech: 'technical',
  'tech-general': 'technical',

  // Medical
  medicine: 'medical',
  medtech: 'medical',
  veterinary: 'medical',

  // Administrative
  administration: 'administrative',
  negotiation: 'administrative',
  leadership: 'administrative',
  strategy: 'administrative',
  communications: 'administrative',

  // Physical
  melee: 'physical',
  stealth: 'physical',
  survival: 'physical',
  tracking: 'physical',
  demolitions: 'physical',
  'zero-g': 'physical',

  // Knowledge
  computers: 'knowledge',
  navigation: 'knowledge',
  'sensor-operations': 'knowledge',
  protocol: 'knowledge',
  interest: 'knowledge',
  language: 'knowledge',
  training: 'knowledge',
  scrounge: 'knowledge',
};

/**
 * Get a skill type by its ID.
 *
 * @param id - The skill ID to look up
 * @returns The skill type definition, or undefined if not found
 *
 * @example
 * const gunnery = getSkillType('gunnery');
 * if (gunnery) {
 *   console.log(gunnery.name); // "Gunnery"
 * }
 */
export function getSkillType(id: string): ISkillType | undefined {
  return SKILL_CATALOG[id];
}

/**
 * Get all skills in a specific category.
 *
 * @param category - The category name (e.g., 'combat', 'technical')
 * @returns Array of skill types in that category, or empty array if category not found
 *
 * @example
 * const combatSkills = getSkillsByCategory('combat');
 * console.log(combatSkills.length); // 11
 */
export function getSkillsByCategory(category: string): ISkillType[] {
  return Object.values(SKILL_CATALOG).filter(
    (skill) => SKILL_CATEGORY_MAP[skill.id] === category
  );
}

/**
 * Get all skill types in the catalog.
 *
 * @returns Array of all skill type definitions
 *
 * @example
 * const allSkills = getAllSkillTypes();
 * console.log(allSkills.length); // 39
 */
export function getAllSkillTypes(): ISkillType[] {
  return Object.values(SKILL_CATALOG);
}
