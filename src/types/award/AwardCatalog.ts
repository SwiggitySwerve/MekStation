/**
 * Award Catalog
 *
 * Defines all available awards in the game. Awards are organized by category
 * and include criteria for evaluation.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import { AutoAwardCategory } from '../campaign/awards/autoAwardTypes';
import {
  IAward,
  AwardRarity,
  AwardCategory,
  CriteriaType,
} from './AwardInterfaces';

// =============================================================================
// Combat Awards
// =============================================================================

const COMBAT_AWARDS: readonly IAward[] = [
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

// =============================================================================
// Survival Awards
// =============================================================================

const SURVIVAL_AWARDS: readonly IAward[] = [
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

// =============================================================================
// Campaign Awards
// =============================================================================

const CAMPAIGN_AWARDS: readonly IAward[] = [
  {
    id: 'campaign-initiate',
    name: 'Campaign Initiate',
    description: 'Complete your first campaign mission.',
    category: AwardCategory.Campaign,
    rarity: AwardRarity.Common,
    icon: 'award-campaign-initiate',
    criteria: {
      type: CriteriaType.MissionsCompleted,
      threshold: 1,
      description: 'Complete 1 campaign mission',
    },
    repeatable: false,
    sortOrder: 400,
    autoGrantCriteria: {
      category: AutoAwardCategory.SCENARIO,
      threshold: 1,
      thresholdType: 'missions',
      stackable: false,
    },
  },
  {
    id: 'campaign-veteran',
    name: 'Campaign Veteran',
    description: 'Complete 10 campaign missions.',
    category: AwardCategory.Campaign,
    rarity: AwardRarity.Uncommon,
    icon: 'award-campaign-veteran',
    criteria: {
      type: CriteriaType.MissionsCompleted,
      threshold: 10,
      description: 'Complete 10 campaign missions',
    },
    repeatable: false,
    sortOrder: 410,
    autoGrantCriteria: {
      category: AutoAwardCategory.SCENARIO,
      threshold: 10,
      thresholdType: 'missions',
      stackable: false,
    },
  },
  {
    id: 'campaign-elite',
    name: 'Campaign Elite',
    description: 'Complete 25 campaign missions.',
    category: AwardCategory.Campaign,
    rarity: AwardRarity.Rare,
    icon: 'award-campaign-elite',
    criteria: {
      type: CriteriaType.MissionsCompleted,
      threshold: 25,
      description: 'Complete 25 campaign missions',
    },
    repeatable: false,
    sortOrder: 420,
    autoGrantCriteria: {
      category: AutoAwardCategory.SCENARIO,
      threshold: 25,
      thresholdType: 'missions',
      stackable: false,
    },
  },
  {
    id: 'campaign-victor',
    name: 'Campaign Victor',
    description: 'Lead your force to victory in a campaign.',
    category: AwardCategory.Campaign,
    rarity: AwardRarity.Rare,
    icon: 'award-campaign-victor',
    criteria: {
      type: CriteriaType.CampaignsCompleted,
      threshold: 1,
      description: 'Complete 1 campaign',
    },
    repeatable: false,
    sortOrder: 430,
  },
  {
    id: 'campaign-master',
    name: 'Campaign Master',
    description: 'Complete 5 campaigns, proving your strategic excellence.',
    category: AwardCategory.Campaign,
    rarity: AwardRarity.Legendary,
    icon: 'award-campaign-master',
    criteria: {
      type: CriteriaType.CampaignsCompleted,
      threshold: 5,
      description: 'Complete 5 campaigns',
    },
    repeatable: false,
    sortOrder: 440,
  },
  {
    id: 'flawless-campaign',
    name: 'Flawless Campaign',
    description: 'Complete an entire campaign without losing a single pilot.',
    category: AwardCategory.Campaign,
    rarity: AwardRarity.Legendary,
    icon: 'award-flawless-campaign',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'flawless_campaign' },
      description: 'Complete a campaign with no pilot deaths',
    },
    repeatable: false,
    sortOrder: 450,
    secret: true,
  },
];

// =============================================================================
// Service Awards
// =============================================================================

const SERVICE_AWARDS: readonly IAward[] = [
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

// =============================================================================
// Special Awards
// =============================================================================

const SPECIAL_AWARDS: readonly IAward[] = [
  {
    id: 'against-all-odds',
    name: 'Against All Odds',
    description: 'Win a battle when outnumbered 2:1 or greater.',
    category: AwardCategory.Special,
    rarity: AwardRarity.Legendary,
    icon: 'award-against-all-odds',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'victory_outnumbered' },
      description: 'Win while outnumbered 2:1',
    },
    repeatable: false,
    sortOrder: 600,
    secret: true,
  },
  {
    id: 'david-vs-goliath',
    name: 'David vs Goliath',
    description:
      'Destroy a unit with significantly higher tonnage than your own.',
    category: AwardCategory.Special,
    rarity: AwardRarity.Rare,
    icon: 'award-david-goliath',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'kill_heavier_unit', tonsDifference: 20 },
      description: 'Destroy a unit 20+ tons heavier',
    },
    repeatable: false,
    sortOrder: 610,
  },
  {
    id: 'last-mech-standing',
    name: 'Last Mech Standing',
    description: 'Be the sole survivor on your team and win the battle.',
    category: AwardCategory.Special,
    rarity: AwardRarity.Rare,
    icon: 'award-last-standing',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'sole_survivor_victory' },
      description: 'Win as the last survivor',
    },
    repeatable: false,
    sortOrder: 620,
    secret: true,
  },
  {
    id: 'mercy',
    name: 'Mercy',
    description: 'Accept the surrender of an enemy force.',
    category: AwardCategory.Special,
    rarity: AwardRarity.Uncommon,
    icon: 'award-mercy',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'accept_surrender' },
      description: 'Accept an enemy surrender',
    },
    repeatable: false,
    sortOrder: 630,
  },
  {
    id: 'no-quarter',
    name: 'No Quarter',
    description: 'Refuse the surrender of an enemy force and destroy them.',
    category: AwardCategory.Special,
    rarity: AwardRarity.Uncommon,
    icon: 'award-no-quarter',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'refuse_surrender' },
      description: 'Refuse an enemy surrender',
    },
    repeatable: false,
    sortOrder: 640,
  },
];

// =============================================================================
// Auto-Grant Kill Awards (Extended Tiers)
// =============================================================================

const AUTO_KILL_AWARDS: readonly IAward[] = [
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

// =============================================================================
// Auto-Grant Scenario Awards (Extended Tiers)
// =============================================================================

const AUTO_SCENARIO_AWARDS: readonly IAward[] = [
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

// =============================================================================
// Auto-Grant Time Awards (Years of Service)
// =============================================================================

const AUTO_TIME_AWARDS: readonly IAward[] = [
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

// =============================================================================
// Auto-Grant Injury Awards
// =============================================================================

const AUTO_INJURY_AWARDS: readonly IAward[] = [
  {
    id: 'purple-heart',
    name: 'Purple Heart',
    description: 'Sustained your first injury in the line of duty.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Common,
    icon: 'award-purple-heart',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'injury' },
      description: 'Sustain 1 injury',
    },
    repeatable: false,
    sortOrder: 360,
    autoGrantCriteria: {
      category: AutoAwardCategory.INJURY,
      threshold: 1,
      thresholdType: 'injuries',
      stackable: false,
    },
  },
  {
    id: 'battle-scarred',
    name: 'Battle Scarred',
    description: 'Survived 3 injuries. Your scars tell stories.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Uncommon,
    icon: 'award-battle-scarred',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 3,
      conditions: { eventType: 'injury' },
      description: 'Sustain 3 injuries',
    },
    repeatable: false,
    sortOrder: 370,
    autoGrantCriteria: {
      category: AutoAwardCategory.INJURY,
      threshold: 3,
      thresholdType: 'injuries',
      stackable: false,
    },
  },
  {
    id: 'iron-constitution',
    name: 'Iron Constitution',
    description: 'Survived 5 injuries. Nothing keeps you down.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Rare,
    icon: 'award-iron-constitution',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 5,
      conditions: { eventType: 'injury' },
      description: 'Sustain 5 injuries',
    },
    repeatable: false,
    sortOrder: 380,
    autoGrantCriteria: {
      category: AutoAwardCategory.INJURY,
      threshold: 5,
      thresholdType: 'injuries',
      stackable: false,
    },
  },
  {
    id: 'unkillable',
    name: 'Unkillable',
    description: 'Survived 10 injuries. You defy death itself.',
    category: AwardCategory.Survival,
    rarity: AwardRarity.Legendary,
    icon: 'award-unkillable',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 10,
      conditions: { eventType: 'injury' },
      description: 'Sustain 10 injuries',
    },
    repeatable: false,
    sortOrder: 390,
    autoGrantCriteria: {
      category: AutoAwardCategory.INJURY,
      threshold: 10,
      thresholdType: 'injuries',
      stackable: false,
    },
  },
];

// =============================================================================
// Auto-Grant Rank Awards
// =============================================================================

const AUTO_RANK_AWARDS: readonly IAward[] = [
  {
    id: 'officer-commission',
    name: 'Officer Commission',
    description: 'Achieved the rank of officer.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Uncommon,
    icon: 'award-officer',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'promotion' },
      description: 'Reach officer rank (level 3+)',
    },
    repeatable: false,
    sortOrder: 700,
    autoGrantCriteria: {
      category: AutoAwardCategory.RANK,
      threshold: 3,
      thresholdType: 'rank_level',
      stackable: false,
      rankMode: 'inclusive',
    },
  },
  {
    id: 'senior-officer',
    name: 'Senior Officer',
    description: 'Achieved senior officer rank.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Rare,
    icon: 'award-senior-officer',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'promotion' },
      description: 'Reach senior officer rank (level 6+)',
    },
    repeatable: false,
    sortOrder: 710,
    autoGrantCriteria: {
      category: AutoAwardCategory.RANK,
      threshold: 6,
      thresholdType: 'rank_level',
      stackable: false,
      rankMode: 'inclusive',
    },
  },
  {
    id: 'command-rank',
    name: 'Command Rank',
    description: 'Achieved command rank. You lead from the front.',
    category: AwardCategory.Service,
    rarity: AwardRarity.Legendary,
    icon: 'award-command-rank',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'promotion' },
      description: 'Reach command rank (level 9+)',
    },
    repeatable: false,
    sortOrder: 720,
    autoGrantCriteria: {
      category: AutoAwardCategory.RANK,
      threshold: 9,
      thresholdType: 'rank_level',
      stackable: false,
      rankMode: 'inclusive',
    },
  },
];

// =============================================================================
// Auto-Grant Skill Awards
// =============================================================================

const AUTO_SKILL_AWARDS: readonly IAward[] = [
  {
    id: 'expert-marksman',
    name: 'Expert Marksman',
    description: 'Achieved expert gunnery skill.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Uncommon,
    icon: 'award-expert-marksman',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'skill_level' },
      description: 'Reach gunnery skill 3 or better',
    },
    repeatable: false,
    sortOrder: 250,
    autoGrantCriteria: {
      category: AutoAwardCategory.SKILL,
      threshold: 3,
      thresholdType: 'skill_level',
      stackable: false,
      skillId: 'gunnery',
    },
  },
  {
    id: 'master-marksman',
    name: 'Master Marksman',
    description: 'Achieved master gunnery skill. Your aim is legendary.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Rare,
    icon: 'award-master-marksman',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'skill_level' },
      description: 'Reach gunnery skill 2 or better',
    },
    repeatable: false,
    sortOrder: 260,
    autoGrantCriteria: {
      category: AutoAwardCategory.SKILL,
      threshold: 2,
      thresholdType: 'skill_level',
      stackable: false,
      skillId: 'gunnery',
    },
  },
  {
    id: 'elite-marksman',
    name: 'Elite Marksman',
    description: 'Achieved elite gunnery skill. Perfection incarnate.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Legendary,
    icon: 'award-elite-marksman',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'skill_level' },
      description: 'Reach gunnery skill 0',
    },
    repeatable: false,
    sortOrder: 270,
    autoGrantCriteria: {
      category: AutoAwardCategory.SKILL,
      threshold: 0,
      thresholdType: 'skill_level',
      stackable: false,
      skillId: 'gunnery',
    },
  },
  {
    id: 'expert-pilot',
    name: 'Expert Pilot',
    description: 'Achieved expert piloting skill.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Uncommon,
    icon: 'award-expert-pilot',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'skill_level' },
      description: 'Reach piloting skill 3 or better',
    },
    repeatable: false,
    sortOrder: 280,
    autoGrantCriteria: {
      category: AutoAwardCategory.SKILL,
      threshold: 3,
      thresholdType: 'skill_level',
      stackable: false,
      skillId: 'piloting',
    },
  },
  {
    id: 'master-pilot',
    name: 'Master Pilot',
    description: 'Achieved master piloting skill. Grace under fire.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Rare,
    icon: 'award-master-pilot',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'skill_level' },
      description: 'Reach piloting skill 2 or better',
    },
    repeatable: false,
    sortOrder: 290,
    autoGrantCriteria: {
      category: AutoAwardCategory.SKILL,
      threshold: 2,
      thresholdType: 'skill_level',
      stackable: false,
      skillId: 'piloting',
    },
  },
  {
    id: 'elite-pilot',
    name: 'Elite Pilot',
    description: 'Achieved elite piloting skill. One with the machine.',
    category: AwardCategory.Combat,
    rarity: AwardRarity.Legendary,
    icon: 'award-elite-pilot',
    criteria: {
      type: CriteriaType.SpecificEvent,
      threshold: 1,
      conditions: { eventType: 'skill_level' },
      description: 'Reach piloting skill 0',
    },
    repeatable: false,
    sortOrder: 295,
    autoGrantCriteria: {
      category: AutoAwardCategory.SKILL,
      threshold: 0,
      thresholdType: 'skill_level',
      stackable: false,
      skillId: 'piloting',
    },
  },
];

// =============================================================================
// Award Catalog
// =============================================================================

/**
 * Complete catalog of all available awards.
 */
