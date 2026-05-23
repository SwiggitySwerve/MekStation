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

export const REASON_COPY: Record<PhysicalAttackInvalidReason, string> = {
  WeaponFiredThisTurn: 'Arm fired a weapon this turn',
  MissingActuator: 'Required actuator is missing',
  HipDestroyed: 'Hip actuator destroyed',
  ShoulderDestroyed: 'Shoulder actuator destroyed',
  SameLimbUsedThisTurn: 'Limb already used for a physical attack',
  NoJumpThisTurn: 'DFA requires jumping this turn',
  NoRunThisTurn: 'Charge requires running this turn',
  AttackerInfantry: 'Infantry cannot perform DFA',
  AttackerNotMek: 'Attacker must be a Mek',
  AttackerQuad: 'Quad BattleMechs cannot push',
  TargetNotMek: 'Target must be a Mek',
  TargetInfantryOrProtoMek: 'Cannot charge Infantry or ProtoMech targets',
  LimbMissing: 'Limb is missing',
  NoArmsQuirk: 'No Arms quirk prevents this attack',
  LowArmsQuirk: 'Low Arms quirk cannot strike higher targets',
  AttackerProne: 'Attacker is prone',
  TargetProne: 'Target is prone',
  TargetMovementIncomplete: 'Charge target has not completed movement',
  ElevationMismatch: 'Target must be at the same elevation',
  TargetMissing: 'Target no longer exists',
  TargetDestroyed: 'Target is destroyed',
  SelfTarget: 'Cannot target self',
  FriendlyTarget: 'Cannot target friendly unit',
  TargetNotAdjacent: 'Target must be adjacent',
  TargetNotDirectlyAhead: 'Push target must be directly ahead',
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
    hatchet: 'Hatchet',
    sword: 'Sword',
    mace: 'Mace',
    lance: 'Lance',
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
