import { ISerializedUnit } from '@/types/unit/UnitSerialization';

import { SourceArmorLocation, SourceCriticalEntry } from './LocationMappings';

export interface MegaMekLabUnit {
  chassis: string;
  model: string;
  mul_id: string | number;
  config: string;
  tech_base: string;
  era: string | number;
  source: string;
  rules_level: string | number;
  role?: string;
  mass: number;

  engine: {
    type: string;
    rating: number;
    manufacturer?: string;
  };

  structure: {
    type: string;
    manufacturer?: string | null;
  };

  myomer?: {
    type: string;
    manufacturer?: string | null;
  };

  heat_sinks: {
    type: string;
    count: number;
  };

  walk_mp: string | number;
  jump_mp: string | number;

  armor: {
    type: string;
    manufacturer?: string;
    locations: SourceArmorLocation[];
    total_armor_points?: number;
  };

  weapons_and_equipment: MegaMekLabEquipmentItem[];
  criticals: SourceCriticalEntry[];

  quirks?: string[];
  manufacturers?: MegaMekLabManufacturer[];
  system_manufacturers?: MegaMekLabSystemManufacturer[];
  fluff_text?: MegaMekLabFluff;

  is_omnimech?: boolean;
  omnimech_base_chassis?: string;
  omnimech_configuration?: string;
  base_chassis_heat_sinks?: string | number;

  clanname?: string;
}

export interface MegaMekLabEquipmentItem {
  item_name: string;
  location: string;
  item_type: string;
  tech_base: string;
  is_omnipod?: boolean;
  rear_facing?: boolean;
  turret_mounted?: boolean;
}

export interface MegaMekLabManufacturer {
  name: string;
  location?: string;
}

export interface MegaMekLabSystemManufacturer {
  type: string;
  name: string;
}

export interface MegaMekLabFluff {
  overview?: string;
  capabilities?: string;
  deployment?: string;
  history?: string;
  notes?: string;
}

export interface ConversionWarning {
  readonly field: string;
  readonly message: string;
  readonly sourceValue?: unknown;
}

export interface ConversionResult {
  readonly success: boolean;
  readonly unit: ISerializedUnit | null;
  readonly warnings: ConversionWarning[];
  readonly errors: string[];
}

export interface BatchConversionResult {
  readonly total: number;
  readonly successful: number;
  readonly failed: number;
  readonly results: ConversionResult[];
}
