import type {
  IPhysicalAttackInput,
  IPhysicalToHitResult,
  PhysicalAttackType,
} from './types';

import {
  calculateChargeToHit,
  calculateDFAToHit,
  calculateKickToHit,
  calculatePunchToHit,
  calculatePushToHit,
  calculateTripToHit,
} from './toHitBasic';
import {
  calculateJumpJetAttackToHit,
  calculateThrashToHit,
} from './toHitOptional';
import {
  calculateBreakGrappleToHit,
  calculateBrushOffToHit,
  calculateGrappleToHit,
  calculateMeleeWeaponToHit,
} from './toHitSpecial';

type PhysicalToHitResolver = (
  input: IPhysicalAttackInput,
) => IPhysicalToHitResult;

const PHYSICAL_TO_HIT_RESOLVERS = {
  punch: calculatePunchToHit,
  kick: calculateKickToHit,
  charge: calculateChargeToHit,
  dfa: calculateDFAToHit,
  push: calculatePushToHit,
  trip: calculateTripToHit,
  thrash: calculateThrashToHit,
  'jump-jet-attack': calculateJumpJetAttackToHit,
  'brush-off': calculateBrushOffToHit,
  grapple: calculateGrappleToHit,
  'break-grapple': calculateBreakGrappleToHit,
  hatchet: calculateMeleeWeaponToHit,
  sword: calculateMeleeWeaponToHit,
  mace: calculateMeleeWeaponToHit,
  lance: calculateMeleeWeaponToHit,
  'retractable-blade': calculateMeleeWeaponToHit,
  flail: calculateMeleeWeaponToHit,
  'wrecking-ball': calculateMeleeWeaponToHit,
} satisfies Record<PhysicalAttackType, PhysicalToHitResolver>;

export function calculatePhysicalToHit(
  input: IPhysicalAttackInput,
): IPhysicalToHitResult {
  return (
    PHYSICAL_TO_HIT_RESOLVERS[input.attackType]?.(input) ?? {
      baseToHit: Infinity,
      finalToHit: Infinity,
      modifiers: [],
      allowed: false,
      restrictionReason: 'Unknown attack type',
      restrictionReasonCode: 'UnsupportedAttackType',
    }
  );
}
