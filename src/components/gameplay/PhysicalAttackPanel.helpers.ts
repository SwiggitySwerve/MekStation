import type { IComponentDamageState } from '@/types/gameplay';
import type {
  PhysicalAttackInvalidReason,
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import type { PhysicalAttackIntentVariant } from './overlays/PhysicalAttackIntentArrow';

export const EMPTY_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

export const REASON_COPY: Partial<Record<PhysicalAttackInvalidReason, string>> =
  {
    WeaponFiredThisTurn: 'Arm fired a weapon this turn',
    MissingActuator: 'Required actuator is missing',
    HipDestroyed: 'Hip actuator destroyed',
    ShoulderDestroyed: 'Shoulder actuator destroyed',
    SameLimbUsedThisTurn: 'Limb already used for a physical attack',
    NoJumpThisTurn: 'DFA requires jumping this turn',
    NoRunThisTurn: 'Charge requires running this turn',
    LimbMissing: 'Limb is missing',
    AttackerProne: 'Attacker is prone',
    AttackerHullDown: 'Attacker is hull-down',
    AttackerNotMek: 'Only Meks can use this physical attack',
    AttackerCannotUsePhysical: 'This unit cannot make physical attacks',
    AttackerCannotCharge: 'This unit cannot charge',
    AttackerAirborne: 'Attacker is airborne',
    TargetNotMek: 'Push target must be a Mek',
    TargetNotDirectlyAhead: 'Push target must be directly ahead',
    TargetProne: 'Target is prone',
    TargetAirborne: 'Target is airborne',
    TargetInsideBuilding: 'Target is inside a building',
    TargetNotInPhysicalRange: 'Target must be adjacent',
    TargetElevationNotInRange: 'Target elevation is not in range',
    UnsupportedAttackType: 'Attack type is unsupported',
    DestinationBlocked: 'Push destination is blocked',
  };

export function attackTypeLabel(
  attackType: PhysicalAttackType,
  limb?: PhysicalAttackLimb,
): string {
  const base: Record<PhysicalAttackType, string> = {
    punch: 'Punch',
    kick: 'Kick',
    charge: 'Charge',
    dfa: 'Death-from-Above',
    push: 'Push',
    trip: 'Trip',
    thrash: 'Thrash',
    'jump-jet-attack': 'Jump Jet Attack',
    'brush-off': 'Brush Off',
    grapple: 'Grapple',
    'break-grapple': 'Break Grapple',
    hatchet: 'Hatchet',
    sword: 'Sword',
    mace: 'Mace',
    lance: 'Lance',
    'retractable-blade': 'Retractable Blade',
    flail: 'Flail',
    'wrecking-ball': 'Wrecking Ball',
  };
  const label = base[attackType];
  if (!limb) return label;
  const limbLabel: Record<PhysicalAttackLimb, string> = {
    leftArm: 'L Arm',
    rightArm: 'R Arm',
    leftLeg: 'L Leg',
    rightLeg: 'R Leg',
  };
  return `${label} (${limbLabel[limb]})`;
}

export function intentVariantFor(
  attackType: PhysicalAttackType,
): PhysicalAttackIntentVariant | null {
  switch (attackType) {
    case 'charge':
      return 'charge';
    case 'dfa':
      return 'dfa';
    case 'push':
      return 'push';
    default:
      return null;
  }
}
