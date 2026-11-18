/** Vehicle validation rule owner. The Tank, VTOL and support-vehicle handlers pass their parsed source facts. */
import {
  getTankMaxTonnage,
  getSupportVehicleMaxTonnage,
  VTOL_TONNAGE,
} from '@/services/construction/constructionConstants';
import { blkEngineName } from '@/services/conversion/blkEngineIdentity';
import { VTOLLocation } from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { SupportVehicleSizeClass } from '@/types/unit/VehicleInterfaces';
import { pushTonnageRangeErrors } from '@/utils/validation/unitTonnage';

import type { VehicleSlotUnit } from './itemSlots';

import { getSupportVehicleBarArmorPoints } from './armor';
import { validateVehicleEngine } from './engine';
import {
  validateCombatVehicleEquipment,
  validateSupportVehicleEquipment,
} from './equipmentValidation';
import {
  vehicleArmorIntroYearErrors,
  vehicleEngineIntroYearErrors,
  vehicleEquipmentIntroYearErrors,
} from './introYear';
export interface VehicleSourceRuleResult {
  errors: string[];
  warnings: string[];
  infos: string[];
}
interface CommonVehicleRuleInput extends VehicleSlotUnit {
  readonly motionType: GroundMotionType;
  readonly movement: VehicleSlotUnit['movement'] & {
    readonly cruiseMP: number;
  };
  readonly techBase: string;
  readonly metadata: { readonly year: number };
  readonly originalBuildYear?: number;
  readonly totalArmorPoints: number;
  readonly maxArmorPoints: number;
  readonly armorLayoutError?: string;
  readonly armorByLocation: Readonly<Partial<Record<string, number>>>;
  readonly isTrailer?: boolean;
}
export type VehicleSourceRuleInput = CommonVehicleRuleInput &
  (
    | { readonly unitType: UnitType.VEHICLE; readonly isSuperheavy: boolean }
    | { readonly unitType: UnitType.VTOL }
    | {
        readonly unitType: UnitType.SUPPORT_VEHICLE;
        readonly sizeClass: SupportVehicleSizeClass;
        readonly barRating: number;
        readonly armorTechRating: number;
      }
  );
export function validateVehicleSourceRules(
  unit: VehicleSourceRuleInput,
): VehicleSourceRuleResult {
  switch (unit.unitType) {
    case UnitType.VEHICLE:
      return combatRules(unit);
    case UnitType.VTOL:
      return vtolRules(unit);
    case UnitType.SUPPORT_VEHICLE:
      return supportRules(unit);
  }
}
function combatRules(
  unit: CommonVehicleRuleInput & { readonly isSuperheavy: boolean },
): VehicleSourceRuleResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const infos: string[] = [];
  errors.push(...validateCombatVehicleEquipment(unit));

  // Tonnage limits
  pushTonnageRangeErrors(errors, unit.tonnage, {
    label: 'Vehicle',
    min: 1,
    max: getTankMaxTonnage(unit.motionType, unit.isSuperheavy),
    minText: '1',
  });

  // Movement validation
  if (unit.movement.cruiseMP < 1 && !unit.isTrailer) {
    errors.push('Non-trailer vehicles must have at least 1 cruise MP');
  }

  if (blkEngineName(unit.engineType) === 'NONE') {
    errors.push(
      ...validateVehicleEngine(
        unit.tonnage,
        unit.movement.cruiseMP,
        null,
        unit.motionType,
      ).errors.map(({ message }) => message),
    );
  }

  // Armor validation
  if (unit.armorLayoutError) errors.push(unit.armorLayoutError);
  if (unit.totalArmorPoints > unit.maxArmorPoints) {
    errors.push(
      `Total armor (${unit.totalArmorPoints}) exceeds maximum (${unit.maxArmorPoints})`,
    );
  }

  errors.push(
    ...vehicleEquipmentIntroYearErrors(unit),
    ...vehicleArmorIntroYearErrors({
      year: unit.metadata.year,
      armorCode: unit.armorType,
      armorTechLevel: unit.armorTechLevel,
      clan: /clan/i.test(String(unit.techBase)),
      mixed: /mixed/i.test(String(unit.techBase)),
    }),
    ...vehicleEngineIntroYearErrors({
      year: unit.metadata.year,
      engineCode: unit.engineType,
      engineRating: unit.engineRating,
      clanEngine: unit.clanEngine === true,
      clan: /clan/i.test(String(unit.techBase)),
      mixed: /mixed/i.test(String(unit.techBase)),
    }),
  );

  // Motion type specific validations
  if (unit.motionType === GroundMotionType.HOVER && unit.tonnage > 50) {
    warnings.push('Hover vehicles over 50 tons are rare');
  }

  return { errors, warnings, infos };
}

