/**
 * Service Awards
 *
 * Awards for long-term service and games played.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import {
  IAward,
  AwardRarity,
  AwardCategory,
  CriteriaType,
} from '../AwardInterfaces';

export const SERVICE_AWARDS: readonly IAward[] = [
  {
    id: 'recruit',
    name: 'Recruit',
    description: 'Complete your first game.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Common,
    icon: 'award-recruit',
    criteria: {
      type: CriteriaType.GamesPlayed,
      threshold: 1,
      description: 'Play 1 game',
    },
    repeatable: false,
    sortOrder: 500,
  },
  {
    id: 'regular',
    name: 'Regular',
    description: 'Complete 10 games.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Common,
    icon: 'award-regular',
    criteria: {
      type: CriteriaType.GamesPlayed,
      threshold: 10,
      description: 'Play 10 games',
    },
    repeatable: false,
    sortOrder: 510,
  },
  {
    id: 'seasoned',
    name: 'Seasoned',
    description: 'Complete 50 games.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Uncommon,
    icon: 'award-seasoned',
    criteria: {
      type: CriteriaType.GamesPlayed,
      threshold: 50,
      description: 'Play 50 games',
    },
    repeatable: false,
    sortOrder: 520,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Complete 100 games. A century of battles.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Rare,
    icon: 'award-centurion',
    criteria: {
      type: CriteriaType.GamesPlayed,
      threshold: 100,
      description: 'Play 100 games',
    },
    repeatable: false,
    sortOrder: 530,
  },
  {
    id: 'grand-master',
    name: 'Grand Master',
    description: 'Complete 500 games. Your dedication is unmatched.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Legendary,
    icon: 'award-grand-master',
    criteria: {
      type: CriteriaType.GamesPlayed,
      threshold: 500,
      description: 'Play 500 games',
    },
    repeatable: false,
    sortOrder: 540,
  },
];
