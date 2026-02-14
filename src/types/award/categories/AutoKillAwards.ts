/**
 * Auto-Grant Kill Awards (Extended Tiers)
 *
 * Higher-tier combat awards automatically granted based on kill count.
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

export const AUTO_KILL_AWARDS: readonly IAward[] = [
  {
    id: 'destroyer',
    name: 'Destroyer',
    description:
      'Eliminate 50 enemy units. A force of destruction on the battlefield.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Legendary,
    icon: 'award-destroyer',
    criteria: {
      type: CriteriaType.TotalKills,
      threshold: 50,
      description: 'Destroy 50 enemy units',
    },
    repeatable: false,
    sortOrder: 160,
    autoGrantCriteria: {
      category: AutoAwardCategory.KILL,
      threshold: 50,
      thresholdType: 'kills',
      stackable: false,
    },
  },
  {
    id: 'centurion-kills',
    name: 'Centurion of War',
    description:
      'A century of confirmed kills. Your name echoes across the battlefields.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Legendary,
    icon: 'award-centurion-kills',
    criteria: {
      type: CriteriaType.TotalKills,
      threshold: 100,
      description: 'Destroy 100 enemy units',
    },
    repeatable: false,
    sortOrder: 170,
    autoGrantCriteria: {
      category: AutoAwardCategory.KILL,
      threshold: 100,
      thresholdType: 'kills',
      stackable: false,
    },
  },
  {
    id: 'warlord',
    name: 'Warlord',
    description:
      '250 confirmed kills. Few warriors in history have matched this feat.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Legendary,
    icon: 'award-warlord',
    criteria: {
      type: CriteriaType.TotalKills,
      threshold: 250,
      description: 'Destroy 250 enemy units',
    },
    repeatable: false,
    sortOrder: 180,
    autoGrantCriteria: {
      category: AutoAwardCategory.KILL,
      threshold: 250,
      thresholdType: 'kills',
      stackable: false,
    },
  },
  {
    id: 'extinction-event',
    name: 'Extinction Event',
    description: '500 confirmed kills. You are a walking apocalypse.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Legendary,
    icon: 'award-extinction-event',
    criteria: {
      type: CriteriaType.TotalKills,
      threshold: 500,
      description: 'Destroy 500 enemy units',
    },
    repeatable: false,
    sortOrder: 190,
    autoGrantCriteria: {
      category: AutoAwardCategory.KILL,
      threshold: 500,
      thresholdType: 'kills',
      stackable: false,
    },
  },
];
