/**
 * Auto-Grant Scenario Awards (Extended Tiers)
 *
 * Campaign mission completion awards automatically granted based on mission count.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import { AutoAwardCategory } from '../../campaign/awards/autoAwardTypes';
import { AwardRarity, AwardCategory, CriteriaType } from '../AwardInterfaces';
import { createAutoAwards } from './AutoAwardBuilders';

export const AUTO_SCENARIO_AWARDS = createAutoAwards([
  {
    id: 'mission-runner',
    name: 'Mission Runner',
    description: 'Complete 5 missions. Starting to build a reputation.',
    category: AwardCategory.Campaign,
    rarity: AwardRarity.Common,
    icon: 'award-mission-runner',
    criteriaType: CriteriaType.MissionsCompleted,
    criteriaThreshold: 5,
    criteriaDescription: 'Complete 5 missions',
    sortOrder: 405,
    autoCategory: AutoAwardCategory.SCENARIO,
    autoThreshold: 5,
    autoThresholdType: 'missions',
  },
  {
    id: 'campaign-legend',
    name: 'Campaign Legend',
    description: 'Complete 50 missions. Your tactical acumen is unmatched.',
    category: AwardCategory.Campaign,
    rarity: AwardRarity.Legendary,
    icon: 'award-campaign-legend',
    criteriaType: CriteriaType.MissionsCompleted,
    criteriaThreshold: 50,
    criteriaDescription: 'Complete 50 missions',
    sortOrder: 460,
    autoCategory: AutoAwardCategory.SCENARIO,
    autoThreshold: 50,
    autoThresholdType: 'missions',
  },
  {
    id: 'centurion-missions',
    name: 'Centurion of Campaigns',
    description: 'Complete 100 missions. A century of operations.',
    category: AwardCategory.Campaign,
    rarity: AwardRarity.Legendary,
    icon: 'award-centurion-missions',
    criteriaType: CriteriaType.MissionsCompleted,
    criteriaThreshold: 100,
    criteriaDescription: 'Complete 100 missions',
    sortOrder: 470,
    autoCategory: AutoAwardCategory.SCENARIO,
    autoThreshold: 100,
    autoThresholdType: 'missions',
  },
]);
