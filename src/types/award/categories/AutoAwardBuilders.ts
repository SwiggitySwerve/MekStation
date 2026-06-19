import { AutoAwardCategory } from '../../campaign/awards/autoAwardTypes';
import {
  type IAward,
  type IAwardCriteria,
  AwardRarity,
  AwardCategory,
  CriteriaType,
} from '../AwardInterfaces';

type AutoAwardDefinition = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: AwardCategory;
  readonly rarity: AwardRarity;
  readonly icon: string;
  readonly criteriaType: CriteriaType;
  readonly criteriaThreshold: number;
  readonly criteriaDescription: string;
  readonly criteriaConditions?: IAwardCriteria['conditions'];
  readonly sortOrder: number;
  readonly autoCategory: AutoAwardCategory;
  readonly autoThreshold: number;
  readonly autoThresholdType: string;
  readonly skillId?: string;
  readonly rankMode?: 'promotion' | 'inclusive' | 'exclusive';
};

export function createAutoAwards(
  definitions: readonly AutoAwardDefinition[],
): readonly IAward[] {
  return definitions.map((definition) => ({
    id: definition.id,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    rarity: definition.rarity,
    icon: definition.icon,
    criteria: {
      type: definition.criteriaType,
      threshold: definition.criteriaThreshold,
      description: definition.criteriaDescription,
      ...(definition.criteriaConditions === undefined
        ? {}
        : { conditions: definition.criteriaConditions }),
    },
    repeatable: false,
    sortOrder: definition.sortOrder,
    autoGrantCriteria: {
      category: definition.autoCategory,
      threshold: definition.autoThreshold,
      thresholdType: definition.autoThresholdType,
      stackable: false,
      ...(definition.skillId === undefined
        ? {}
        : { skillId: definition.skillId }),
      ...(definition.rankMode === undefined
        ? {}
        : { rankMode: definition.rankMode }),
    },
  }));
}
