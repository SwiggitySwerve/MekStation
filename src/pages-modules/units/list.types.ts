import type { RulesLevel } from '@/types/enums/RulesLevel';
import type { TechBase } from '@/types/enums/TechBase';
import type { WeightClass } from '@/types/enums/WeightClass';

export interface UnitEntry {
  id: string;
  chassis: string;
  variant: string;
  tonnage: number;
  techBase: TechBase;
  era: string;
  rulesLevel: RulesLevel;
  unitType: string;
  weightClass: WeightClass;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  search: string;
  unitType: string;
  techBase: TechBase | '';
  rulesLevel: RulesLevel | '';
  weightClass: WeightClass | '';
}
