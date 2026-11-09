import type {
  IAerospace,
  IConventionalFighter,
  ISmallCraft,
} from '../../../types/unit/AerospaceInterfaces';
import type { IAerospaceUnit } from '../../../types/unit/BaseUnitInterfaces';
import type {
  IAerospaceBVBreakdown,
  IAerospaceBVEquipment,
  IAerospaceBVInput,
} from './aerospaceBVTypes';

import { mapHeatSinkType } from '../../../services/conversion/ValueMappings';
import {
  AerospaceCockpitType,
  type AerospaceArc,
  AerospaceSubType,
} from '../../../types/unit/AerospaceInterfaces';
import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import { extractWeaponTypeFromAmmoId } from '../battleValueAmmo';
import {
  projectAerospaceBVArmor,
  resolveAerospaceContractArc,
  type IContractBVAerospace,
} from '../contractBVUnitAdapter';
import { isAmmunitionEquipmentId } from '../equipmentBV/catalogLoader';
import { getAmmunitionEntry } from '../equipmentBVResolver';
import { calculateHeatDissipation } from '../heatSinkCalculations';
import { normalizeArcLocation } from './aerospaceBVArcs';
import { calculateAerospaceBV } from './aerospaceBVCalculator';

// ============================================================================
// Unit → BV Adapter (used by `calculateBattleValueForUnit` dispatch)
// ============================================================================

/** Native aerospace sink codes retain the adapter's single-sink fallback. */
export function resolveBlkAerospaceHeatSinkType(
  code: number | undefined,
): 'DOUBLE' | 'SINGLE' {
  return code === 1 ? 'DOUBLE' : 'SINGLE';
}

/** Live editor values use the same armor facts as contract BV, without catalog reloads. */
export function aerospaceBVUnitFromState(
  state: Pick<
    AerospaceState,
    | 'unitType'
    | 'tonnage'
    | 'structuralIntegrity'
    | 'safeThrust'
    | 'maxThrust'
    | 'heatSinks'
    | 'doubleHeatSinks'
    | 'armorType'
    | 'armorAllocation'
    | 'equipment'
  > & {
    readonly techBase?: string;
    readonly year?: number;
    readonly isFixedWingSupport?: boolean;
    readonly barRating?: number;
    readonly armorTypeByArc?: AerospaceState['armorTypeByArc'];
  },
): IContractBVAerospace & {
  readonly heatSinks: number;
  readonly heatSinkType: number;
} {
  return {
    unitType: state.unitType,
    techBase: state.techBase,
    year: state.year,
    isSupportVehicle: state.isFixedWingSupport === true,
    barRating: state.barRating,
    tonnage: state.tonnage,
    structuralIntegrity: state.structuralIntegrity,
    movement: { safeThrust: state.safeThrust, maxThrust: state.maxThrust },
    heatSinks: state.heatSinks,
    heatSinkType: state.doubleHeatSinks ? 1 : 0,
    ...projectAerospaceBVArmor({
      type: state.armorType,
      byArc: state.armorAllocation,
      typeByArc: state.armorTypeByArc,
    }),
    equipment: state.equipment,
  };
}

/**
 * Concrete aerospace shapes accepted by {@link calculateAerospaceBVFromUnit}.
 *
 * The dispatcher calls this with an `IAerospace`, `IConventionalFighter`, or
 * `ISmallCraft` — all of which extend `IAerospaceUnit`. We accept the broader
 * `IAerospaceUnit` shape too, so harnesses or test fixtures that build a
 * minimal aerospace-shaped value can call this directly.
 */
export type AerospaceBVDispatchInput = (
  | IAerospace
  | IConventionalFighter
  | ISmallCraft
  | IAerospaceUnit
) & {
  readonly cockpit?: string;
  readonly armorByArc?: Readonly<Record<string, number>>;
  readonly armorTypeByArc?: Readonly<Record<string, number>>;
  readonly armorAllocation?: Readonly<Record<string, number>>;
  readonly cockpitType?: AerospaceCockpitType;
  readonly isSupportVehicle?: boolean;
  readonly isFixedWingSupport?: boolean;
  readonly barRating?: number;
  readonly heatCapacity?: number;
  readonly sourceTechType?: string;
  readonly year?: number;
};

