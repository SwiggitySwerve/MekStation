import { EquipmentFlag } from '@/types/enums/EquipmentFlag';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

export interface IEquipmentLoadResult {
  readonly success: boolean;
  readonly itemsLoaded: number;
  readonly errors: string[];
  readonly warnings: string[];
}

export interface IEquipmentValidationResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
}

export interface IEquipmentFilter {
  readonly category?: string | string[];
  readonly techBase?: TechBase | TechBase[];
  readonly rulesLevel?: RulesLevel | RulesLevel[];
  readonly maxYear?: number;
  readonly minYear?: number;
  readonly searchText?: string;
  readonly unitType?: UnitType | UnitType[];
  readonly hasFlags?: EquipmentFlag[];
  readonly excludeFlags?: EquipmentFlag[];
}

export interface IEquipmentIndexData {
  files?: {
    weapons?: Record<string, string>;
    ammunition?: Record<string, string> | string;
    electronics?: Record<string, string> | string;
    miscellaneous?: Record<string, string> | string;
  };
}
