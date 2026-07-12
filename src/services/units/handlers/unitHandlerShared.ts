import type { IAerospaceMovement } from '@/types/unit/BaseUnitInterfaces';

import {
  getThresholdWeightClass,
  getUnitIndexWeightClass,
} from '@/services/units/unitWeightClass';
import { Era, TechBase, RulesLevel, WeightClass } from '@/types/enums';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

export interface UnitFieldParseMessages {
  readonly errors: string[];
  readonly warnings: string[];
}

export interface UnitValidationMessages extends UnitFieldParseMessages {
  readonly infos: string[];
}

export function createParseMessages(): UnitFieldParseMessages {
  return { errors: [], warnings: [] };
}

export function createValidationMessages(): UnitValidationMessages {
  return { errors: [], warnings: [], infos: [] };
}

interface CommonFieldSource {
  readonly chassis: string;
  readonly model: string;
  readonly tonnage: number;
  readonly techBase: string;
  readonly era: string;
  readonly year: number;
  readonly source?: string;
  readonly role?: string;
}

interface CommonUnitFieldOptions {
  readonly commonFields: CommonFieldSource;
  readonly idPrefix: string;
  readonly unitType: UnitType;
  readonly weightClass: WeightClass;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly tonnage?: number;
  readonly totalWeight?: number;
}

interface CombinedCommonUnitFieldOptions extends Omit<
  CommonUnitFieldOptions,
  'techBase' | 'rulesLevel'
> {
  readonly typeSpecificFields: object;
  readonly rulesLevel?: RulesLevel;
  readonly rulesLevelParser?: (typeStr: string) => RulesLevel;
}

interface CommonUnitFields {
  readonly id: string;
  readonly name: string;
  readonly unitType: UnitType;
  readonly tonnage: number;
  readonly weightClass: WeightClass;
  readonly techBase: TechBase;
  readonly era: Era;
  readonly rulesLevel: RulesLevel;
  readonly metadata: {
    readonly chassis: string;
    readonly model: string;
    readonly year: number;
    readonly rulesLevel: RulesLevel;
    readonly techBase: TechBase;
    readonly role?: string;
  };
  readonly source?: string;
  readonly role?: string;
  readonly bv: number;
  readonly cost: number;
  readonly totalWeight: number;
  readonly remainingTonnage: number;
  readonly isValid: boolean;
  readonly validationErrors: readonly string[];
}

export interface AerospaceUnitCoreFields {
  readonly movement: IAerospaceMovement;
  readonly fuel: number;
  readonly structuralIntegrity: number;
  readonly heatSinks: number;
  readonly heatSinkType: number;
}

export function buildCommonUnitFields({
  commonFields,
  idPrefix,
  unitType,
  weightClass,
  techBase,
  rulesLevel,
  tonnage = commonFields.tonnage,
  totalWeight = tonnage,
}: CommonUnitFieldOptions): CommonUnitFields {
  return {
    id: `${idPrefix}-${Date.now()}`,
    name: `${commonFields.chassis} ${commonFields.model}`.trim(),
    unitType,
    tonnage,
    weightClass,
    techBase,
    era: commonFields.era as Era,
    rulesLevel,
    metadata: {
      chassis: commonFields.chassis,
      model: commonFields.model,
      year: commonFields.year,
      rulesLevel,
      techBase,
      role: commonFields.role,
    },
    source: commonFields.source,
    role: commonFields.role,
    bv: 0,
    cost: 0,
    totalWeight,
    remainingTonnage: 0,
    isValid: true,
    validationErrors: [],
  };
}

export function combineCommonUnitFields<TUnit>({
  commonFields,
  typeSpecificFields,
  rulesLevel,
  rulesLevelParser = parseRulesLevelFromType,
  ...options
}: CombinedCommonUnitFieldOptions): TUnit {
  return {
    ...buildCommonUnitFields({
      commonFields,
      ...options,
      techBase: parseInnerSphereOrClan(commonFields.techBase),
      rulesLevel: rulesLevel ?? rulesLevelParser(commonFields.techBase),
    }),
    ...typeSpecificFields,
  } as TUnit;
}

export function combineAssaultUnitFields<TUnit>(
  options: Omit<CombinedCommonUnitFieldOptions, 'weightClass'>,
): TUnit {
  return combineCommonUnitFields<TUnit>({
    ...options,
    weightClass: WeightClass.ASSAULT,
  });
}

export function getAerospaceWeightClass(tonnage: number): WeightClass {
  return getThresholdWeightClass(
    tonnage,
    [
      { maxTonnage: 45, weightClass: WeightClass.LIGHT },
      { maxTonnage: 70, weightClass: WeightClass.MEDIUM },
    ],
    WeightClass.HEAVY,
  );
}

