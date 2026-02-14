/**
 * Auto-Grant Rank Awards
 *
 * Awards automatically granted when reaching certain ranks.
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

export const AUTO_RANK_AWARDS: readonly IAward[] = [
  {
    id: 'officer-commission',
    name: 'Officer Commission',
    description: 'Achieved the rank of officer.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Uncommon,
    icon: 'award-officer',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'promotion' },
      description: 'Reach officer rank (level 3+)',
    },
    repeatable: false,
    sortOrder: 700,
    autoGrantCriteria: {
      category: AutoAwardCategory.RANK,
      threshold: 3,
      thresholdType: 'rank_level',
      stackable: false,
      rankMode: 'inclusive',
    },
  },
  {
    id: 'senior-officer',
    name: 'Senior Officer',
    description: 'Achieved senior officer rank.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Rare,
    icon: 'award-senior-officer',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'promotion' },
      description: 'Reach senior officer rank (level 6+)',
    },
    repeatable: false,
    sortOrder: 710,
    autoGrantCriteria: {
      category: AutoAwardCategory.RANK,
      threshold: 6,
      thresholdType: 'rank_level',
      stackable: false,
      rankMode: 'inclusive',
    },
  },
  {
    id: 'command-rank',
    name: 'Command Rank',
    description: 'Achieved command rank. You lead from the front.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Legendary,
    icon: 'award-command-rank',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'promotion' },
      description: 'Reach command rank (level 9+)',
    },
    repeatable: false,
    sortOrder: 720,
    autoGrantCriteria: {
      category: AutoAwardCategory.RANK,
      threshold: 9,
      thresholdType: 'rank_level',
      stackable: false,
      rankMode: 'inclusive',
    },
  },
];
