/**
 * Campaign Awards
 *
 * Awards for completing campaign missions and campaigns.
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

export const CAMPAIGN_AWARDS: readonly IAward[] = [
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
