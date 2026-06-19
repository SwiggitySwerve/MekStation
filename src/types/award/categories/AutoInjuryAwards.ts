/**
 * Auto-Grant Injury Awards
 *
 * Awards automatically granted based on injuries sustained.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import { AutoAwardCategory } from '../../campaign/awards/autoAwardTypes';
import { AwardRarity, AwardCategory, CriteriaType } from '../AwardInterfaces';
import { createAutoAwards } from './AutoAwardBuilders';

export const AUTO_INJURY_AWARDS = createAutoAwards([
  {
    id: 'purple-heart',
    name: 'Purple Heart',
    description: 'Sustained your first injury in the line of duty.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Common,
    icon: 'award-purple-heart',
    criteriaType: CriteriaType.SpecificEvent,
    criteriaThreshold: 1,
    criteriaConditions: { eventType: 'injury' },
    criteriaDescription: 'Sustain 1 injury',
    sortOrder: 360,
    autoCategory: AutoAwardCategory.INJURY,
    autoThreshold: 1,
    autoThresholdType: 'injuries',
  },
  {
    id: 'battle-scarred',
    name: 'Battle Scarred',
    description: 'Survived 3 injuries. Your scars tell stories.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Uncommon,
    icon: 'award-battle-scarred',
    criteriaType: CriteriaType.SpecificEvent,
    criteriaThreshold: 3,
    criteriaConditions: { eventType: 'injury' },
    criteriaDescription: 'Sustain 3 injuries',
    sortOrder: 370,
    autoCategory: AutoAwardCategory.INJURY,
    autoThreshold: 3,
    autoThresholdType: 'injuries',
  },
  {
    id: 'iron-constitution',
    name: 'Iron Constitution',
    description: 'Survived 5 injuries. Nothing keeps you down.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Rare,
    icon: 'award-iron-constitution',
    criteriaType: CriteriaType.SpecificEvent,
    criteriaThreshold: 5,
    criteriaConditions: { eventType: 'injury' },
    criteriaDescription: 'Sustain 5 injuries',
    sortOrder: 380,
    autoCategory: AutoAwardCategory.INJURY,
    autoThreshold: 5,
    autoThresholdType: 'injuries',
  },
  {
    id: 'unkillable',
    name: 'Unkillable',
    description: 'Survived 10 injuries. You defy death itself.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Legendary,
    icon: 'award-unkillable',
    criteriaType: CriteriaType.SpecificEvent,
    criteriaThreshold: 10,
    criteriaConditions: { eventType: 'injury' },
    criteriaDescription: 'Sustain 10 injuries',
    sortOrder: 390,
    autoCategory: AutoAwardCategory.INJURY,
    autoThreshold: 10,
    autoThresholdType: 'injuries',
  },
]);
