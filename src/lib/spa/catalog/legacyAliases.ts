/**
 * Legacy SPA id → canonical id mapping.
 *
 * System A (campaign acquisition) and System B (combat modifiers) used
 * different conventions (snake_case vs kebab-case, collapsed names).
 * Consumers that still pass the old ids resolve through resolveSPAId()
 * in @/lib/spa without breaking.
 */

import type { ISPAIdAlias } from '@/types/spa/SPADefinition';

export const SPA_LEGACY_ALIASES: readonly ISPAIdAlias[] = [
  // -------------------- System A (snake_case, collapsed) --------------------
  {
    legacyId: 'fast_learner',
    canonicalId: 'aptitude_gunnery',
    source: 'systemA',
  },
  { legacyId: 'toughness', canonicalId: 'pain_resistance', source: 'systemA' },
  {
    legacyId: 'natural_aptitude',
    canonicalId: 'aptitude_gunnery',
    source: 'systemA',
  },
  {
    legacyId: 'slow_learner',
    canonicalId: 'atow_combat_paralysis',
    source: 'systemA',
  },
  {
    legacyId: 'glass_jaw',
    canonicalId: 'atow_combat_paralysis',
    source: 'systemA',
  },
  {
    legacyId: 'gremlins',
    canonicalId: 'atow_combat_paralysis',
    source: 'systemA',
  },

  // -------------------- System B (kebab-case) --------------------
  {
    legacyId: 'weapon-specialist',
    canonicalId: 'weapon_specialist',
    source: 'systemB',
  },
  {
    legacyId: 'gunnery-specialist',
    canonicalId: 'specialist',
    source: 'systemB',
  },
  {
    legacyId: 'blood-stalker',
    canonicalId: 'blood_stalker',
    source: 'systemB',
  },
  { legacyId: 'range-master', canonicalId: 'range_master', source: 'systemB' },
  {
    legacyId: 'cluster-hitter',
    canonicalId: 'cluster_hitter',
    source: 'systemB',
  },
  { legacyId: 'multi-tasker', canonicalId: 'multi_tasker', source: 'systemB' },
  {
    legacyId: 'oblique-attacker',
    canonicalId: 'oblique_attacker',
    source: 'systemB',
  },
  {
    legacyId: 'melee-specialist',
    canonicalId: 'melee_specialist',
    source: 'systemB',
  },
  { legacyId: 'melee-master', canonicalId: 'melee_master', source: 'systemB' },
  {
    legacyId: 'maneuvering-ace',
    canonicalId: 'maneuvering_ace',
    source: 'systemB',
  },
  { legacyId: 'jumping-jack', canonicalId: 'jumping_jack', source: 'systemB' },
  {
    legacyId: 'cross-country',
    canonicalId: 'cross_country',
    source: 'systemB',
  },
  { legacyId: 'heavy-lifter', canonicalId: 'hvy_lifter', source: 'systemB' },
  {
    legacyId: 'animal-mimicry',
    canonicalId: 'animal_mimic',
    source: 'systemB',
  },
  {
    legacyId: 'dodge-maneuver',
    canonicalId: 'dodge_maneuver',
    source: 'systemB',
  },
  { legacyId: 'iron-man', canonicalId: 'iron_man', source: 'systemB' },
  { legacyId: 'iron-will', canonicalId: 'iron_man', source: 'systemB' },
  { legacyId: 'iron_will', canonicalId: 'iron_man', source: 'systemB' },
  {
    legacyId: 'pain-resistance',
    canonicalId: 'pain_resistance',
    source: 'systemB',
  },
  {
    legacyId: 'tactical-genius',
    canonicalId: 'tactical_genius',
    source: 'systemB',
  },
  { legacyId: 'hot-dog', canonicalId: 'hot_dog', source: 'systemB' },
  {
    legacyId: 'some-like-it-hot',
    canonicalId: 'some_like_it_hot',
    source: 'systemB',
  },
];
