import { RulesLevel, ALL_RULES_LEVELS } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

export const ITEMS_PER_PAGE = 50;

export const WEIGHT_CLASS_ORDER: Record<string, number> = {
  [WeightClass.ULTRALIGHT]: 0,
  [WeightClass.LIGHT]: 1,
  [WeightClass.MEDIUM]: 2,
  [WeightClass.HEAVY]: 3,
  [WeightClass.ASSAULT]: 4,
  [WeightClass.SUPERHEAVY]: 5,
};

export const RULES_LEVEL_ORDER: Record<string, number> = {
  [RulesLevel.INTRODUCTORY]: 0,
  [RulesLevel.STANDARD]: 1,
  [RulesLevel.ADVANCED]: 2,
  [RulesLevel.EXPERIMENTAL]: 3,
};

export const RULES_LEVEL_LABELS: Record<string, string> = {
  [RulesLevel.INTRODUCTORY]: 'Intro',
  [RulesLevel.STANDARD]: 'Std',
  [RulesLevel.ADVANCED]: 'Adv',
  [RulesLevel.EXPERIMENTAL]: 'Exp',
};

export const TECH_BASE_OPTIONS = [
  { value: '', label: 'All Tech' },
  { value: TechBase.INNER_SPHERE, label: 'Inner Sphere' },
  { value: TechBase.CLAN, label: 'Clan' },
];

export const WEIGHT_CLASS_OPTIONS = [
  { value: '', label: 'All Classes' },
  ...Object.values(WeightClass).map((wc) => ({ value: wc, label: wc })),
];

export const RULES_LEVEL_OPTIONS = [
  { value: '', label: 'All Levels' },
  ...ALL_RULES_LEVELS.map((rl) => ({ value: rl, label: rl })),
];
