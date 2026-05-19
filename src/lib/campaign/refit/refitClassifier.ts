/**
 * Refit Classifier — diff two unit configurations into a refit class
 *
 * Pure functions, no IO. `classifyRefit` inspects the diff between a
 * unit's current `MechBuildConfig` and a target `MechBuildConfig` and
 * returns the least-disruptive `RefitClass` that covers the change
 * (design D2):
 *
 *   - a structural change (engine, internal structure) → ChassisConversion
 *   - a chassis-level loadout change (armour, heat sinks, jump MP) →
 *     VariantUpgrade
 *   - anything else (cockpit / gyro / armour-point swap) → EquipmentSwap
 *   - an identical target → EquipmentSwap (the cheapest class; refit is a
 *     no-op but still classifiable for a deterministic estimate)
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 * @module lib/campaign/refit/refitClassifier
 */

import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { RefitClass } from '@/types/campaign/Refit';

// =============================================================================
// Configuration Diff
// =============================================================================

/**
 * Field-level breakdown of how two configurations differ. Each flag is
 * true when that aspect of the build changed between current and target.
 */
export interface IRefitConfigDiff {
  /** Engine rating or engine type changed (a structural change). */
  readonly engineChanged: boolean;
  /** Internal structure type changed (a structural change). */
  readonly structureChanged: boolean;
  /** Tonnage changed (a structural change — a different chassis weight). */
  readonly tonnageChanged: boolean;
  /** Armour type or armour-point allocation changed. */
  readonly armorChanged: boolean;
  /** Heat-sink type or count changed. */
  readonly heatSinkChanged: boolean;
  /** Jump MP changed. */
  readonly jumpChanged: boolean;
  /** Cockpit or gyro type changed. */
  readonly equipmentChanged: boolean;
  /** True when no field differs at all. */
  readonly identical: boolean;
}

/**
 * Diff two `MechBuildConfig`s field by field.
 *
 * @param current - the unit's current configuration
 * @param target - the desired target configuration
 * @returns a structured diff
 */
export function diffConfigurations(
  current: MechBuildConfig,
  target: MechBuildConfig,
): IRefitConfigDiff {
  const engineChanged =
    current.engineRating !== target.engineRating ||
    current.engineType !== target.engineType;
  const structureChanged =
    current.internalStructureType !== target.internalStructureType;
  const tonnageChanged = current.tonnage !== target.tonnage;
  const armorChanged =
    current.armorType !== target.armorType ||
    current.totalArmorPoints !== target.totalArmorPoints;
  const heatSinkChanged =
    current.heatSinkType !== target.heatSinkType ||
    current.totalHeatSinks !== target.totalHeatSinks;
  const jumpChanged = current.jumpMP !== target.jumpMP;
  const equipmentChanged =
    current.cockpitType !== target.cockpitType ||
    current.gyroType !== target.gyroType;

  const identical =
    !engineChanged &&
    !structureChanged &&
    !tonnageChanged &&
    !armorChanged &&
    !heatSinkChanged &&
    !jumpChanged &&
    !equipmentChanged;

  return {
    engineChanged,
    structureChanged,
    tonnageChanged,
    armorChanged,
    heatSinkChanged,
    jumpChanged,
    equipmentChanged,
    identical,
  };
}

// =============================================================================
// Classification
// =============================================================================

/**
 * Classify a refit by diffing the current configuration against the
 * target and returning the least-disruptive covering refit class.
 *
 * - A structural change (engine, internal structure, tonnage) is a
 *   `ChassisConversion` — the heaviest class.
 * - A chassis-level loadout change (armour, heat sinks, jump MP) that is
 *   not structural is a `VariantUpgrade`.
 * - Any remaining change (cockpit / gyro swap) — or an identical target —
 *   is an `EquipmentSwap`, the cheapest class.
 *
 * @param current - the unit's current configuration
 * @param target - the desired target configuration
 * @returns the least-disruptive `RefitClass` covering the change
 */
export function classifyRefit(
  current: MechBuildConfig,
  target: MechBuildConfig,
): RefitClass {
  const diff = diffConfigurations(current, target);

  if (diff.engineChanged || diff.structureChanged || diff.tonnageChanged) {
    return RefitClass.ChassisConversion;
  }

  if (diff.armorChanged || diff.heatSinkChanged || diff.jumpChanged) {
    return RefitClass.VariantUpgrade;
  }

  // Cockpit/gyro change, or no change at all — the cheapest class.
  return RefitClass.EquipmentSwap;
}
