/**
 * SPA Catalog — ~35 Official SPAs
 * Complete catalog with all BattleTech special pilot abilities.
 */

import { hasSPA as hasCanonicalSPA } from './canonicalize';
import { ISPACatalogEntry, SPACategory, SPAPipeline } from './types';

/**
 * Complete SPA catalog with ~35 official BattleTech SPAs.
 * Each entry describes how the SPA integrates with combat resolution.
 */
export const SPA_CATALOG: Record<string, ISPACatalogEntry> = {
  // =========================================================================
  // Gunnery SPAs
  // =========================================================================
  'weapon-specialist': {
    id: 'weapon-specialist',
    name: 'Weapon Specialist',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-2 to-hit with designated weapon type',
    requiresDesignation: true,
    designationType: 'weapon_type',
  },
  'gunnery-specialist': {
    id: 'gunnery-specialist',
    name: 'Gunnery Specialist',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-1 to-hit designated category, +1 others',
    requiresDesignation: true,
    designationType: 'weapon_category',
  },
  marksman: {
    id: 'marksman',
    name: 'Marksman',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-1 to-hit for aimed/called shots',
    requiresDesignation: false,
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: 'Halves all positive range modifiers (round down)',
    requiresDesignation: false,
  },
  'blood-stalker': {
    id: 'blood-stalker',
    name: 'Blood Stalker',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-1 vs designated target, +2 vs all others',
    requiresDesignation: true,
    designationType: 'target',
  },
  'cluster-hitter': {
    id: 'cluster-hitter',
    name: 'Cluster Hitter',
    category: 'gunnery',
    pipelines: ['damage'],
    combatEffect: '+1 cluster hit table column shift',
    requiresDesignation: false,
  },
  'multi-tasker': {
    id: 'multi-tasker',
    name: 'Multi-Tasker',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-1 secondary target penalty',
    requiresDesignation: false,
  },
  'range-master': {
    id: 'range-master',
    name: 'Range Master',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: 'Zeroes range modifier for designated bracket',
    requiresDesignation: true,
    designationType: 'range_bracket',
  },
  sandblaster: {
    id: 'sandblaster',
    name: 'Sandblaster',
    category: 'gunnery',
    pipelines: ['damage'],
    combatEffect:
      '+4/+3/+2 cluster-table columns by range with designated weapon type',
    requiresDesignation: true,
    designationType: 'weapon_type',
  },
  'oblique-attacker': {
    id: 'oblique-attacker',
    name: 'Oblique Attacker',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-1 to indirect fire penalty',
    requiresDesignation: false,
  },
  forward_observer: {
    id: 'forward_observer',
    name: 'Forward Observer',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: 'Cancels the +1 walked-spotter indirect-fire penalty',
    requiresDesignation: false,
  },
  sharpshooter: {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-1 called shot modifier (reduces +3 to +2)',
    requiresDesignation: false,
  },

  // =========================================================================
  // Piloting SPAs
  // =========================================================================
  'jumping-jack': {
    id: 'jumping-jack',
    name: 'Jumping Jack',
    category: 'piloting',
    pipelines: ['to-hit'],
    combatEffect: 'Jump attack modifier reduced from +3 to +1',
    requiresDesignation: false,
  },
  'hopping-jack': {
    id: 'hopping-jack',
    name: 'Hopping Jack',
    category: 'piloting',
    pipelines: ['to-hit'],
    combatEffect: 'Jump attack modifier reduced from +3 to +2',
    requiresDesignation: false,
  },
  'melee-specialist': {
    id: 'melee-specialist',
    name: 'Melee Specialist',
    category: 'piloting',
    pipelines: ['to-hit', 'damage'],
    combatEffect: '-1 physical attack to-hit, +1 physical attack damage',
    requiresDesignation: false,
  },
  'melee-master': {
    id: 'melee-master',
    name: 'Melee Master',
    category: 'piloting',
    pipelines: ['special'],
    combatEffect: 'One additional physical attack per turn',
    requiresDesignation: false,
  },
  'maneuvering-ace': {
    id: 'maneuvering-ace',
    name: 'Maneuvering Ace',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '-1 PSR for terrain and skidding',
    requiresDesignation: false,
  },
  'terrain-master': {
    id: 'terrain-master',
    name: 'Terrain Master',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: 'Ignores +1 piloting modifier for difficult terrain',
    requiresDesignation: false,
  },
  tm_frogman: {
    id: 'tm_frogman',
    name: 'Terrain Master: Frogman',
    category: 'piloting',
    pipelines: ['to-hit', 'psr'],
    combatEffect:
      '-1 physical attack to-hit and entering-water PSR in depth-2+ water',
    requiresDesignation: false,
  },
  tm_mountaineer: {
    id: 'tm_mountaineer',
    name: 'Terrain Master: Mountaineer',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '-1 entering-rubble PSR',
    requiresDesignation: false,
  },
  tm_forest_ranger: {
    id: 'tm_forest_ranger',
    name: 'Terrain Master: Forest Ranger',
    category: 'piloting',
    pipelines: ['to-hit', 'psr'],
    combatEffect: '+1 enemy to-hit when walking in woods',
    requiresDesignation: false,
  },
  tm_swamp_beast: {
    id: 'tm_swamp_beast',
    name: 'Terrain Master: Swamp Beast',
    category: 'piloting',
    pipelines: ['to-hit'],
    combatEffect: '+1 enemy to-hit when running in mud or swamp',
    requiresDesignation: false,
  },
  acrobat: {
    id: 'acrobat',
    name: 'Acrobat',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '-1 DFA piloting roll',
    requiresDesignation: false,
  },
  'cross-country': {
    id: 'cross-country',
    name: 'Cross-Country',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '-1 PSR for terrain while running',
    requiresDesignation: false,
  },

  // =========================================================================
  // Defensive SPAs
  // =========================================================================
  'dodge-maneuver': {
    id: 'dodge-maneuver',
    name: 'Dodge Maneuver',
    category: 'defensive',
    pipelines: ['to-hit'],
    combatEffect: '+2 enemy to-hit when dodging (forfeit attack)',
    requiresDesignation: false,
  },
  shaky_stick: {
    id: 'shaky_stick',
    name: 'Shaky Stick',
    category: 'defensive',
    pipelines: ['to-hit'],
    combatEffect: '+1 enemy to-hit when airborne and attacked from ground',
    requiresDesignation: false,
  },
  evasive: {
    id: 'evasive',
    name: 'Evasive',
    category: 'defensive',
    pipelines: ['to-hit'],
    combatEffect: '+1 TMM when running or jumping',
    requiresDesignation: false,
  },
  'natural-grace': {
    id: 'natural-grace',
    name: 'Natural Grace',
    category: 'defensive',
    pipelines: ['psr'],
    combatEffect: '-1 PSR for falls',
    requiresDesignation: false,
  },

  // =========================================================================
  // Toughness SPAs
  // =========================================================================
  'iron-man': {
    id: 'iron-man',
    name: 'Iron Man',
    category: 'toughness',
    pipelines: ['special'],
    combatEffect: 'Reduce ammunition-explosion pilot damage by 1',
    requiresDesignation: false,
  },
  'pain-resistance': {
    id: 'pain-resistance',
    name: 'Pain Resistance',
    category: 'toughness',
    pipelines: ['consciousness'],
    combatEffect:
      '-1 consciousness target number and -1 ammunition-explosion pilot damage',
    requiresDesignation: false,
  },
  edge: {
    id: 'edge',
    name: 'Edge',
    category: 'toughness',
    pipelines: ['special'],
    combatEffect: 'MegaMek-style trigger-specific Edge options',
    requiresDesignation: false,
  },
  toughness: {
    id: 'toughness',
    name: 'Toughness',
    category: 'toughness',
    pipelines: ['special'],
    combatEffect:
      'Legacy alias boundary; use explicit pilotToughness for RPG Toughness consciousness relief',
    requiresDesignation: false,
  },

  // =========================================================================
  // Tactical SPAs
  // =========================================================================
  'tactical-genius': {
    id: 'tactical-genius',
    name: 'Tactical Genius',
    category: 'tactical',
    pipelines: ['initiative'],
    combatEffect: 'initiative reroll gate; no flat roll bonus',
    requiresDesignation: false,
  },
  'speed-demon': {
    id: 'speed-demon',
    name: 'Speed Demon',
    category: 'tactical',
    pipelines: ['special'],
    combatEffect: '+1 hex when running (at +1 heat)',
    requiresDesignation: false,
  },
  'combat-intuition': {
    id: 'combat-intuition',
    name: 'Combat Intuition',
    category: 'tactical',
    pipelines: ['initiative'],
    combatEffect: 'Move before initiative winner in first round',
    requiresDesignation: false,
  },

  // =========================================================================
  // Heat/Miscellaneous SPAs
  // =========================================================================
  'hot-dog': {
    id: 'hot-dog',
    name: 'Hot Dog',
    category: 'miscellaneous',
    pipelines: ['heat'],
    combatEffect: '-1 heat check target number',
    requiresDesignation: false,
  },
  'cool-under-fire': {
    id: 'cool-under-fire',
    name: 'Cool Under Fire',
    category: 'miscellaneous',
    pipelines: ['heat'],
    combatEffect: '-1 heat generated per turn',
    requiresDesignation: false,
  },
  'some-like-it-hot': {
    id: 'some-like-it-hot',
    name: 'Some Like it Hot',
    category: 'miscellaneous',
    pipelines: ['heat'],
    combatEffect: '-1 heat to-hit penalty at all thresholds',
    requiresDesignation: false,
  },
  'multi-target': {
    id: 'multi-target',
    name: 'Multi-Target',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: 'Reduced multi-target penalty',
    requiresDesignation: false,
  },
  'iron-will': {
    id: 'iron-will',
    name: 'Iron Will',
    category: 'toughness',
    pipelines: ['special'],
    combatEffect: 'Unsupported local legacy alias; not source-backed Iron Man',
    requiresDesignation: false,
  },
  'heavy-lifter': {
    id: 'heavy-lifter',
    name: 'Heavy Lifter',
    category: 'piloting',
    pipelines: ['special'],
    combatEffect: 'Can carry and throw objects in physical combat',
    requiresDesignation: false,
  },
  'animal-mimicry': {
    id: 'animal-mimicry',
    name: 'Animal Mimicry',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '-1 PSR modifier in specific terrain',
    requiresDesignation: false,
  },
  antagonizer: {
    id: 'antagonizer',
    name: 'Antagonizer',
    category: 'tactical',
    pipelines: ['special'],
    combatEffect: 'Force opponent to attack this unit first',
    requiresDesignation: false,
  },
};

