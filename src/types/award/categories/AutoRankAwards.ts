/**
 * Auto-Grant Rank Awards
 *
 * Awards automatically granted when reaching certain ranks.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import { AutoAwardCategory } from '../../campaign/awards/autoAwardTypes';
import { AwardRarity, AwardCategory, CriteriaType } from '../AwardInterfaces';
import { createAutoAwards } from './AutoAwardBuilders';

export const AUTO_RANK_AWARDS = createAutoAwards([
  {
    id: 'officer-commission',
    name: 'Officer Commission',
    description: 'Achieved the rank of officer.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Uncommon,
    icon: 'award-officer',
    criteriaType: CriteriaType.SpecificEvent,
    criteriaThreshold: 1,
    criteriaConditions: { eventType: 'promotion' },
    criteriaDescription: 'Reach officer rank (level 3+)',
    sortOrder: 700,
    autoCategory: AutoAwardCategory.RANK,
    autoThreshold: 3,
    autoThresholdType: 'rank_level',
    rankMode: 'inclusive',
  },
  {
    id: 'senior-officer',
    name: 'Senior Officer',
    description: 'Achieved senior officer rank.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Rare,
    icon: 'award-senior-officer',
    criteriaType: CriteriaType.SpecificEvent,
    criteriaThreshold: 1,
    criteriaConditions: { eventType: 'promotion' },
    criteriaDescription: 'Reach senior officer rank (level 6+)',
    sortOrder: 710,
    autoCategory: AutoAwardCategory.RANK,
    autoThreshold: 6,
    autoThresholdType: 'rank_level',
    rankMode: 'inclusive',
  },
  {
    id: 'command-rank',
    name: 'Command Rank',
    description: 'Achieved command rank. You lead from the front.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Legendary,
    icon: 'award-command-rank',
    criteriaType: CriteriaType.SpecificEvent,
    criteriaThreshold: 1,
    criteriaConditions: { eventType: 'promotion' },
    criteriaDescription: 'Reach command rank (level 9+)',
    sortOrder: 720,
    autoCategory: AutoAwardCategory.RANK,
    autoThreshold: 9,
    autoThresholdType: 'rank_level',
    rankMode: 'inclusive',
  },
]);
