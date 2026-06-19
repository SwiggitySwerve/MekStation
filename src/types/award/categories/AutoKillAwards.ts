/**
 * Auto-Grant Kill Awards (Extended Tiers)
 *
 * Higher-tier combat awards automatically granted based on kill count.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import { AutoAwardCategory } from '../../campaign/awards/autoAwardTypes';
import { AwardRarity, AwardCategory, CriteriaType } from '../AwardInterfaces';
import { createAutoAwards } from './AutoAwardBuilders';

export const AUTO_KILL_AWARDS = createAutoAwards([
  {
    id: 'destroyer',
    name: 'Destroyer',
    description:
      'Eliminate 50 enemy units. A force of destruction on the battlefield.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Legendary,
    icon: 'award-destroyer',
    criteriaType: CriteriaType.TotalKills,
    criteriaThreshold: 50,
    criteriaDescription: 'Destroy 50 enemy units',
    sortOrder: 160,
    autoCategory: AutoAwardCategory.KILL,
    autoThreshold: 50,
    autoThresholdType: 'kills',
  },
  {
    id: 'centurion-kills',
    name: 'Centurion of War',
    description:
      'A century of confirmed kills. Your name echoes across the battlefields.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Legendary,
    icon: 'award-centurion-kills',
    criteriaType: CriteriaType.TotalKills,
    criteriaThreshold: 100,
    criteriaDescription: 'Destroy 100 enemy units',
    sortOrder: 170,
    autoCategory: AutoAwardCategory.KILL,
    autoThreshold: 100,
    autoThresholdType: 'kills',
  },
  {
    id: 'warlord',
    name: 'Warlord',
    description:
      '250 confirmed kills. Few warriors in history have matched this feat.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Legendary,
    icon: 'award-warlord',
    criteriaType: CriteriaType.TotalKills,
    criteriaThreshold: 250,
    criteriaDescription: 'Destroy 250 enemy units',
    sortOrder: 180,
    autoCategory: AutoAwardCategory.KILL,
    autoThreshold: 250,
    autoThresholdType: 'kills',
  },
  {
    id: 'extinction-event',
    name: 'Extinction Event',
    description: '500 confirmed kills. You are a walking apocalypse.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Legendary,
    icon: 'award-extinction-event',
    criteriaType: CriteriaType.TotalKills,
    criteriaThreshold: 500,
    criteriaDescription: 'Destroy 500 enemy units',
    sortOrder: 190,
    autoCategory: AutoAwardCategory.KILL,
    autoThreshold: 500,
    autoThresholdType: 'kills',
  },
]);