function vtolRules(unit: CommonVehicleRuleInput): VehicleSourceRuleResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const infos: string[] = [];
  errors.push(...validateCombatVehicleEquipment(unit, true));

  pushTonnageRangeErrors(errors, unit.tonnage, {
    label: 'VTOL',
    min: VTOL_TONNAGE.min,
    max: VTOL_TONNAGE.max,
  });

  // Movement validation
  if (unit.movement.cruiseMP < 1) {
    errors.push('VTOLs must have at least 1 cruise MP');
  }

  // Armor validation
  if (unit.armorLayoutError) errors.push(unit.armorLayoutError);
  if (unit.totalArmorPoints > unit.maxArmorPoints) {
    errors.push(
      `Total armor (${unit.totalArmorPoints}) exceeds maximum (${unit.maxArmorPoints})`,
    );
  }

  // Rotor cannot be armored beyond 2 points
  const rotorArmor = unit.armorByLocation?.[VTOLLocation.ROTOR] || 0;
  if (rotorArmor > 2) {
    warnings.push('VTOL rotor armor exceeds typical maximum of 2 points');
  }

  return { errors, warnings, infos };
}

function supportRules(
  unit: VehicleSourceRuleInput & {
    readonly unitType: UnitType.SUPPORT_VEHICLE;
  },
): VehicleSourceRuleResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const infos: string[] = [];
  errors.push(...validateSupportVehicleEquipment(unit));
  errors.push(...vehicleEquipmentIntroYearErrors(unit));

  // Tonnage validation by size class
  if (unit.sizeClass === SupportVehicleSizeClass.SMALL && unit.tonnage > 5) {
    errors.push('Small support vehicles cannot exceed 5 tons');
  }
  if (unit.sizeClass === SupportVehicleSizeClass.MEDIUM && unit.tonnage > 80) {
    errors.push('Medium support vehicles cannot exceed 80 tons');
  }
  const maxTonnage = getSupportVehicleMaxTonnage(unit.motionType);
  if (unit.tonnage > maxTonnage) {
    errors.push(
      `${unit.motionType} support vehicles cannot exceed ${maxTonnage} tons`,
    );
  }

  // BAR rating validation
  if (unit.barRating < 1 || unit.barRating > 10) {
    errors.push('BAR rating must be between 1 and 10');
  }

  // Armor validation
  if (unit.armorLayoutError) errors.push(unit.armorLayoutError);
  if (unit.totalArmorPoints > unit.maxArmorPoints) {
    errors.push(
      `Total armor (${unit.totalArmorPoints}) exceeds maximum (${unit.maxArmorPoints})`,
    );
  }
  // TestEntity.correctArmorOverAllocation: the points must fit the armor
  // tonnage they weigh (BAR armor types 43-51 are BAR 2-10); points over the
  // limit are already reported above
  if (
    unit.armorType >= 43 &&
    unit.armorType <= 51 &&
    unit.totalArmorPoints <= unit.maxArmorPoints
  ) {
    const available = getSupportVehicleBarArmorPoints(
      unit.totalArmorPoints,
      unit.barRating,
      unit.armorTechRating,
      unit.tonnage < 5, // RoundWeight.usesKilogramStandard: Small support
      unit.maxArmorPoints,
    );
    if (unit.totalArmorPoints > available) {
      errors.push(
        `Armor allocated (${unit.totalArmorPoints}) exceeds the ${available} points its armor tonnage provides`,
      );
    }
  }

  return { errors, warnings, infos };
}
