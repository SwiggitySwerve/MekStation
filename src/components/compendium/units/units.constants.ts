import type { UnitFamily } from '@/types/unit/UnitIndex';

import {
  RulesLevel,
  ALL_RULES_LEVELS,
  RULES_LEVEL_TAGS,
} from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

export const UNIT_FAMILY_LABELS: Record<UnitFamily, string> = {
  battlemechs: 'BattleMechs',
  vehicles: 'Vehicles',
  aerospace: 'Aerospace',
  capital: 'Capital Ships',
  battlearmor: 'Battle Armor',
  infantry: 'Infantry',
  protomechs: 'ProtoMechs',
};

export const ITEMS_PER_PAGE = 50;

export const WEIGHT_CLASS_ORDER: Record<string, number> = {
  [WeightClass.ULTRALIGHT]: 0,
  [WeightClass.LIGHT]: 1,
  [WeightClass.MEDIUM]: 2,
  [WeightClass.HEAVY]: 3,
  [WeightClass.ASSAULT]: 4,
  [WeightClass.SUPERHEAVY]: 5,
};

/** Short table labels, keyed by level (decode a stored value with parseRulesLevel). */
export const RULES_LEVEL_LABELS: Partial<Record<RulesLevel, string>> = {
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
  // The index stores the contract tag, so the tag is the filter value.
  ...ALL_RULES_LEVELS.map((rl) => ({
    value: RULES_LEVEL_TAGS[rl],
    label: rl,
  })),
];
