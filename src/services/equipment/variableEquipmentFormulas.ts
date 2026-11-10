/**
 * Variable Equipment Formulas
 *
 * Data-driven formula definitions for BattleTech equipment with variable
 * weight, slots, cost, or damage based on mech properties.
 *
 * @spec openspec/specs/equipment-services/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';
import physicalWeaponFormulas from '@/types/equipment/physicalWeaponFormulas.json';
import {
  IVariableFormulas,
  fixed,
  ceilDivide,
  roundDivide,
  multiply,
  multiplyRound,
  equalsWeight,
} from '@/types/equipment/VariableEquipment';

// Static code facts use the existing formula AST contract and evaluator.
const physical = physicalWeaponFormulas as Readonly<
  Record<keyof typeof physicalWeaponFormulas, IVariableFormulas>
>;

/**
 * Variable equipment formulas
 * Maps equipment ID to formula definitions
 */
export const VARIABLE_EQUIPMENT_FORMULAS: Readonly<
  Record<string, IVariableFormulas>
> = {
  // ============================================================================
  // TARGETING COMPUTERS
  // ============================================================================

  /**
   * Targeting Computer (Inner Sphere)
   * Weight: ceil(directFireWeaponTonnage / 4)
   * Slots: = weight
   * Cost: weight × 10,000
   */
  'targeting-computer-is': {
    weight: ceilDivide('directFireWeaponTonnage', 4),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 10000),
    requiredContext: ['directFireWeaponTonnage'],
  },

  /**
   * Targeting Computer (Clan)
   * Weight: ceil(directFireWeaponTonnage / 5)
   * Slots: = weight
   * Cost: weight × 10,000
   */
  'targeting-computer-clan': {
    weight: ceilDivide('directFireWeaponTonnage', 5),
    criticalSlots: equalsWeight(),
    cost: multiply('weight', 10000),
    requiredContext: ['directFireWeaponTonnage'],
  },

  // ============================================================================
  // MASC
  // ============================================================================

  /**
   * MASC (Inner Sphere)
   * Weight: tonnage / 20, rounded to nearest whole ton
   * Slots: = weight
   * Cost: tonnage × 1,000
   *
   * Examples: 85t → 4 tons (4.25 rounds to 4), 90t → 5 tons (4.5 rounds to 5)
   */
  'masc-is': {
    weight: roundDivide('tonnage', 20),
    criticalSlots: equalsWeight(),
    cost: multiply('tonnage', 1000),
    requiredContext: ['tonnage'],
  },

  /**
   * MASC (Clan)
   * Weight: tonnage / 25, rounded to nearest whole ton
   * Slots: = weight
   * Cost: tonnage × 1,000
   *
   * Examples: 75t → 3 tons, 100t → 4 tons
   */
  'masc-clan': {
    weight: roundDivide('tonnage', 25),
    criticalSlots: equalsWeight(),
    cost: multiply('tonnage', 1000),
    requiredContext: ['tonnage'],
  },

  // ============================================================================
  // SUPERCHARGER
  // ============================================================================

  /**
   * Supercharger
   * Weight: engineWeight × 10%, rounded up to nearest 0.5 ton
   * Values: 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, etc.
   * Slots: 1
   * Cost: engineWeight × 10,000
   */
  supercharger: {
    weight: multiplyRound('engineWeight', 0.1, 0.5),
    criticalSlots: fixed(1),
    cost: multiply('engineWeight', 10000),
    requiredContext: ['engineWeight'],
  },

  // ============================================================================
  // PARTIAL WING
  // ============================================================================

  /**
   * Mech Partial Wing: one record, equipment-tech overrides.
   * MiscType.java:485-503,995-996,2248-2305 at 48fcb2f64.
   * IS: 7%, 8 ordinary criticals; Clan: 5%, 6 ordinary criticals.
   * Native ton rounding makes wing mass half-ton integral, so the cost product
   * below equals Java's ceil(wing tonnage * 50000).
   * Cost: weight × 50,000
   */
  'partial-wing': {
    weight: { ...multiplyRound('tonnage', 0.07, 0.5), nativeTonRounding: true },
    criticalSlots: fixed(8),
    cost: multiply('weight', 50000),
    requiredContext: ['tonnage'],
    techBaseOverrides: {
      [TechBase.CLAN]: {
        weight: {
          ...multiplyRound('tonnage', 0.05, 0.5),
          nativeTonRounding: true,
        },
        criticalSlots: fixed(6),
      },
    },
  },

  // ============================================================================
  // TRIPLE STRENGTH MYOMER (TSM)
  // ============================================================================

  /**
   * Triple Strength Myomer
   * Weight: 0 (replaces standard myomer)
   * Slots: 6 (distributed across torso/legs)
   * Cost: tonnage × 16,000
   */
  tsm: {
    weight: fixed(0),
    criticalSlots: fixed(6),
    cost: multiply('tonnage', 16000),
    requiredContext: ['tonnage'],
  },

  // Preserve public registry order and the shared Claw alias object.
  hatchet: physical['hatchet'],
  sword: physical['sword'],
  mace: physical['mace'],
  claw: physical['claw'],
  claws: physical['claw'],
  lance: physical['lance'],
  talons: physical['talons'],
  'retractable-blade': physical['retractable-blade'],
  flail: physical['flail'],
  'wrecking-ball': physical['wrecking-ball'],
} as const;

/**
 * Get all variable equipment IDs
 */
export function getVariableEquipmentIds(): string[] {
  return Object.keys(VARIABLE_EQUIPMENT_FORMULAS);
}

/**
 * Check if an equipment ID has variable formulas
 */
export function hasVariableEquipmentFormulas(equipmentId: string): boolean {
  return equipmentId in VARIABLE_EQUIPMENT_FORMULAS;
}

/**
 * Get variable formulas for an equipment ID
 */
export function getVariableEquipmentFormulas(
  equipmentId: string,
): IVariableFormulas | undefined {
  return VARIABLE_EQUIPMENT_FORMULAS[equipmentId];
}