export const AWARD_CATALOG: readonly IAward[] = [
  ...COMBAT_AWARDS,
  ...SURVIVAL_AWARDS,
  ...CAMPAIGN_AWARDS,
  ...SERVICE_AWARDS,
  ...SPECIAL_AWARDS,
  ...AUTO_KILL_AWARDS,
  ...AUTO_SCENARIO_AWARDS,
  ...AUTO_TIME_AWARDS,
  ...AUTO_INJURY_AWARDS,
  ...AUTO_RANK_AWARDS,
  ...AUTO_SKILL_AWARDS,
];

// =============================================================================
// Lookup Functions
// =============================================================================

/**
 * Get an award by its ID.
 */
export function getAwardById(id: string): IAward | undefined {
  return AWARD_CATALOG.find((award) => award.id === id);
}

/**
 * Get all awards in a category.
 */
export function getAwardsByCategory(
  category: AwardCategory,
): readonly IAward[] {
  return AWARD_CATALOG.filter((award) => award.category === category);
}

/**
 * Get all awards of a specific rarity.
 */
export function getAwardsByRarity(rarity: AwardRarity): readonly IAward[] {
  return AWARD_CATALOG.filter((award) => award.rarity === rarity);
}

/**
 * Get visible awards (non-secret) for display.
 */
export function getVisibleAwards(): readonly IAward[] {
  return AWARD_CATALOG.filter((award) => !award.secret);
}

/**
 * Get awards sorted by sort order.
 */
export function getSortedAwards(awards: readonly IAward[]): readonly IAward[] {
  return [...awards].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get all awards that have auto-grant criteria.
 */
export function getAutoGrantableAwards(): readonly IAward[] {
  return AWARD_CATALOG.filter((award) => award.autoGrantCriteria !== undefined);
}