/** Normalize represented native and editor armor arc keys once. */
function normalizeArmorArcs(
  values: Readonly<Record<string, number>> | undefined,
  subType: AerospaceSubType,
): Readonly<Partial<Record<AerospaceArc, number>>> | undefined {
  if (!values) return undefined;
  return Object.fromEntries(
    Object.entries(values).map(([arc, value]): [AerospaceArc, number] => {
      const normalized =
        normalizeArcLocation(arc, subType) ??
        normalizeArcLocation(resolveAerospaceContractArc(arc), subType);
      if (normalized === null)
        throw new TypeError('Unknown aerospace armor arc: ' + arc);
      return [normalized, value];
    }),
  );
}

/**
 * Resolve a numeric or string `armorType` field into the lookup key used by
 * `getArmorBVMultiplier`. `IAerospaceUnit.armorType` is typed as `number`
 * (legacy code-table format) but the BV calculator wants the canonical string
 * key (`"standard"`, `"reactive"`, etc.). Unknown numeric codes fall back to
 * `"standard"` (multiplier 1.0) — the same behavior `getArmorBVMultiplier`
 * provides for unknown strings.
 */
export function resolveAerospaceArmorTypeKey(
  armorType: string | number | undefined,
): string {
  if (typeof armorType === 'string' && armorType.length > 0) return armorType;
  // Numeric armor codes do not have a stable mapping in this module yet —
  // treat them as standard armor for BV purposes. Concrete callers (like
  // the AerospaceStatusBar) pass a string key directly.
  return 'standard';
}

/**
 * Map a unit's `unitType` discriminant to the calculator's `AerospaceSubType`.
 * Defaults to ASF (the most common aerospace shape) when the discriminant is
 * absent or unrecognised — the calculator treats ASF as the baseline
 * (1.0 sub-type multiplier, no armor bonus), so this fallback is a safe
 * no-adjustment path rather than an error.
 */
function unitTypeToAerospaceSubType(
  unitType: UnitType | string | undefined,
): AerospaceSubType {
  switch (unitType) {
    case UnitType.CONVENTIONAL_FIGHTER:
      return AerospaceSubType.CONVENTIONAL_FIGHTER;
    case UnitType.SMALL_CRAFT:
      return AerospaceSubType.SMALL_CRAFT;
    case UnitType.AEROSPACE:
    default:
      return AerospaceSubType.AEROSPACE_FIGHTER;
  }
}

/**
 * Build a calculator-ready {@link IAerospaceBVInput} from an aerospace unit.
 *
 * This is the unit-shaped entry point — it strips ASF/CF/SC equipment lists
 * down to the `{ id, location }` rows the calculator needs and forwards the
 * tonnage / SI / thrust fields verbatim. Optional skill overrides flow
 * through `pilotGunnery` / `pilotPiloting` so dispatchers can apply pilot
 * adjustments without rebuilding the whole input.
 */
