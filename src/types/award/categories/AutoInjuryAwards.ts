/**
 * Auto-Grant Injury Awards
 *
 * Awards automatically granted based on injuries sustained.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import { AutoAwardCategory } from '../../campaign/awards/autoAwardTypes';
import {
  IAward,
  AwardRarity,
  AwardCategory,
  CriteriaType,
} from '../AwardInterfaces';

export const AUTO_INJURY_AWARDS: readonly IAward[] = [
  {
    id: 'purple-heart',
    name: 'Purple Heart',
    description: 'Sustained your first injury in the line of duty.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Common,
    icon: 'award-purple-heart',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'injury' },
      description: 'Sustain 1 injury',
    },
    repeatable: false,
    sortOrder: 360,
    autoGrantCriteria: {
      category: AutoAwardCategory.INJURY,
      threshold: 1,
      thresholdType: 'injuries',
      stackable: false,
    },
  },
  {
    id: 'battle-scarred',
    name: 'Battle Scarred',
    description: 'Survived 3 injuries. Your scars tell stories.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Uncommon,
    icon: 'award-battle-scarred',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 3,
      conditions: { eventType: 'injury' },
      description: 'Sustain 3 injuries',
    },
    repeatable: false,
    sortOrder: 370,
    autoGrantCriteria: {
      category: AutoAwardCategory.INJURY,
      threshold: 3,
      thresholdType: 'injuries',
      stackable: false,
    },
  },
  {
    id: 'iron-constitution',
    name: 'Iron Constitution',
    description: 'Survived 5 injuries. Nothing keeps you down.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Rare,
    icon: 'award-iron-constitution',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 5,
      conditions: { eventType: 'injury' },
      description: 'Sustain 5 injuries',
    },
    repeatable: false,
    sortOrder: 380,
    autoGrantCriteria: {
      category: AutoAwardCategory.INJURY,
      threshold: 5,
      thresholdType: 'injuries',
      stackable: false,
    },
  },
  {
    id: 'unkillable',
    name: 'Unkillable',
    description: 'Survived 10 injuries. You defy death itself.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Legendary,
    icon: 'award-unkillable',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 10,
      conditions: { eventType: 'injury' },
      description: 'Sustain 10 injuries',
    },
    repeatable: false,
    sortOrder: 390,
    autoGrantCriteria: {
      category: AutoAwardCategory.INJURY,
      threshold: 10,
      thresholdType: 'injuries',
      stackable: false,
    },
  },
];
