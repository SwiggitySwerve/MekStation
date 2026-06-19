/**
 * Combat Awards
 *
 * Awards for combat achievements including kills, critical hits,
 * and damage dealt.
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
import { createAutoAwards } from './AutoAwardBuilders';

const AUTO_GRANT_COMBAT_AWARDS = createAutoAwards([
  {
    id: 'first-blood',
    name: 'First Blood',
    description: 'Destroy your first enemy unit in combat.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Common,
    icon: 'award-first-blood',
    criteriaType: CriteriaType.TotalKills,
    criteriaThreshold: 1,
    criteriaDescription: 'Destroy 1 enemy unit',
    sortOrder: 100,
    autoCategory: AutoAwardCategory.KILL,
    autoThreshold: 1,
    autoThresholdType: 'kills',
  },
  {
    id: 'warrior',
    name: 'Warrior',
    description: 'Prove yourself on the battlefield with 3 confirmed kills.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Common,
    icon: 'award-warrior',
    criteriaType: CriteriaType.TotalKills,
    criteriaThreshold: 3,
    criteriaDescription: 'Destroy 3 enemy units',
    sortOrder: 110,
    autoCategory: AutoAwardCategory.KILL,
    autoThreshold: 3,
    autoThresholdType: 'kills',
  },
  {
    id: 'ace',
    name: 'Ace',
    description:
      'Achieve the legendary status of an Ace with 5 confirmed kills.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Uncommon,
    icon: 'award-ace',
    criteriaType: CriteriaType.TotalKills,
    criteriaThreshold: 5,
    criteriaDescription: 'Destroy 5 enemy units',
    sortOrder: 120,
    autoCategory: AutoAwardCategory.KILL,
    autoThreshold: 5,
    autoThresholdType: 'kills',
  },
  {
    id: 'double-ace',
    name: 'Double Ace',
    description:
      'A pilot of exceptional skill, having destroyed 10 enemy units.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Rare,
    icon: 'award-double-ace',
    criteriaType: CriteriaType.TotalKills,
    criteriaThreshold: 10,
    criteriaDescription: 'Destroy 10 enemy units',
    sortOrder: 130,
    autoCategory: AutoAwardCategory.KILL,
    autoThreshold: 10,
    autoThresholdType: 'kills',
  },
  {
    id: 'triple-ace',
    name: 'Triple Ace',
    description: 'A fearsome reputation earned through 15 confirmed kills.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Rare,
    icon: 'award-triple-ace',
    criteriaType: CriteriaType.TotalKills,
    criteriaThreshold: 15,
    criteriaDescription: 'Destroy 15 enemy units',
    sortOrder: 140,
    autoCategory: AutoAwardCategory.KILL,
    autoThreshold: 15,
    autoThresholdType: 'kills',
  },
  {
    id: 'legend',
    name: 'Legend',
    description:
      'Join the ranks of legendary MechWarriors with 25 confirmed kills.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Legendary,
    icon: 'award-legend',
    criteriaType: CriteriaType.TotalKills,
    criteriaThreshold: 25,
    criteriaDescription: 'Destroy 25 enemy units',
    sortOrder: 150,
    autoCategory: AutoAwardCategory.KILL,
    autoThreshold: 25,
    autoThresholdType: 'kills',
  },
]);

export const COMBAT_AWARDS: readonly IAward[] = [
  ...AUTO_GRANT_COMBAT_AWARDS,
  {
    id: 'marksman',
    name: 'Marksman',
    description:
      'Score a critical headshot or cockpit hit, instantly eliminating the target.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Uncommon,
    icon: 'award-marksman',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'headshot' },
      description: 'Score a headshot or cockpit hit',
    },
    repeatable: false,
    sortOrder: 200,
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description:
      'Your precision is legendary. Score 5 critical hits in your career.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Rare,
    icon: 'award-sharpshooter',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 5,
      conditions: { eventType: 'critical_hit' },
      description: 'Score 5 critical hits',
    },
    repeatable: false,
    sortOrder: 210,
  },
  {
    id: 'one-man-army',
    name: 'One Man Army',
    description: 'Destroy 3 or more enemy units in a single mission.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Rare,
    icon: 'award-one-man-army',
    criteria: {
      type: CriteriaType.KillsInMission,
      threshold: 3,
      description: 'Destroy 3 enemy units in one mission',
    },
    repeatable: false,
    sortOrder: 220,
  },
  {
    id: 'devastator',
    name: 'Devastator',
    description: 'Deal over 100 points of damage in a single mission.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Uncommon,
    icon: 'award-devastator',
    criteria: {
      type: CriteriaType.DamageInMission,
      threshold: 100,
      description: 'Deal 100 damage in one mission',
    },
    repeatable: false,
    sortOrder: 230,
  },
  {
    id: 'annihilator',
    name: 'Annihilator',
    description: 'Deal over 250 points of damage in a single mission.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Rare,
    icon: 'award-annihilator',
    criteria: {
      type: CriteriaType.DamageInMission,
      threshold: 250,
      description: 'Deal 250 damage in one mission',
    },
    repeatable: false,
    sortOrder: 240,
  },
];
