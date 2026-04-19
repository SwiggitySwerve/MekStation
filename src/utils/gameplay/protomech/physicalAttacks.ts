/**
 * ProtoMech Physical Attacks
 *
 * Implements proto kick and punch damage. Unlike mechs, proto physicals are
 * extremely light due to their 2–15 ton scale:
 *   - Kick: damage = floor(tonnage / 2). Max 4 for a 9-ton proto, 7 for a
 *     15-ton Ultraheavy.
 *   - Punch: damage = floor(tonnage / 5). Max 3 for a 15-ton Ultraheavy.
 *   - No main-gun melee (the main gun is fixed fire only).
 *   - Quad protos cannot punch (no arms).
 *
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §6
 */

import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

// =============================================================================
// Attack kinds
// =============================================================================

export type ProtoPhysicalAttackKind = 'kick' | 'punch';

// =============================================================================
// Damage formulas
// =============================================================================

/**
 * Kick damage for a proto of `tonnage` tons.
 *   damage = floor(tonnage / 2)
 */
export function protoKickDamage(tonnage: number): number {
  if (tonnage <= 0) return 0;
  return Math.floor(tonnage / 2);
}

/**
 * Punch damage for a proto of `tonnage` tons.
 *   damage = floor(tonnage / 5)
 */
export function protoPunchDamage(tonnage: number): number {
  if (tonnage <= 0) return 0;
  return Math.floor(tonnage / 5);
}

// =============================================================================
// Attack legality
// =============================================================================

/**
 * Reasons a proto physical attack would be rejected by `canProtoPhysicalAttack`.
 */
export type ProtoPhysicalAttackRejection =
  | 'quad_cannot_punch'
  | 'no_main_gun_melee';

/**
 * Legality + damage descriptor for a proto physical attack.
 */
export interface IProtoPhysicalAttackOutcome {
  readonly kind: ProtoPhysicalAttackKind;
  readonly legal: boolean;
  readonly damage: number;
  readonly rejection?: ProtoPhysicalAttackRejection;
}

/**
 * Resolve whether a proto of given chassis + tonnage may execute the given
 * physical attack. Returns the damage that will be dealt (0 when illegal).
 *
 * Main-gun melee is NEVER permitted — callers must never construct a
 * `'main_gun'` attack kind. The type system prevents that; this function
 * additionally documents the rule via a rejection path for completeness.
 */
export function resolveProtoPhysicalAttack(params: {
  readonly kind: ProtoPhysicalAttackKind;
  readonly chassisType: ProtoChassis;
  readonly tonnage: number;
}): IProtoPhysicalAttackOutcome {
  const { kind, chassisType, tonnage } = params;

  if (kind === 'punch' && chassisType === ProtoChassis.QUAD) {
    return {
      kind,
      legal: false,
      damage: 0,
      rejection: 'quad_cannot_punch',
    };
  }

  const damage =
    kind === 'kick' ? protoKickDamage(tonnage) : protoPunchDamage(tonnage);

  return {
    kind,
    legal: true,
    damage,
  };
}

/**
 * Explicit helper for the "no main-gun melee" rule. Returns the rejection
 * object used in audit logs / UI guards.
 */
export function rejectMainGunMelee(): IProtoPhysicalAttackOutcome {
  return {
    kind: 'kick',
    legal: false,
    damage: 0,
    rejection: 'no_main_gun_melee',
  };
}
