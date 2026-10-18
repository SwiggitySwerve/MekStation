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

import { AerospaceSubType } from '../../../types/unit/AerospaceInterfaces';
import { UnitType } from '../../../types/unit/BattleMechInterfaces';
import { calculateAerospaceBV } from './aerospaceBVCalculator';

// ============================================================================
// Unit → BV Adapter (used by `calculateBattleValueForUnit` dispatch)
// ============================================================================

/**
 * Concrete aerospace shapes accepted by {@link calculateAerospaceBVFromUnit}.
 *
 * The dispatcher calls this with an `IAerospace`, `IConventionalFighter`, or
 * `ISmallCraft` — all of which extend `IAerospaceUnit`. We accept the broader
 * `IAerospaceUnit` shape too, so harnesses or test fixtures that build a
 * minimal aerospace-shaped value can call this directly.
 */
export type AerospaceBVDispatchInput =
  | IAerospace
  | IConventionalFighter
  | ISmallCraft
  | IAerospaceUnit;

/**
 * Resolve a numeric or string `armorType` field into the lookup key used by
 * `getArmorBVMultiplier`. `IAerospaceUnit.armorType` is typed as `number`
 * (legacy code-table format) but the BV calculator wants the canonical string
 * key (`"standard"`, `"reactive"`, etc.). Unknown numeric codes fall back to
 * `"standard"` (multiplier 1.0) — the same behavior `getArmorBVMultiplier`
 * provides for unknown strings.
 */
function resolveAerospaceArmorTypeKey(
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
  for (const raw of rawEquipment) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as {
      readonly equipmentId?: string;
      readonly id?: string;
      readonly location?: string;
    };
    const id = item.equipmentId ?? item.id;
    const location = item.location;
    if (typeof id !== 'string' || typeof location !== 'string') continue;
    equipment.push({ id, location });
  }

  return {
    subType: unitTypeToAerospaceSubType(unit.unitType),
    tonnage: unit.tonnage,
    structuralIntegrity: unit.structuralIntegrity,
    safeThrust: unit.movement.safeThrust,
    maxThrust: unit.movement.maxThrust,
    armorType: resolveAerospaceArmorTypeKey(
      (unit as { readonly armorType?: string | number }).armorType,
    ),
    totalArmorPoints: unit.totalArmorPoints,
    equipment,
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
