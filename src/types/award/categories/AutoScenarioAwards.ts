/**
 * Auto-Grant Scenario Awards (Extended Tiers)
 *
 * Campaign mission completion awards automatically granted based on mission count.
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

export const AUTO_SCENARIO_AWARDS: readonly IAward[] = [
  {
    id: 'mission-runner',
    name: 'Mission Runner',
    description: 'Complete 5 missions. Starting to build a reputation.',
    category: AwardCategory.Campaign,
    rarity: AwardRarity.Common,
    icon: 'award-mission-runner',
    criteria: {
      type: CriteriaType.MissionsCompleted,
      threshold: 5,
      description: 'Complete 5 missions',
    },
    repeatable: false,
    sortOrder: 405,
    autoGrantCriteria: {
      category: AutoAwardCategory.SCENARIO,
      threshold: 5,
      thresholdType: 'missions',
      stackable: false,
    },
  },
  {
    id: 'campaign-legend',
    name: 'Campaign Legend',
    description: 'Complete 50 missions. Your tactical acumen is unmatched.',
    category: AwardCategory.Campaign,
    rarity: AwardRarity.Legendary,
    icon: 'award-campaign-legend',
    criteria: {
      type: CriteriaType.MissionsCompleted,
      threshold: 50,
      description: 'Complete 50 missions',
    },
    repeatable: false,
    sortOrder: 460,
    autoGrantCriteria: {
      category: AutoAwardCategory.SCENARIO,
      threshold: 50,
      thresholdType: 'missions',
      stackable: false,
    },
  },
  {
    id: 'centurion-missions',
    name: 'Centurion of Campaigns',
    description: 'Complete 100 missions. A century of operations.',
    category: AwardCategory.Campaign,
    rarity: AwardRarity.Legendary,
    icon: 'award-centurion-missions',
    criteria: {
      type: CriteriaType.MissionsCompleted,
      threshold: 100,
      description: 'Complete 100 missions',
    },
    repeatable: false,
    sortOrder: 470,
    autoGrantCriteria: {
      category: AutoAwardCategory.SCENARIO,
      threshold: 100,
      thresholdType: 'missions',
      stackable: false,
    },
  },
];
