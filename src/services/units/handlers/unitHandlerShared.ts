import type { IBlkDocument } from '@/types/formats/BlkFormat';
import type {
  IBaseUnit,
  IAerospaceMovement,
} from '@/types/unit/BaseUnitInterfaces';
import type { IUnitValidateResult } from '@/types/unit/UnitTypeHandler';

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

/** Structural numeric checks for source loading, not construction. */
export function pushSourceLoadNumberErrors(
  errors: string[],
  document: IBlkDocument,
  movementField: 'cruiseMP' | 'safeThrust' | 'jumpingMP',
): void {
  const tags = document.rawTags ?? {};
  const movementTag =
    movementField === 'safeThrust' ? 'SafeThrust' : movementField;
  const fields = [
    ['tonnage', document.tonnage, tags['Tonnage'] ?? tags['tonnage']],
    [movementField, document[movementField], tags[movementTag]],
  ] as const;
  for (const [field, value, raw] of fields) {
    const scalar = Array.isArray(raw)
      ? raw.length === 1
        ? raw[0]
        : undefined
      : raw;
    const validRaw =
      raw === undefined ||
      (typeof scalar === 'string' &&
        scalar.trim() !== '' &&
        Number(scalar) === value);
    const validMovement =
      field === 'tonnage' ||
      (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
    if (!Number.isFinite(value) || !validMovement || !validRaw) {
      errors.push(
        `Invalid source field ${field}: expected finite ${
          field === 'tonnage' ? 'tonnage' : 'non-negative integer movement'
        }`,
      );
    }
  }
}

/** Keep source-loaded units consistent with their existing construction validator. */
export function withConstructionDiagnostics<T extends IBaseUnit>(
  unit: T,
  validation: IUnitValidateResult,
): T {
  return {
    ...unit,
    isValid: validation.isValid,
    validationErrors: validation.errors,
  };
}

interface CommonFieldSource {
  readonly chassis: string;
  readonly model: string;
  readonly tonnage: number;
  readonly techBase: string;
  readonly technology: IBlkHeaderTechnology;
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
  readonly tonnage?: number;
  readonly totalWeight?: number;
}

interface CombinedCommonUnitFieldOptions extends CommonUnitFieldOptions {
  readonly typeSpecificFields: object;
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
  tonnage = commonFields.tonnage,
  totalWeight = tonnage,
}: CommonUnitFieldOptions): CommonUnitFields {
  const { techBase, rulesLevel } = commonFields.technology;
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
  ...options
}: CombinedCommonUnitFieldOptions): TUnit {
  return {
    ...buildCommonUnitFields({
      commonFields,
      ...options,
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

/** Binary source facts; unit Mixed mode is outside this import contract. */
export interface IBlkHeaderTechnology {
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
}

export class UnsupportedBlkTechnologyError extends Error {}

/** One lexical owner shared by handler admission and chassis-only consumers. */
function readBlkTechnologyHeader(type: string) {
  const lower = type.toLowerCase();
  const chassis = /mixed\s*\((is|clan) chassis\)/i.exec(type);
  const suffix =
    chassis && type.slice(0, chassis.index).trim() === ''
      ? type
          .slice(chassis.index + chassis[0].length)
          .trim()
          .toLowerCase()
      : undefined;
  const nativeClan =
    /^clan\b/i.test(type) || chassis?.[1].toLowerCase() === 'clan';
  const legacyClan = lower.includes('clan') && !lower.includes('mixed');
  return {
    nativeClan,
    legacyClan,
    qualifiedMixed:
      suffix !== undefined &&
      ['', 'advanced', 'experimental', 'unofficial'].includes(suffix),
    unofficial: suffix === 'unofficial',
    rulesLevel: readLegacyRulesLevel(lower),
  };
}

function readLegacyRulesLevel(lower: string): RulesLevel | undefined {
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
  return undefined;
}

/** Preserve the existing pure-source family policies, including Level 5 fallback. */
function pureRulesPolicy(unitType: UnitType) {
  const fallback =
    unitType === UnitType.INFANTRY
      ? RulesLevel.INTRODUCTORY
      : unitType === UnitType.PROTOMECH
        ? RulesLevel.ADVANCED
        : RulesLevel.STANDARD;
  const experimental = ![
    UnitType.BATTLE_ARMOR,
    UnitType.CONVENTIONAL_FIGHTER,
    UnitType.SMALL_CRAFT,
    UnitType.DROPSHIP,
    UnitType.JUMPSHIP,
    UnitType.WARSHIP,
    UnitType.SPACE_STATION,
    UnitType.INFANTRY,
  ].includes(unitType);
  return { fallback, experimental };
}

/** @spec openspec/changes/establish-all-unit-data-parity/specs/serialization-formats/spec.md */
export function decodeBlkTechnologyHeader(
  type: string,
  unitType: UnitType,
): IBlkHeaderTechnology {
  const header = readBlkTechnologyHeader(type);
  // BLKFile.java:704-734: qualified Mixed headers carry a chassis family and
  // a rules level independently of any explicit component technology flags.
  if (header.qualifiedMixed) {
    if (header.unofficial) {
      throw new UnsupportedBlkTechnologyError(
        'Unsupported BLK rules level Unofficial: RulesLevel has no matching value',
      );
    }
    return {
      techBase: header.nativeClan ? TechBase.CLAN : TechBase.INNER_SPHERE,
      rulesLevel: header.rulesLevel ?? RulesLevel.STANDARD,
    };
  }
  const policy = pureRulesPolicy(unitType);
  const clan =
    unitType === UnitType.BATTLE_ARMOR ? header.nativeClan : header.legacyClan;
  const level =
    header.rulesLevel === RulesLevel.EXPERIMENTAL && !policy.experimental
      ? undefined
      : header.rulesLevel;
  return {
    techBase: clan ? TechBase.CLAN : TechBase.INNER_SPHERE,
    rulesLevel: level ?? policy.fallback,
  };
}

/** Native chassis family only; explicit component flags take precedence at callers. */
export function isClanSourceChassis(type: string): boolean {
  return readBlkTechnologyHeader(type).nativeClan;
}
