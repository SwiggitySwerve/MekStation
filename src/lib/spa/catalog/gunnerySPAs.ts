/**
 * Gunnery-category SPAs (13).
 * Source: MegaMek OptionsConstants.java — gunnery abilities block.
 */

import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { gunnery } from './builders';

export const GUNNERY_SPAS: readonly ISPADefinition[] = [
  gunnery({
    id: 'blood_stalker',
    displayName: 'Blood Stalker',
    description: '-1 to-hit vs designated target, +2 vs all others.',
    requiresDesignation: true,
    designationType: 'target',
  }),
  gunnery({
    id: 'cluster_hitter',
    displayName: 'Cluster Hitter',
    description: '+1 column on the cluster hit table.',
    pipelines: ['damage'],
  }),
  gunnery({
    id: 'cluster_master',
    displayName: 'Cluster Master',
    description: '+2 columns on the cluster hit table.',
    source: 'Unofficial',
    pipelines: ['damage'],
  }),
  gunnery({
    id: 'golden_goose',
    displayName: 'Golden Goose',
    description: 'Reduced bombing to-hit penalty and scatter distance.',
    pipelines: ['to-hit'],
  }),
  gunnery({
    id: 'specialist',
    displayName: 'Gunnery Specialization',
    description: '-1 to-hit with chosen weapon category; +1 with all others.',
    requiresDesignation: true,
    designationType: 'weapon_category',
  }),
  gunnery({
    id: 'multi_tasker',
    displayName: 'Multi-Tasker',
    description: '-1 to secondary target penalty.',
  }),
  gunnery({
    id: 'oblique_artillery',
    displayName: 'Oblique Artilleryman',
    description: 'Reduced artillery scatter (-2 hexes).',
    pipelines: ['damage'],
  }),
  gunnery({
    id: 'oblique_attacker',
    displayName: 'Oblique Attacker',
    description:
      '-1 indirect fire penalty; may fire indirect without a spotter at -1.',
  }),
  gunnery({
    id: 'range_master',
    displayName: 'Range Master',
    description:
      'Swap designated range bracket with another — medium for short, long for medium, etc.',
    requiresDesignation: true,
    designationType: 'range_bracket',
  }),
  gunnery({
    id: 'sandblaster',
    displayName: 'Sandblaster',
    description:
      '+4/+3/+2 cluster-table columns at short/medium/long range with designated weapon.',
    requiresDesignation: true,
    designationType: 'weapon_type',
    pipelines: ['damage'],
  }),
  gunnery({
    id: 'sniper',
    displayName: 'Sniper',
    description: 'Halves all positive range modifiers (round down).',
  }),
  gunnery({
    id: 'weapon_specialist',
    displayName: 'Weapon Specialist',
    description: '-2 to-hit with the designated weapon type.',
    requiresDesignation: true,
    designationType: 'weapon_type',
  }),
  gunnery({
    id: 'aptitude_gunnery',
    displayName: 'Natural Aptitude: Gunnery',
    description: 'Roll 3d6 keep best 2 on gunnery checks.',
    source: 'ATOW',
    isOriginOnly: true,
    xpCost: 40,
  }),
];