export function buildAerospaceBVInputFromUnit(
  unit: AerospaceBVDispatchInput,
  options: { gunnery?: number; piloting?: number } = {},
): IAerospaceBVInput {
  // The concrete subtypes (`IAerospace` / `IConventionalFighter` /
  // `ISmallCraft`) carry an `equipment` array of `{equipmentId, location}`
  // rows. The bare `IAerospaceUnit` shape does not — we read the field via
  // a `unknown` cast and default to `[]` so a minimal harness fixture can
  // still flow through this adapter without crashing.
  const rawEquipment =
    (unit as { readonly equipment?: ReadonlyArray<unknown> }).equipment ?? [];
  const equipment: IAerospaceBVEquipment[] = [];
  // FU57/61's persisted family marker covers every FWS weight class.
  const supportVehicle =
    unit.isSupportVehicle || unit.isFixedWingSupport === true;
  for (const raw of rawEquipment) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as {
      readonly equipmentId?: string;
      readonly id?: string;
      readonly location?: string;
      readonly isRearMounted?: boolean;
    };
    const id = item.equipmentId ?? item.id;
    const location = item.location;
    if (typeof id !== 'string' || typeof location !== 'string') continue;
    // Retain source tokens for defensive/explosive equipment consumers.
    const ammo = isAmmunitionEquipmentId(id);
    equipment.push({
      id,
      location,
      isRearMounted: item.isRearMounted,
      ...(ammo ? { isAmmo: true } : {}),
    });
  }

  const subType = unitTypeToAerospaceSubType(unit.unitType);
  return {
    subType,
    isSupportVehicle: supportVehicle,
    hasCommandConsole:
      unit.cockpit?.toUpperCase() === 'COMMAND_CONSOLE' ||
      unit.cockpitType === AerospaceCockpitType.COMMAND_CONSOLE,
    hasSmallCockpit:
      unit.cockpit?.toUpperCase() === 'SMALL' ||
      unit.cockpitType === AerospaceCockpitType.SMALL,
    barRating:
      unit.barRating ??
      (supportVehicle && unit.nativeAerospaceConstruction
        ? Number(unit.nativeAerospaceConstruction.rawTags.barrating ?? 10)
        : undefined),
    techBase: unit.techBase,
    sourceTechType: unit.sourceTechType,
    year: unit.year ?? unit.metadata?.year,
    tonnage: unit.tonnage,
    structuralIntegrity: unit.structuralIntegrity,
    safeThrust: unit.movement.safeThrust,
    maxThrust: unit.movement.maxThrust,
    heatCapacity:
      unit.heatCapacity ??
      (unit.heatSinks === undefined
        ? undefined
        : calculateHeatDissipation(
            mapHeatSinkType(resolveBlkAerospaceHeatSinkType(unit.heatSinkType)),
            unit.heatSinks,
          )),
    armorType: unit.armorTypeByArc
      ? 'patchwork'
      : resolveAerospaceArmorTypeKey(
          (unit as { readonly armorType?: string | number }).armorType,
        ),
    totalArmorPoints: unit.totalArmorPoints,
    armorByArc: unit.armorTypeByArc
      ? normalizeArmorArcs(unit.armorByArc ?? unit.armorAllocation, subType)
      : undefined,
    armorTypeByArc: normalizeArmorArcs(unit.armorTypeByArc, subType),
    equipment,
    // BVCalculator.java:1190-1247: each bin contributes its own catalog value.
    ammo: equipment
      .filter((item) => item.isAmmo)
      .map((item) => {
        const entry = getAmmunitionEntry(item.id.replace(/:OMNI$/i, ''));
        return {
          id: item.id,
          bv: entry?.battleValue ?? 0,
          weaponType: entry?.name ?? extractWeaponTypeFromAmmoId(item.id),
        };
      }),
    pilotGunnery: options.gunnery,
    pilotPiloting: options.piloting,
  };
}

/**
 * Compute the aerospace BV breakdown for an `IAerospaceUnit`-shaped value.
 *
 * Used by {@link calculateBattleValueForUnit} for the aerospace dispatch arm.
 * Equivalent to `calculateAerospaceBV(buildAerospaceBVInputFromUnit(unit))` —
 * exposed as a dedicated helper so callers don't need to import the input
 * builder separately.
 *
 * @spec openspec/changes/add-aerospace-battle-value/specs/battle-value-system/spec.md
 *       — Requirement: Aerospace BV Dispatch
 */
export function calculateAerospaceBVFromUnit(
  unit: AerospaceBVDispatchInput,
  options: { gunnery?: number; piloting?: number } = {},
): IAerospaceBVBreakdown {
  return calculateAerospaceBV(buildAerospaceBVInputFromUnit(unit, options));
}

/**
 * Type guard: does the value's `unitType` mark it as an aerospace unit?
 * Returns true for AEROSPACE, CONVENTIONAL_FIGHTER, or SMALL_CRAFT.
 */
export function isAerospaceUnitType(
  unit: { readonly unitType?: UnitType | string } | null | undefined,
): boolean {
  if (!unit) return false;
  const t = unit.unitType;
  return (
    t === UnitType.AEROSPACE ||
    t === UnitType.CONVENTIONAL_FIGHTER ||
    t === UnitType.SMALL_CRAFT
  );
}
import type { AerospaceState } from '@/stores/aerospaceState';
