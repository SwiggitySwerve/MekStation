/**
 * Survival Awards
 *
 * Awards for surviving missions and enduring hardship.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import {
  IAward,
  AwardRarity,
  AwardCategory,
  CriteriaType,
} from '../AwardInterfaces';

export const SURVIVAL_AWARDS: readonly IAward[] = [
  {
    id: 'survivor',
    name: 'Survivor',
    description: 'Complete your first mission without ejecting.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Common,
    icon: 'award-survivor',
    criteria: {
      type: CriteriaType.ConsecutiveSurvival,
      threshold: 1,
      description: 'Survive 1 mission',
    },
    repeatable: false,
    sortOrder: 300,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Survive 5 consecutive missions without ejecting.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Uncommon,
    icon: 'award-veteran',
    criteria: {
      type: CriteriaType.ConsecutiveSurvival,
      threshold: 5,
      description: 'Survive 5 consecutive missions',
    },
    repeatable: false,
    sortOrder: 310,
  },
  {
    id: 'iron-will',
    name: 'Iron Will',
    description:
      'Survive 10 consecutive missions. Your determination is unbreakable.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Rare,
    icon: 'award-iron-will',
    criteria: {
      type: CriteriaType.ConsecutiveSurvival,
      threshold: 10,
      description: 'Survive 10 consecutive missions',
    },
    repeatable: false,
    sortOrder: 320,
  },
  {
    id: 'immortal',
    name: 'Immortal',
    description: 'Survive 25 consecutive missions. Death itself fears you.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Legendary,
    icon: 'award-immortal',
    criteria: {
      type: CriteriaType.ConsecutiveSurvival,
      threshold: 25,
      description: 'Survive 25 consecutive missions',
    },
    repeatable: false,
    sortOrder: 330,
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    description:
      'Return to combat after ejecting, proving that you cannot be kept down.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Uncommon,
    icon: 'award-phoenix',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'return_after_ejection' },
      description: 'Return to combat after ejecting',
    },
    repeatable: false,
    sortOrder: 340,
  },
  {
    id: 'lucky-star',
    name: 'Lucky Star',
    description:
      'Survive a mission with your mech at 10% or less internal structure.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Rare,
    icon: 'award-lucky-star',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'survive_critical_damage' },
      description: 'Survive with critical damage',
    },
    repeatable: false,
    sortOrder: 350,
    secret: true,
  },
];
