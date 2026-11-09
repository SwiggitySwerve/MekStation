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

import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  BAArmorType,
  BAManipulator,
  BAWeightClass,
} from '@/types/unit/BattleArmorInterfaces';
import {
  BattleArmorWeightClass,
  ManipulatorType,
  type IBattleArmorMountedEquipment,
  type IBattleArmor,
} from '@/types/unit/PersonnelInterfaces';

import {
  calculateBattleArmorBV,
  type IBABreakdown,
  type IBattleArmorBVInput,
} from './battleArmorBV';
import { canMakeBAAntiMekAttacks, projectBAMounts } from './battleArmorMounts';
import { battleArmorBVMovement } from './movement';

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

/** Preserve claw adaptation identity; only vibro/magnetic claws add anti-Mek BV. */
function toBAManipulator(m: ManipulatorType): BAManipulator {
  switch (m) {
    case ManipulatorType.BATTLE:
      return BAManipulator.BATTLE_CLAW;
    case ManipulatorType.HEAVY_BATTLE:
      return BAManipulator.HEAVY_CLAW;
    case ManipulatorType.BATTLE_VIBRO:
    case ManipulatorType.HEAVY_BATTLE_VIBRO:
      return BAManipulator.VIBRO_CLAW;
    default:
      return BAManipulator.NONE;
  }
}

// -----------------------------------------------------------------------------
// Equipment partitioning
// -----------------------------------------------------------------------------

/** Compatibility facade; native decoding and identity lookup have one owner. */
export function partitionBAEquipment(
  equipment: readonly IBattleArmorMountedEquipment[],
  squadSize = 1,
): ReturnType<typeof projectBAMounts> {
  return projectBAMounts(equipment, squadSize);
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
  state: Pick<
    BattleArmorState,
    | 'chassisType'
    | 'motionType'
    | 'techBase'
    | 'weightClass'
    | 'squadSize'
    | 'groundMP'
    | 'jumpMP'
    | 'umuMP'
    | 'armorPerTrooper'
    | 'baArmorType'
    | 'leftManipulator'
    | 'rightManipulator'
  > & { equipment: readonly IBattleArmorMountedEquipment[] },
  options: { gunnery?: number; piloting?: number } = {},
): IBattleArmorBVInput {
  const {
    weapons,
    ammo,
    hasMagneticClamp,
    unresolvedEquipment,
    defensiveEquipmentBV,
    offensiveEquipmentBV,
    ammoAvailableBVByPool,
    ammoCapBVByPool,
  } = partitionBAEquipment(state.equipment, state.squadSize);

  return {
    weightClass: toBAWeightClass(state.weightClass),
    squadSize: state.squadSize,
    ...battleArmorBVMovement({
      groundMP: state.groundMP,
      jumpMP: state.jumpMP,
      umuMP: state.umuMP,
      umuMotion: state.motionType === SquadMotionType.UMU,
      weightClass: toBAWeightClass(state.weightClass),
      equipment: state.equipment.map((m) => m.equipmentId.split(':')[0]),
    }),
    armorPointsPerTrooper: state.armorPerTrooper,
    armorType: state.baArmorType ?? BAArmorType.STANDARD,
    manipulators: {
      left: toBAManipulator(state.leftManipulator),
      right: toBAManipulator(state.rightManipulator),
    },
    weapons,
    ammo,
    hasMagneticClamp,
    unresolvedEquipment,
    defensiveEquipmentBV,
    offensiveEquipmentBV,
    ammoAvailableBVByPool,
    ammoCapBVByPool,
    canAntiMek: canMakeBAAntiMekAttacks({
      ...state,
      baWeightClass: state.weightClass,
    }),
    hasCamoSystem: state.equipment.some(
      (mount) => mount.name.split(':')[0] === 'Camo System',
    ),
    gunnery: options.gunnery,
    piloting: options.piloting,
  };
}

// EquipmentType.java:113-123, pin 48fcb2f64. Codes 28-30 are standard;
// code 32 has the same BV stealth bonus as basic/prototype stealth.
const BLK_BA_ARMOR: Readonly<Record<number, BAArmorType>> = {
  31: BAArmorType.STEALTH_BASIC,
  32: BAArmorType.STEALTH_BASIC,
  33: BAArmorType.STEALTH_IMPROVED,
  34: BAArmorType.STEALTH_PROTOTYPE,
  35: BAArmorType.FIRE_RESISTANT,
  36: BAArmorType.MIMETIC,
  37: BAArmorType.REFLECTIVE,
  38: BAArmorType.REACTIVE,
};

/** Loaded units and editable stores feed the same per-trooper BV owner. */
export function buildBattleArmorBVInputFromUnit(
  unit: IBattleArmor,
  options: { gunnery?: number; piloting?: number } = {},
): IBattleArmorBVInput {
  return buildBattleArmorBVInput(
    {
      ...unit,
      weightClass: unit.baWeightClass,
      groundMP: unit.movement.groundMP,
      baArmorType: BLK_BA_ARMOR[unit.armorType] ?? BAArmorType.STANDARD,
    },
    options,
  );
}

export function calculateBattleArmorBVFromUnit(
  unit: IBattleArmor,
  options: { gunnery?: number; piloting?: number } = {},
): IBABreakdown {
  return calculateBattleArmorBV(buildBattleArmorBVInputFromUnit(unit, options));
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

/** Catalog names and native numeric codes project onto the same typed armor. */
const CONTRACT_ARMOR_ALIASES: Readonly<Record<string, number>> = {
  STANDARD: 28,
  BA_STANDARD_PROTOTYPE: 29,
  BA_STANDARD_ADVANCED: 30,
  STEALTH: 32,
};

export function battleArmorContractArmorType(code: number): string {
  if (code === 0) return 'STANDARD'; // Legacy new-draft code.
  const alias = Object.entries(CONTRACT_ARMOR_ALIASES).find(
    ([, value]) => value === code,
  )?.[0];
  if (alias) return alias;
  const key = Object.entries(BAArmorType).find(
    ([, value]) => value === BLK_BA_ARMOR[code],
  )?.[0];
  if (!key) throw new TypeError(`Unknown battle armor code: ${code}`);
  return key === 'STEALTH_BASIC' ? `BA_${key}` : key;
}

export function mapBattleArmorContractArmor(source: string): {
  armorType: number;
  baArmorType: BAArmorType;
} {
  const key = source.replace(/^BA_/, '');
  const typed = Object.entries(BAArmorType).find(([name]) => name === key)?.[1];
  const code =
    CONTRACT_ARMOR_ALIASES[source] ??
    Number(
      Object.entries(BLK_BA_ARMOR).find(([, value]) => value === typed)?.[0],
    );
  if (!Number.isFinite(code))
    throw new Error('The battle armor editor cannot open this armor type yet.');
  return {
    armorType: code,
    baArmorType: BLK_BA_ARMOR[code] ?? BAArmorType.STANDARD,
  };
}
