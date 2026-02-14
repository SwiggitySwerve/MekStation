/**
 * Auto-Grant Skill Awards
 *
 * Awards automatically granted when reaching certain skill levels.
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

export const AUTO_SKILL_AWARDS: readonly IAward[] = [
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
