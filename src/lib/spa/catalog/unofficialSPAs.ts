/**
 * Unofficial / legacy SPAs (11).
 * Source: MegaMek OptionsConstants.java — unofficial flags block.
 */

import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { gunnery, support } from './builders';

export const UNOFFICIAL_SPAS: readonly ISPADefinition[] = [
  {
    id: 'ei_implant',
    displayName: 'EI Implant',
    description: 'Legacy Clan Enhanced Imaging system.',
    category: 'bioware',
    source: 'Legacy',
    xpCost: null,
    isFlaw: false,
    isOriginOnly: true,
    pipelines: ['to-hit'],
    requiresDesignation: false,
  },
  gunnery({
    id: 'gunnery_laser',
    displayName: 'Gunnery: Energy',
    description: 'Unofficial specialization: -1 to-hit with energy weapons.',
    source: 'Unofficial',
    requiresDesignation: false,
  }),
  gunnery({
    id: 'gunnery_missile',
    displayName: 'Gunnery: Missile',
    description: 'Unofficial specialization: -1 to-hit with missile weapons.',
    source: 'Unofficial',
  }),
  gunnery({
    id: 'gunnery_ballistic',
    displayName: 'Gunnery: Ballistic',
    description: 'Unofficial specialization: -1 to-hit with ballistic weapons.',
    source: 'Unofficial',
  }),
  support({
    id: 'clan_pilot_training',
    displayName: 'Clan Pilot Training',
    description: 'Unofficial flaw: +1 physical attack penalty.',
    source: 'Unofficial',
    category: 'piloting',
    isFlaw: true,
    xpCost: -15,
    pipelines: ['to-hit'],
  }),
  support({
    id: 'some_like_it_hot',
    displayName: 'Some Like It Hot',
    description:
      'Unofficial: removes one point of heat-induced to-hit penalty.',
    source: 'Unofficial',
    pipelines: ['heat', 'to-hit'],
  }),
  support({
    id: 'weathered',
    displayName: 'Weathered',
    description: 'Ignore weather-related gunnery penalties.',
    source: 'Unofficial',
    pipelines: ['to-hit'],
  }),
  support({
    id: 'allweather',
    displayName: 'All Weather',
    description: 'Ignore weather-related PSR penalties.',
    source: 'Unofficial',
    pipelines: ['psr'],
  }),
  support({
    id: 'blind_fighter',
    displayName: 'Blind Fighter',
    description: 'Ignore darkness-related gunnery penalties.',
    source: 'Unofficial',
    pipelines: ['to-hit'],
  }),
  support({
    id: 'sensor_geek',
    displayName: 'Sensor Geek',
    description: '-2 bonus on sensor detection checks.',
    source: 'Unofficial',
    pipelines: ['sensors'],
  }),
  support({
    id: 'small_pilot',
    displayName: 'Small Pilot',
    description: 'Fits in small cockpits without the usual skill penalty.',
    source: 'Unofficial',
    pipelines: ['special'],
    isOriginOnly: true,
  }),
];
