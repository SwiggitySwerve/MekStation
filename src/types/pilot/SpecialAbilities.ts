/**
 * Special Abilities Definitions
 *
 * Defines the starter set of pilot special abilities.
 * Abilities can modify combat performance in various ways.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import { ISpecialAbility, AbilityEffectType } from './PilotInterfaces';

// =============================================================================
// Ability Definitions
// =============================================================================

/**
 * All available special abilities.
 * Indexed by ability ID for fast lookup.
 */
export const SPECIAL_ABILITIES: Record<string, ISpecialAbility> = {
  // ===========================================================================
  // Gunnery Abilities
  // ===========================================================================

  'weapon-specialist': {
    id: 'weapon-specialist',
    name: 'Weapon Specialist',
    description:
      'Specialized training with a specific weapon type grants -1 to-hit modifier when using that weapon.',
    xpCost: 50,
    prerequisites: [],
    minGunnery: 4,
    effectType: AbilityEffectType.ToHitModifier,
    effectParams: {
      modifier: -1,
      weaponType: 'selected', // User selects weapon type on acquisition
    },
  },

  marksman: {
    id: 'marksman',
    name: 'Marksman',
    description:
      'Expert marksmanship training grants -1 to-hit modifier for all aimed shots.',
    xpCost: 75,
    prerequisites: ['weapon-specialist'],
    minGunnery: 3,
    effectType: AbilityEffectType.ToHitModifier,
    effectParams: {
      modifier: -1,
      condition: 'aimed_shot',
    },
  },

  sniper: {
    id: 'sniper',
    name: 'Sniper',
    description:
      'Ignores +1 range modifier for medium range when using direct-fire weapons.',
    xpCost: 100,
    prerequisites: ['marksman'],
    minGunnery: 2,
    effectType: AbilityEffectType.ToHitModifier,
    effectParams: {
      modifier: -1,
      condition: 'medium_range',
      weaponCategory: 'direct_fire',
    },
  },

  'multi-target': {
    id: 'multi-target',
    name: 'Multi-Target',
    description:
      'Can engage two targets in the same attack phase with only +1 to-hit penalty (instead of +2).',
    xpCost: 75,
    prerequisites: [],
    minGunnery: 3,
    effectType: AbilityEffectType.ToHitModifier,
    effectParams: {
      modifier: -1,
      condition: 'multi_target',
    },
  },

  'cluster-hitter': {
    id: 'cluster-hitter',
    name: 'Cluster Hitter',
    description:
      'When firing LRMs or SRMs, roll on the cluster hits table as if one column higher.',
    xpCost: 50,
    prerequisites: [],
    minGunnery: 4,
    effectType: AbilityEffectType.DamageModifier,
    effectParams: {
      clusterColumnShift: 1,
      weaponCategory: 'missile',
    },
  },

  // ===========================================================================
  // Piloting Abilities
  // ===========================================================================

  evasive: {
    id: 'evasive',
    name: 'Evasive',
    description:
      'Exceptional evasive maneuvering grants +1 TMM when running or jumping.',
    xpCost: 50,
    prerequisites: [],
    minPiloting: 4,
    effectType: AbilityEffectType.TMMModifier,
    effectParams: {
      modifier: 1,
      condition: 'running_or_jumping',
    },
  },

  'jumping-jack': {
    id: 'jumping-jack',
    name: 'Jumping Jack',
    description:
      'Expert jump jet pilot. -1 to piloting skill rolls when landing from a jump.',
    xpCost: 50,
    prerequisites: [],
    minPiloting: 4,
    effectType: AbilityEffectType.PilotingModifier,
    effectParams: {
      modifier: -1,
      condition: 'jump_landing',
    },
  },

  acrobat: {
    id: 'acrobat',
    name: 'Acrobat',
    description:
      'Can perform Death From Above attacks with -1 to piloting roll. Requires Jumping Jack.',
    xpCost: 75,
    prerequisites: ['jumping-jack'],
    minPiloting: 3,
    effectType: AbilityEffectType.PilotingModifier,
    effectParams: {
      modifier: -1,
      condition: 'dfa_attack',
    },
  },

  'terrain-master': {
    id: 'terrain-master',
    name: 'Terrain Master',
    description: 'Ignores +1 piloting modifier for woods and rough terrain.',
    xpCost: 50,
    prerequisites: [],
    minPiloting: 4,
    effectType: AbilityEffectType.PilotingModifier,
    effectParams: {
      modifier: -1,
      condition: 'difficult_terrain',
    },
  },

  // ===========================================================================
  // Toughness Abilities
  // ===========================================================================

  'iron-will': {
    id: 'iron-will',
    name: 'Iron Will',
    description:
      'Mental fortitude grants -2 to consciousness check target numbers.',
    xpCost: 75,
    prerequisites: [],
    effectType: AbilityEffectType.ConsciousnessModifier,
    effectParams: {
      modifier: -2,
    },
  },

  'pain-tolerance': {
    id: 'pain-tolerance',
    name: 'Pain Tolerance',
    description:
      'First wound does not apply skill penalty. Additional wounds still apply penalties normally.',
    xpCost: 50,
    prerequisites: [],
    effectType: AbilityEffectType.Special,
    effectParams: {
      ignoreFirstWoundPenalty: true,
    },
  },

  edge: {
    id: 'edge',
    name: 'Edge',
    description:
      'Once per game, can reroll a single die roll (gunnery, piloting, or consciousness).',
    xpCost: 100,
    prerequisites: [],
    effectType: AbilityEffectType.Special,
    effectParams: {
      rerollsPerGame: 1,
    },
  },

  // ===========================================================================
  // Tactical Abilities
  // ===========================================================================

  'tactical-genius': {
    id: 'tactical-genius',
    name: 'Tactical Genius',
    description: '+1 to initiative roll for the controlling player.',
    xpCost: 75,
    prerequisites: [],
    effectType: AbilityEffectType.InitiativeModifier,
    effectParams: {
      modifier: 1,
    },
  },

  'speed-demon': {
    id: 'speed-demon',
    name: 'Speed Demon',
    description:
      'Can push movement by +1 hex when running, at the cost of +1 heat.',
    xpCost: 50,
    prerequisites: [],
    minPiloting: 4,
    effectType: AbilityEffectType.Special,
    effectParams: {
      extraMovement: 1,
      heatCost: 1,
      condition: 'running',
    },
  },

  'cool-under-fire': {
    id: 'cool-under-fire',
    name: 'Cool Under Fire',
    description: 'Mech generates 1 less heat per turn (minimum 0).',
    xpCost: 50,
    prerequisites: [],
    effectType: AbilityEffectType.HeatModifier,
    effectParams: {
      heatReduction: 1,
    },
  },

  'hot-dog': {
    id: 'hot-dog',
    name: 'Hot Dog',
    description:
      'Can fire at +3 heat above normal shutdown threshold without triggering shutdown checks.',
    xpCost: 75,
    prerequisites: ['cool-under-fire'],
    effectType: AbilityEffectType.HeatModifier,
    effectParams: {
      shutdownThresholdIncrease: 3,
    },
  },
};