export function getSPACatalogSize(): number {
  return Object.keys(SPA_CATALOG).length;
}

export function getSPAsForPipeline(pipeline: SPAPipeline): ISPACatalogEntry[] {
  return Object.values(SPA_CATALOG).filter((spa) =>
    spa.pipelines.includes(pipeline),
  );
}

export function getSPAsByCategory(category: SPACategory): ISPACatalogEntry[] {
  return Object.values(SPA_CATALOG).filter((spa) => spa.category === category);
}

export function hasSPA(abilities: readonly string[], spaId: string): boolean {
  // Delegate to the canonical resolver so callers can pass either the
  // legacy kebab-case id or the canonical snake_case id and still match.
  return hasCanonicalSPA(abilities, spaId);
}

export function getConsciousnessCheckModifier(
  abilities: readonly string[],
): number {
  return abilities.includes('pain_resistance') ||
    abilities.includes('pain-resistance')
    ? -1
    : 0;
}

export function getObliqueAttackerBonus(abilities: readonly string[]): number {
  return hasCanonicalSPA(abilities, 'oblique_attacker') ? -1 : 0;
}

export function getSharpshooterBonus(abilities: readonly string[]): number {
  // 'sharpshooter' is a System-B-only legacy alias. The local campaign SPA
  // with the same called-shot effect is Marksman; MegaMek source does not
  // validate either id as a called-shot reducer.
  return hasCanonicalSPA(abilities, 'marksman') ||
    abilities.includes('sharpshooter')
    ? -1
    : 0;
}
