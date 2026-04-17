/**
 * Piloting-category SPAs (19).
 * Source: MegaMek OptionsConstants.java — piloting abilities block.
 */

import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { piloting } from './builders';

export const PILOTING_SPAS: readonly ISPADefinition[] = [
  piloting({
    id: 'animal_mimic',
    displayName: 'Animal Mimicry',
    description: 'Specialized movement and PSR in chosen terrain type.',
    pipelines: ['psr', 'movement'],
    requiresDesignation: true,
    designationType: 'terrain',
  }),
  piloting({
    id: 'cross_country',
    displayName: 'Cross-Country',
    description: 'Reduces movement penalties across rough terrain.',
    pipelines: ['movement'],
  }),
  piloting({
    id: 'dodge_maneuver',
    displayName: 'Dodge',
    description:
      'Forfeit attack to impose +2 to-hit on physical attacks against this unit.',
    source: 'MaxTech',
    category: 'defensive',
    pipelines: ['to-hit'],
  }),
  piloting({
    id: 'hvy_lifter',
    displayName: 'Heavy Lifter',
    description: '+50% cargo/lift capacity for physical attacks and carries.',
    pipelines: ['special'],
  }),
  piloting({
    id: 'hopping_jack',
    displayName: 'Hopping Jack',
    description: 'Jump attack to-hit penalty reduced from +3 to +2.',
    source: 'Unofficial',
    pipelines: ['to-hit'],
  }),
  piloting({
    id: 'hot_dog',
    displayName: 'Hot Dog',
    description: '-1 to shutdown and ammo-explosion avoidance rolls from heat.',
    pipelines: ['heat'],
    category: 'miscellaneous',
  }),
  piloting({
    id: 'jumping_jack',
    displayName: 'Jumping Jack',
    description: 'Jump attack to-hit penalty reduced from +3 to +1.',
    pipelines: ['to-hit'],
  }),
  piloting({
    id: 'maneuvering_ace',
    displayName: 'Maneuvering Ace',
    description:
      'May use lateral shift; -1 PSR for terrain and facing changes.',
    pipelines: ['psr', 'movement'],
  }),
  piloting({
    id: 'melee_master',
    displayName: 'Melee Master',
    description: 'One additional physical attack per turn.',
    pipelines: ['special'],
    category: 'gunnery',
  }),
  piloting({
    id: 'melee_specialist',
    displayName: 'Melee Specialist',
    description: '+1 damage and -1 to-hit on physical attacks.',
    pipelines: ['to-hit', 'damage'],
    category: 'gunnery',
  }),
  piloting({
    id: 'shaky_stick',
    displayName: 'Shaky Stick',
    description: '+1 enemy to-hit with indirect fire against this unit.',
    pipelines: ['to-hit'],
    category: 'defensive',
  }),
  piloting({
    id: 'tm_forest_ranger',
    displayName: 'Terrain Master: Forest Ranger',
    description: 'Woods/jungle movement + gunnery bonuses.',
    pipelines: ['movement', 'to-hit', 'psr'],
  }),
  piloting({
    id: 'tm_frogman',
    displayName: 'Terrain Master: Frogman',
    description: 'Water movement bonuses; extended crush-depth tolerance.',
    pipelines: ['movement', 'psr'],
  }),
  piloting({
    id: 'tm_mountaineer',
    displayName: 'Terrain Master: Mountaineer',
    description: 'Rubble/rough/elevation movement bonuses.',
    pipelines: ['movement', 'psr'],
  }),
  piloting({
    id: 'tm_nightwalker',
    displayName: 'Terrain Master: Nightwalker',
    description: 'Ignore darkness movement and gunnery penalties.',
    pipelines: ['movement', 'to-hit'],
  }),
  piloting({
    id: 'tm_swamp_beast',
    displayName: 'Terrain Master: Swamp Beast',
    description: 'Mud/swamp movement + gunnery bonuses.',
    pipelines: ['movement', 'to-hit'],
  }),
  piloting({
    id: 'zweihander',
    displayName: 'Zweihander',
    description: 'Two-handed weapon strike: extra damage at to-hit penalty.',
    pipelines: ['damage', 'to-hit'],
    category: 'gunnery',
  }),
  piloting({
    id: 'atow_g_tolerance',
    displayName: 'G-Tolerance',
    description: '+1 aerospace/VTOL control rolls under high-G maneuvers.',
    source: 'ATOW',
    category: 'miscellaneous',
    pipelines: ['psr'],
  }),
  piloting({
    id: 'aptitude_piloting',
    displayName: 'Natural Aptitude: Piloting',
    description: 'Roll 3d6 keep best 2 on piloting checks.',
    source: 'ATOW',
    isOriginOnly: true,
    xpCost: 40,
    pipelines: ['psr'],
  }),
];