// =============================================================================
// Ability Lookup Functions
// =============================================================================

/**
 * Get an ability by ID.
 */
export function getAbility(id: string): ISpecialAbility | undefined {
  return SPECIAL_ABILITIES[id];
}

/**
 * Get all abilities.
 */
export function getAllAbilities(): ISpecialAbility[] {
  return Object.values(SPECIAL_ABILITIES);
}

/**
 * Get abilities available to a pilot based on their skills and existing abilities.
 */
export function getAvailableAbilities(
  gunnery: number,
  piloting: number,
  ownedAbilityIds: string[],
): ISpecialAbility[] {
  return getAllAbilities().filter((ability) => {
    // Check if already owned
    if (ownedAbilityIds.includes(ability.id)) {
      return false;
    }

    // Check gunnery prerequisite
    if (ability.minGunnery !== undefined && gunnery > ability.minGunnery) {
      return false;
    }

    // Check piloting prerequisite
    if (ability.minPiloting !== undefined && piloting > ability.minPiloting) {
      return false;
    }

    // Check ability prerequisites
    if (ability.prerequisites.length > 0) {
      const hasAllPrereqs = ability.prerequisites.every((prereq) =>
        ownedAbilityIds.includes(prereq),
      );
      if (!hasAllPrereqs) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get abilities that can be purchased with available XP.
 */
export function getAffordableAbilities(
  gunnery: number,
  piloting: number,
  ownedAbilityIds: string[],
  availableXp: number,
): ISpecialAbility[] {
  return getAvailableAbilities(gunnery, piloting, ownedAbilityIds).filter(
    (ability) => ability.xpCost <= availableXp,
  );
}

/**
 * Check if a pilot meets prerequisites for an ability.
 */
export function meetsPrerequisites(
  abilityId: string,
  gunnery: number,
  piloting: number,
  ownedAbilityIds: string[],
): { meets: boolean; missing: string[] } {
  const ability = getAbility(abilityId);
  if (!ability) {
    return { meets: false, missing: ['Ability not found'] };
  }

  const missing: string[] = [];

  // Check gunnery
  if (ability.minGunnery !== undefined && gunnery > ability.minGunnery) {
    missing.push(`Gunnery ${ability.minGunnery} or better required`);
  }

  // Check piloting
  if (ability.minPiloting !== undefined && piloting > ability.minPiloting) {
    missing.push(`Piloting ${ability.minPiloting} or better required`);
  }

  // Check prerequisites
  for (const prereqId of ability.prerequisites) {
    if (!ownedAbilityIds.includes(prereqId)) {
      const prereq = getAbility(prereqId);
      missing.push(`Requires ${prereq?.name || prereqId}`);
    }
  }

  return { meets: missing.length === 0, missing };
}

// =============================================================================
// Ability Categories for UI
// =============================================================================

export enum AbilityCategory {
  Gunnery = 'gunnery',
  Piloting = 'piloting',
  Toughness = 'toughness',
  Tactical = 'tactical',
}

/**
 * Get the category for an ability.
 */
export function getAbilityCategory(abilityId: string): AbilityCategory {
  const gunneryAbilities = [
    'weapon-specialist',
    'marksman',
    'sniper',
    'multi-target',
    'cluster-hitter',
  ];
  const pilotingAbilities = [
    'evasive',
    'jumping-jack',
    'acrobat',
    'terrain-master',
  ];
  const toughnessAbilities = ['iron-will', 'pain-tolerance', 'edge'];
  const tacticalAbilities = [
    'tactical-genius',
    'speed-demon',
    'cool-under-fire',
    'hot-dog',
  ];

  if (gunneryAbilities.includes(abilityId)) return AbilityCategory.Gunnery;
  if (pilotingAbilities.includes(abilityId)) return AbilityCategory.Piloting;
  if (toughnessAbilities.includes(abilityId)) return AbilityCategory.Toughness;
  if (tacticalAbilities.includes(abilityId)) return AbilityCategory.Tactical;

  return AbilityCategory.Tactical; // Default
}

/**
 * Get abilities grouped by category.
 */
export function getAbilitiesByCategory(): Record<
  AbilityCategory,
  ISpecialAbility[]
> {
  const result: Record<AbilityCategory, ISpecialAbility[]> = {
    [AbilityCategory.Gunnery]: [],
    [AbilityCategory.Piloting]: [],
    [AbilityCategory.Toughness]: [],
    [AbilityCategory.Tactical]: [],
  };

  for (const ability of getAllAbilities()) {
    const category = getAbilityCategory(ability.id);
    result[category].push(ability);
  }

  return result;
}
