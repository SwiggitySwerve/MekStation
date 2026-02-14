/**
 * Special Awards
 *
 * Awards for exceptional or unusual achievements.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import {
  IAward,
  AwardRarity,
  AwardCategory,
  CriteriaType,
} from '../AwardInterfaces';

export const SPECIAL_AWARDS: readonly IAward[] = [
  {
    id: 'against-all-odds',
    name: 'Against All Odds',
    description: 'Win a battle when outnumbered 2:1 or greater.',
    category: AwardCategory.Special,
    rarity: AwardRarity.Legendary,
    icon: 'award-against-all-odds',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'victory_outnumbered' },
      description: 'Win while outnumbered 2:1',
    },
    repeatable: false,
    sortOrder: 600,
    secret: true,
  },
  {
    id: 'david-vs-goliath',
    name: 'David vs Goliath',
    description:
      'Destroy a unit with significantly higher tonnage than your own.',
    category: AwardCategory.Special,
    rarity: AwardRarity.Rare,
    icon: 'award-david-goliath',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'kill_heavier_unit', tonsDifference: 20 },
      description: 'Destroy a unit 20+ tons heavier',
    },
    repeatable: false,
    sortOrder: 610,
  },
  {
    id: 'last-mech-standing',
    name: 'Last Mech Standing',
    description: 'Be the sole survivor on your team and win the battle.',
    category: AwardCategory.Special,
    rarity: AwardRarity.Rare,
    icon: 'award-last-standing',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'sole_survivor_victory' },
      description: 'Win as the last survivor',
    },
    repeatable: false,
    sortOrder: 620,
    secret: true,
  },
  {
    id: 'mercy',
    name: 'Mercy',
    description: 'Accept the surrender of an enemy force.',
    category: AwardCategory.Special,
    rarity: AwardRarity.Uncommon,
    icon: 'award-mercy',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'accept_surrender' },
      description: 'Accept an enemy surrender',
    },
    repeatable: false,
    sortOrder: 630,
  },
  {
    id: 'no-quarter',
    name: 'No Quarter',
    description: 'Refuse the surrender of an enemy force and destroy them.',
    category: AwardCategory.Special,
    rarity: AwardRarity.Uncommon,
    icon: 'award-no-quarter',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'refuse_surrender' },
      description: 'Refuse an enemy surrender',
    },
    repeatable: false,
    sortOrder: 640,
  },
];
