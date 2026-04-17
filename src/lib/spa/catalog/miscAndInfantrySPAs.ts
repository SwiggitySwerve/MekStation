/**
 * Miscellaneous (7), Infantry (2), and ATOW (2) SPAs.
 * Source: MegaMek OptionsConstants.java + ATOW supplement.
 */

import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { support } from './builders';

export const MISC_SPAS: readonly ISPADefinition[] = [
  support({
    id: 'eagle_eyes',
    displayName: "Eagle's Eyes",
    description: 'Extended sensor range and minefield detection.',
    pipelines: ['sensors'],
  }),
  support({
    id: 'env_specialist',
    displayName: 'Environmental Specialist',
    description:
      'PSR and movement bonuses in a designated environment type (vacuum, deep water, underground, low-g).',
    requiresDesignation: true,
    designationType: 'terrain',
    pipelines: ['psr', 'movement', 'to-hit'],
  }),
  support({
    id: 'forward_observer',
    displayName: 'Forward Observer',
    description: '-2 artillery fire adjustment, -1 gunnery when spotting.',
    pipelines: ['to-hit'],
  }),
  support({
    id: 'human_tro',
    displayName: 'Human TRO',
    description: '+1 column on the critical hit table vs designated unit type.',
    pipelines: ['critical-hit'],
    requiresDesignation: true,
    designationType: 'weapon_type',
  }),
  support({
    id: 'iron_man',
    displayName: 'Iron Man',
    description: 'Ammo-explosion damage never exceeds 1 pilot hit.',
    category: 'toughness',
    pipelines: ['consciousness'],
  }),
  support({
    id: 'pain_resistance',
    displayName: 'Pain Resistance',
    description: '+1 consciousness rolls; ignore first wound penalty.',
    source: 'MaxTech',
    category: 'toughness',
    pipelines: ['consciousness', 'to-hit'],
  }),
  support({
    id: 'tactical_genius',
    displayName: 'Tactical Genius',
    description: 'One free initiative reroll per turn.',
    category: 'tactical',
    pipelines: ['initiative'],
  }),
];

export const INFANTRY_SPAS: readonly ISPADefinition[] = [
  {
    id: 'foot_cav',
    displayName: 'Foot Cavalry',
    description: '+1 MP on foot; can support dual-weapon carry.',
    category: 'infantry',
    source: 'CamOps',
    xpCost: 15,
    isFlaw: false,
    isOriginOnly: false,
    pipelines: ['movement'],
    requiresDesignation: false,
  },
  {
    id: 'urban_guerrilla',
    displayName: 'Urban Guerrilla',
    description: 'Bonuses to urban concealment, defense, and local support.',
    category: 'infantry',
    source: 'CamOps',
    xpCost: 15,
    isFlaw: false,
    isOriginOnly: false,
    pipelines: ['psr', 'to-hit'],
    requiresDesignation: false,
  },
];

export const ATOW_SPAS: readonly ISPADefinition[] = [
  {
    id: 'atow_combat_sense',
    displayName: 'Combat Sense',
    description:
      'Commander rolls 3d6 keep best 2 on initiative; improved situational awareness.',
    category: 'tactical',
    source: 'ATOW',
    xpCost: 50,
    isFlaw: false,
    isOriginOnly: true,
    pipelines: ['initiative'],
    requiresDesignation: false,
  },
  {
    id: 'atow_combat_paralysis',
    displayName: 'Combat Paralysis',
    description:
      'Commander rolls 3d6 keep lowest 2 on initiative; a battlefield flaw.',
    category: 'tactical',
    source: 'ATOW',
    xpCost: -25,
    isFlaw: true,
    isOriginOnly: true,
    pipelines: ['initiative'],
    requiresDesignation: false,
  },
];