export function getVehicleWeightClass(tonnage: number): WeightClass {
  return getUnitIndexWeightClass(tonnage);
}

interface TonnageRangeOptions {
  readonly label: string;
  readonly min?: number;
  readonly max?: number;
  readonly minText?: string;
  readonly maxText?: string;
}

export function pushTonnageRangeErrors(
  errors: string[],
  tonnage: number,
  {
    label,
    min,
    max,
    minText = String(min),
    maxText = String(max),
  }: TonnageRangeOptions,
): void {
  if (min !== undefined && tonnage < min) {
    errors.push(`${label} tonnage must be at least ${minText} tons`);
  }
  if (max !== undefined && tonnage > max) {
    errors.push(`${label} tonnage cannot exceed ${maxText} tons`);
  }
}

export function serializeConfigurationWithRulesLevel(
  configuration: string,
  rulesLevel: unknown,
): { readonly configuration: string; readonly rulesLevel: string } {
  return {
    configuration,
    rulesLevel: String(rulesLevel),
  };
}

interface SafeThrustStructuralIntegrityUnit {
  readonly movement: {
    readonly safeThrust: number;
  };
  readonly structuralIntegrity: number;
}

export function pushSafeThrustAndStructureErrors(
  errors: string[],
  unit: SafeThrustStructuralIntegrityUnit,
  safeThrustMessage: string,
  structuralIntegrityMessage: string,
): void {
  if (unit.movement.safeThrust < 1) {
    errors.push(safeThrustMessage);
  }
  if (unit.structuralIntegrity < 1) {
    errors.push(structuralIntegrityMessage);
  }
}

interface EquipmentMapContext<TLocation> {
  readonly mountId: number;
  readonly item: string;
  readonly locationKey: string;
  readonly location: TLocation;
}

export function mapLocationEquipment<TLocation, TEquipment>(
  equipmentByLocation: Record<string, readonly string[]>,
  normalizeLocation: (locationKey: string) => TLocation,
  buildMount: (context: EquipmentMapContext<TLocation>) => TEquipment,
): readonly TEquipment[] {
  const equipment: TEquipment[] = [];
  let mountId = 0;

  for (const [locationKey, items] of Object.entries(equipmentByLocation)) {
    const location = normalizeLocation(locationKey);

    for (const item of items) {
      equipment.push(
        buildMount({ mountId: mountId++, item, locationKey, location }),
      );
    }
  }

  return equipment;
}

export function getRawTagString(
  rawTags: Record<string, string | string[]>,
  key: string,
): string | undefined {
  const value = rawTags[key];
  return Array.isArray(value) ? value[0] : value;
}

export function getRawTagBoolean(
  rawTags: Record<string, string | string[]>,
  key: string,
): boolean {
  const value = getRawTagString(rawTags, key);
  return value?.toLowerCase() === 'true' || value === '1';
}

export function getOptionalRawTagBoolean(
  rawTags: Record<string, string | string[]>,
  key: string,
): boolean | undefined {
  if (rawTags[key] === undefined) return undefined;
  return getRawTagBoolean(rawTags, key);
}

export function getRawTagNumber(
  rawTags: Record<string, string | string[]>,
  key: string,
): number {
  const value = getRawTagString(rawTags, key);
  return value ? parseFloat(value) || 0 : 0;
}

export function parseInnerSphereOrClan(typeStr: string): TechBase {
  const lower = typeStr.toLowerCase();
  return lower.includes('clan') && !lower.includes('mixed')
    ? TechBase.CLAN
    : TechBase.INNER_SPHERE;
}

export function parseRulesLevelFromType(
  typeStr: string,
  fallback: RulesLevel = RulesLevel.STANDARD,
): RulesLevel {
  const lower = typeStr.toLowerCase();
  if (lower.includes('level 1') || lower.includes('introductory')) {
    return RulesLevel.INTRODUCTORY;
  }
  if (lower.includes('level 2') || lower.includes('standard')) {
    return RulesLevel.STANDARD;
  }
  if (lower.includes('level 3') || lower.includes('advanced')) {
    return RulesLevel.ADVANCED;
  }
  if (lower.includes('level 4') || lower.includes('experimental')) {
    return RulesLevel.EXPERIMENTAL;
  }
  return fallback;
}

export function parseRulesLevelThroughAdvancedFromType(
  typeStr: string,
  fallback: RulesLevel = RulesLevel.STANDARD,
): RulesLevel {
  const lower = typeStr.toLowerCase();
  if (lower.includes('level 1') || lower.includes('introductory')) {
    return RulesLevel.INTRODUCTORY;
  }
  if (lower.includes('level 2') || lower.includes('standard')) {
    return RulesLevel.STANDARD;
  }
  if (lower.includes('level 3') || lower.includes('advanced')) {
    return RulesLevel.ADVANCED;
  }
  return fallback;
}
