/**
 * Battle Armor BV Adapter
 *
 * Converts the `BattleArmorState` store shape into the `IBattleArmorBVInput`
 * consumed by `calculateBattleArmorBV`. Keeps the BV calculator free of
 * store/React dependencies so it remains easy to unit test and call from the
 * parity harness.
 *
 * The store uses the personnel-facing enums (`BattleArmorWeightClass`,
 * `ManipulatorType`) while the construction / BV code uses the
 * construction-facing enums (`BAWeightClass`, `BAManipulator`). This adapter
 * owns the mapping.
 *
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-armor-unit-system/spec.md
 */

import type { BattleArmorState } from '@/stores/battleArmorState';

import {
  BAArmorType,
  BAManipulator,
  BAWeightClass,
} from '@/types/unit/BattleArmorInterfaces';
import {
  BattleArmorWeightClass,
  ManipulatorType,
  type IBattleArmorMountedEquipment,
} from '@/types/unit/PersonnelInterfaces';

import {
  calculateBattleArmorBV,
  type BAAmmoBVMount,
  type BAWeaponBVMount,
  type IBABreakdown,
  type IBattleArmorBVInput,
} from './battleArmorBV';

// -----------------------------------------------------------------------------
// Enum mapping: personnel-facing -> construction-facing
// -----------------------------------------------------------------------------

/**
 * Map personnel `BattleArmorWeightClass` onto the construction `BAWeightClass`.
 * The values are identical strings; this function narrows the type cleanly.
 */
function toBAWeightClass(wc: BattleArmorWeightClass): BAWeightClass {
  switch (wc) {
    case BattleArmorWeightClass.PA_L:
      return BAWeightClass.PA_L;
    case BattleArmorWeightClass.LIGHT:
      return BAWeightClass.LIGHT;
    case BattleArmorWeightClass.MEDIUM:
      return BAWeightClass.MEDIUM;
    case BattleArmorWeightClass.HEAVY:
      return BAWeightClass.HEAVY;
    case BattleArmorWeightClass.ASSAULT:
      return BAWeightClass.ASSAULT;
    default:
      return BAWeightClass.LIGHT;
  }
}

/**
 * Map personnel `ManipulatorType` onto the construction `BAManipulator`.
 *
 * The personnel enum is finer grained (e.g. `BATTLE_VIBRO`, `HEAVY_BATTLE_VIBRO`)
 * while the construction enum only models the melee-relevant classes. We map
 * to the nearest melee-class equivalent so BV picks up the correct multiplier:
 *
 *   BATTLE / BATTLE_VIBRO              -> BATTLE_CLAW   (1 BV)
 *   HEAVY_BATTLE / HEAVY_BATTLE_VIBRO  -> HEAVY_CLAW    (2 BV)
 *   VIBRO_CLAW (implicit)              -> VIBRO_CLAW    (3 BV) — used by tests
 *
 * Any manipulator that does not produce a melee bonus (`NONE`, `BASIC`,
 * `ARMORED_GLOVE`, `BASIC_MINE_CLEARANCE`, `CARGO_LIFTER`, `INDUSTRIAL_DRILL`,
 * `SALVAGE_ARM`) maps to `NONE` — zero melee BV.
 */
function toBAManipulator(m: ManipulatorType): BAManipulator {
  switch (m) {
    case ManipulatorType.BATTLE:
    case ManipulatorType.BATTLE_VIBRO:
      return BAManipulator.BATTLE_CLAW;
    case ManipulatorType.HEAVY_BATTLE:
    case ManipulatorType.HEAVY_BATTLE_VIBRO:
      return BAManipulator.HEAVY_CLAW;
    default:
      return BAManipulator.NONE;
  }
}

// -----------------------------------------------------------------------------
// Equipment partitioning
// -----------------------------------------------------------------------------

/**
 * Heuristic: is this mount ammo? Same pattern used by the vehicle BV adapter.
 */
function isAmmo(equipmentId: string): boolean {
  const n = equipmentId.toLowerCase();
  return n.includes('ammo') || n.startsWith('ammo-');
}

/**
 * Heuristic: is this a magnetic clamp mount?
 *
 * The store catalog uses `ba-magnetic-clamp` but other data sources may use
 * `magnetic-clamp`, `magneticclamp`, etc. The check is deliberately fuzzy.
 */
function isMagneticClamp(equipmentId: string, name: string): boolean {
  const id = equipmentId.toLowerCase();
  const n = name.toLowerCase();
  return (
    id.includes('magnetic-clamp') ||
    id.includes('magneticclamp') ||
    n.includes('magnetic clamp')
  );
}

/**
 * Partition BA equipment into weapon / ammo buckets for BV purposes, and
 * detect the presence of Magnetic Clamps for the anti-mech bonus.
 *
 * Non-weapon / non-ammo systems (jump boosters, partial wings, etc.) do not
 * contribute to per-trooper BV directly; their movement-side effect is
 * already baked into `groundMP` / `jumpMP` at construction time.
 */
export function partitionBAEquipment(
  equipment: readonly IBattleArmorMountedEquipment[],
): {
  weapons: BAWeaponBVMount[];
  ammo: BAAmmoBVMount[];
  hasMagneticClamp: boolean;
} {
  const weapons: BAWeaponBVMount[] = [];
  const ammo: BAAmmoBVMount[] = [];
  let hasMagneticClamp = false;

  for (const mount of equipment) {
    if (isMagneticClamp(mount.equipmentId, mount.name)) {
      hasMagneticClamp = true;
      continue;
    }
    if (isAmmo(mount.equipmentId)) {
      ammo.push({ id: mount.equipmentId });
      continue;
    }
    // Default: treat as a weapon. The resolver returns BV=0 for non-weapon
    // IDs, so mis-classified system items simply don't contribute.
    weapons.push({ id: mount.equipmentId });
  }

  return { weapons, ammo, hasMagneticClamp };
}

// -----------------------------------------------------------------------------
// Public adapter
// -----------------------------------------------------------------------------

/**
 * Build a `IBattleArmorBVInput` from a `BattleArmorState` snapshot.
 *
 * Pilot skill defaults to gunnery 4 / piloting 5 (baseline) unless the caller
 * supplies overrides. The store does not track crew skill directly (BA pilot
 * skill is campaign-side), so we let callers pass it in.
 */
export function buildBattleArmorBVInput(
  state: BattleArmorState,
  options: { gunnery?: number; piloting?: number } = {},
): IBattleArmorBVInput {
  const { weapons, ammo, hasMagneticClamp } = partitionBAEquipment(
    state.equipment,
  );

  return {
    weightClass: toBAWeightClass(state.weightClass),
    squadSize: state.squadSize,
    groundMP: state.groundMP,
    jumpMP: state.jumpMP,
    umuMP: state.umuMP,
    armorPointsPerTrooper: state.armorPerTrooper,
    armorType: state.baArmorType ?? BAArmorType.STANDARD,
    manipulators: {
      left: toBAManipulator(state.leftManipulator),
      right: toBAManipulator(state.rightManipulator),
    },
    weapons,
    ammo,
    hasMagneticClamp,
    gunnery: options.gunnery,
    piloting: options.piloting,
  };
}

/**
 * Convenience: compute full BA BV directly from a store snapshot.
 */
export function calculateBattleArmorBVFromState(
  state: BattleArmorState,
  options: { gunnery?: number; piloting?: number } = {},
): IBABreakdown {
  return calculateBattleArmorBV(buildBattleArmorBVInput(state, options));
}
