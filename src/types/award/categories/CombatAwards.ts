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

export const COMBAT_AWARDS: readonly IAward[] = [
  {
    id: 'first-blood',
    name: 'First Blood',
    description: 'Destroy your first enemy unit in combat.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Common,
    icon: 'award-first-blood',
    criteria: {
      type: CriteriaType.TotalKills,
      threshold: 1,
      description: 'Destroy 1 enemy unit',
    },
    repeatable: false,
    sortOrder: 100,
    autoGrantCriteria: {
      category: AutoAwardCategory.KILL,
      threshold: 1,
      thresholdType: 'kills',
      stackable: false,
    },
  },
  {
    id: 'warrior',
    name: 'Warrior',
    description: 'Prove yourself on the battlefield with 3 confirmed kills.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Common,
    icon: 'award-warrior',
    criteria: {
      type: CriteriaType.TotalKills,
      threshold: 3,
      description: 'Destroy 3 enemy units',
    },
    repeatable: false,
    sortOrder: 110,
    autoGrantCriteria: {
      category: AutoAwardCategory.KILL,
      threshold: 3,
      thresholdType: 'kills',
      stackable: false,
    },
  },
  {
    id: 'ace',
    name: 'Ace',
    description:
      'Achieve the legendary status of an Ace with 5 confirmed kills.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Uncommon,
    icon: 'award-ace',
    criteria: {
      type: CriteriaType.TotalKills,
      threshold: 5,
      description: 'Destroy 5 enemy units',
    },
    repeatable: false,
    sortOrder: 120,
    autoGrantCriteria: {
      category: AutoAwardCategory.KILL,
      threshold: 5,
      thresholdType: 'kills',
      stackable: false,
    },
  },
  {
    id: 'double-ace',
    name: 'Double Ace',
    description:
      'A pilot of exceptional skill, having destroyed 10 enemy units.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Rare,
    icon: 'award-double-ace',
    criteria: {
      type: CriteriaType.TotalKills,
      threshold: 10,
      description: 'Destroy 10 enemy units',
    },
    repeatable: false,
    sortOrder: 130,
    autoGrantCriteria: {
      category: AutoAwardCategory.KILL,
      threshold: 10,
      thresholdType: 'kills',
      stackable: false,
    },
  },
  {
    id: 'triple-ace',
    name: 'Triple Ace',
    description: 'A fearsome reputation earned through 15 confirmed kills.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Rare,
    icon: 'award-triple-ace',
    criteria: {
      type: CriteriaType.TotalKills,
      threshold: 15,
      description: 'Destroy 15 enemy units',
    },
    repeatable: false,
    sortOrder: 140,
    autoGrantCriteria: {
      category: AutoAwardCategory.KILL,
      threshold: 15,
      thresholdType: 'kills',
      stackable: false,
    },
  },
  {
    id: 'legend',
    name: 'Legend',
    description:
      'Join the ranks of legendary MechWarriors with 25 confirmed kills.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Legendary,
    icon: 'award-legend',
    criteria: {
      type: CriteriaType.TotalKills,
      threshold: 25,
      description: 'Destroy 25 enemy units',
    },
    repeatable: false,
    sortOrder: 150,
    autoGrantCriteria: {
      category: AutoAwardCategory.KILL,
      threshold: 25,
      thresholdType: 'kills',
      stackable: false,
    },
  },
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
