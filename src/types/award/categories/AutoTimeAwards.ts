/**
 * Auto-Grant Time Awards (Years of Service)
 *
 * Service awards automatically granted based on years of service.
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

export const AUTO_TIME_AWARDS: readonly IAward[] = [
  {
    id: 'one-year-service',
    name: 'Year of Service',
    description: 'One year of loyal service to the unit.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Common,
    icon: 'award-one-year',
    criteria: {
      type: CriteriaType.GamesPlayed,
      threshold: 1,
      description: '1 year of service',
    },
    repeatable: false,
    sortOrder: 550,
    autoGrantCriteria: {
      category: AutoAwardCategory.TIME,
      threshold: 1,
      thresholdType: 'years',
      stackable: false,
    },
  },
  {
    id: 'two-year-service',
    name: 'Two Years of Service',
    description: 'Two years serving with distinction.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Common,
    icon: 'award-two-year',
    criteria: {
      type: CriteriaType.GamesPlayed,
      threshold: 2,
      description: '2 years of service',
    },
    repeatable: false,
    sortOrder: 560,
    autoGrantCriteria: {
      category: AutoAwardCategory.TIME,
      threshold: 2,
      thresholdType: 'years',
      stackable: false,
    },
  },
  {
    id: 'five-year-service',
    name: 'Five Years of Service',
    description: 'Five years of dedicated service. A true veteran.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Uncommon,
    icon: 'award-five-year',
    criteria: {
      type: CriteriaType.GamesPlayed,
      threshold: 5,
      description: '5 years of service',
    },
    repeatable: false,
    sortOrder: 570,
    autoGrantCriteria: {
      category: AutoAwardCategory.TIME,
      threshold: 5,
      thresholdType: 'years',
      stackable: false,
    },
  },
  {
    id: 'ten-year-service',
    name: 'Decade of Service',
    description: 'A decade of loyal service. Your commitment is exceptional.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Rare,
    icon: 'award-ten-year',
    criteria: {
      type: CriteriaType.GamesPlayed,
      threshold: 10,
      description: '10 years of service',
    },
    repeatable: false,
    sortOrder: 580,
    autoGrantCriteria: {
      category: AutoAwardCategory.TIME,
      threshold: 10,
      thresholdType: 'years',
      stackable: false,
    },
  },
  {
    id: 'twenty-year-service',
    name: 'Twenty Years of Service',
    description: 'Two decades of unwavering loyalty.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Rare,
    icon: 'award-twenty-year',
    criteria: {
      type: CriteriaType.GamesPlayed,
      threshold: 20,
      description: '20 years of service',
    },
    repeatable: false,
    sortOrder: 590,
    autoGrantCriteria: {
      category: AutoAwardCategory.TIME,
      threshold: 20,
      thresholdType: 'years',
      stackable: false,
    },
  },
  {
    id: 'thirty-year-service',
    name: 'Thirty Years of Service',
    description: 'Three decades of service. A living legend of the unit.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Legendary,
    icon: 'award-thirty-year',
    criteria: {
      type: CriteriaType.GamesPlayed,
      threshold: 30,
      description: '30 years of service',
    },
    repeatable: false,
    sortOrder: 595,
    autoGrantCriteria: {
      category: AutoAwardCategory.TIME,
      threshold: 30,
      thresholdType: 'years',
      stackable: false,
    },
  },
];
