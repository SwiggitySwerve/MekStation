/**
 * Auto-Grant Time Awards (Years of Service)
 *
 * Service awards automatically granted based on years of service.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import { AutoAwardCategory } from '../../campaign/awards/autoAwardTypes';
import { AwardRarity, AwardCategory, CriteriaType } from '../AwardInterfaces';
import { createAutoAwards } from './AutoAwardBuilders';

export const AUTO_TIME_AWARDS = createAutoAwards([
  {
    id: 'one-year-service',
    name: 'Year of Service',
    description: 'One year of loyal service to the unit.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Common,
    icon: 'award-one-year',
    criteriaType: CriteriaType.GamesPlayed,
    criteriaThreshold: 1,
    criteriaDescription: '1 year of service',
    sortOrder: 550,
    autoCategory: AutoAwardCategory.TIME,
    autoThreshold: 1,
    autoThresholdType: 'years',
  },
  {
    id: 'two-year-service',
    name: 'Two Years of Service',
    description: 'Two years serving with distinction.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Common,
    icon: 'award-two-year',
    criteriaType: CriteriaType.GamesPlayed,
    criteriaThreshold: 2,
    criteriaDescription: '2 years of service',
    sortOrder: 560,
    autoCategory: AutoAwardCategory.TIME,
    autoThreshold: 2,
    autoThresholdType: 'years',
  },
  {
    id: 'five-year-service',
    name: 'Five Years of Service',
    description: 'Five years of dedicated service. A true veteran.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Uncommon,
    icon: 'award-five-year',
    criteriaType: CriteriaType.GamesPlayed,
    criteriaThreshold: 5,
    criteriaDescription: '5 years of service',
    sortOrder: 570,
    autoCategory: AutoAwardCategory.TIME,
    autoThreshold: 5,
    autoThresholdType: 'years',
  },
  {
    id: 'ten-year-service',
    name: 'Decade of Service',
    description: 'A decade of loyal service. Your commitment is exceptional.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Rare,
    icon: 'award-ten-year',
    criteriaType: CriteriaType.GamesPlayed,
    criteriaThreshold: 10,
    criteriaDescription: '10 years of service',
    sortOrder: 580,
    autoCategory: AutoAwardCategory.TIME,
    autoThreshold: 10,
    autoThresholdType: 'years',
  },
  {
    id: 'twenty-year-service',
    name: 'Twenty Years of Service',
    description: 'Two decades of unwavering loyalty.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Rare,
    icon: 'award-twenty-year',
    criteriaType: CriteriaType.GamesPlayed,
    criteriaThreshold: 20,
    criteriaDescription: '20 years of service',
    sortOrder: 590,
    autoCategory: AutoAwardCategory.TIME,
    autoThreshold: 20,
    autoThresholdType: 'years',
  },
  {
    id: 'thirty-year-service',
    name: 'Thirty Years of Service',
    description: 'Three decades of service. A living legend of the unit.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Legendary,
    icon: 'award-thirty-year',
    criteriaType: CriteriaType.GamesPlayed,
    criteriaThreshold: 30,
    criteriaDescription: '30 years of service',
    sortOrder: 595,
    autoCategory: AutoAwardCategory.TIME,
    autoThreshold: 30,
    autoThresholdType: 'years',
  },
]);
