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

/**
 * Human-readable copy for every validator rejection reason, consumed by
 * PhysicalAttackPanel, the tactical dock physical-attack commands, and the
 * command preview. The non-Partial Record annotation is a compile-time
 * exhaustiveness check (audit finding A-11): adding a code to
 * PhysicalAttackInvalidReason without copy here breaks the build instead of
 * silently rendering a blank reason in the UI. Entries follow the union's
 * declaration order in physicalAttacks/types.ts.
 */
export const REASON_COPY: Record<PhysicalAttackInvalidReason, string> = {
  WeaponFiredThisTurn: 'Arm fired a weapon this turn',
  MissingActuator: 'Required actuator is missing',
  HipDestroyed: 'Hip actuator destroyed',
  ShoulderDestroyed: 'Shoulder actuator destroyed',
  SameLimbUsedThisTurn: 'Limb already used for a physical attack',
  InvalidArmSelection: 'Select a valid arm',
  AttackerEvading: 'Attacker is evading',
  AttackerCargoInteraction: 'Attacker is loading or unloading cargo',
  AttackerStuck: 'Attacker is stuck',
  NoJumpThisTurn: 'DFA requires jumping this turn',
  MechanicalJumpBooster: 'DFA cannot use mechanical jump boosters',
  ChargeJumpMovement: 'Charge cannot include jump movement',
  NoRunThisTurn: 'Charge requires running this turn',
  ChargeBackwardMovement: 'Charge cannot include backward movement',
  AttackerInfantry: 'Infantry cannot perform DFA',
  AttackerNotMek: 'Attacker must be a Mek',
  AttackerNotProne: 'Attacker must be prone',
  AttackerQuad: 'Quad BattleMechs cannot push',
  AttackerAirborne: 'Attacker is airborne',
  ArmsFlipped: 'Rear-flipped arms cannot push',
  TargetNotMek: 'Target must be a Mek',
  TargetNotInfantry: 'Target must be infantry',
  TargetInfantryOrProtoMek: 'Cannot charge Infantry or ProtoMech targets',
  LimbMissing: 'Limb is missing',
  NoArmsQuirk: 'No Arms quirk prevents this attack',
  LowArmsQuirk: 'Low Arms has no source-backed combat restriction',
  AttackerProne: 'Attacker is prone',
  AttackerHullDown: 'Attacker is hull-down',
  AttackerCannotUsePhysical: 'This unit cannot make physical attacks',
  AttackerCannotCharge: 'This unit cannot charge',
  TargetProne: 'Target is prone',
  TargetMovementIncomplete: 'Charge target has not completed movement',
  TargetDropShip: 'DFA cannot target DropShips',
  ElevationMismatch: 'Target must be at the same elevation',
  TargetMissing: 'Target no longer exists',
  TargetDestroyed: 'Target is destroyed',
  TargetRetreated: 'Target has retreated',
  TargetEjected: 'Target has ejected',
  DifferentBoard: 'Target is on another board',
  TargetPassenger: 'Target is being transported',
  TargetSwarming: 'Target is swarming another unit',
  TargetMakingDFA: 'Target is making a DFA attack',
  TargetMakingDisplacementAttack: 'Target is making a displacement attack',
  TargetOfDisplacementAttack: 'Target is already being displaced',
  TargetPushingAnotherMek: 'Target is pushing another unit',
  AttackerTargetOfDisplacementAttack: 'Attacker is already being displaced',
  TargetAirborne: 'Target is airborne',
  TargetInsideBuilding: 'Target is inside another building',
  InvalidPhysicalTarget: 'Target cannot be attacked physically',
  TargetBuilding: 'Cannot push buildings or fuel tanks',
  SelfTarget: 'Cannot target self',
  FriendlyTarget: 'Cannot target friendly unit',
  TargetNotAdjacent: 'Target must be adjacent',
  TargetNotInPhysicalRange: 'Target must be adjacent',
  TargetElevationNotInRange: 'Target elevation is not in range',
  TargetNotSameHex: 'Target must be in the same hex',
  TargetNotDirectlyAhead: 'Push target must be directly ahead',
  TargetNotDirectlyBehindFeet:
    'Prone jump jet attack target must be directly behind',
  TargetNotInFrontArc: 'Target must be in the front arc',
  InvalidBrushOffTarget: 'Brush-off requires swarming infantry or an iNARC pod',
  TerrainNotClearOrPavement: 'Thrash requires clear or pavement terrain',
  TacOpsTripDisabled: 'TacOps Trip Attack option is disabled',
  TacOpsJumpJetAttackDisabled: 'TacOps Jump Jet Attack option is disabled',
  TacOpsGrapplingDisabled: 'TacOps Grappling option is disabled',
  CommonImpossible: 'Common physical attack state blocks this attack',
  ChainWhipGrappled: 'Chain-whip grapple must use chain-whip release rules',
  InvalidLegSelection: 'Jump jet attack must select a leg',
  BothLegsRequiresProne: 'Both-leg jump jet attacks require a prone attacker',
  JumpJetsMissingOrDestroyed: 'Selected leg has no ready jump jets',
  AttackerJumpedThisTurn: 'Attacker already jumped this turn',
  LegWeaponFiredThisTurn: 'Selected leg fired a weapon this turn',
  LandAirMekNotMekMode: 'LAM must be in Mek mode',
  AttackerAlreadyGrappled: 'Attacker is already grappled',
  AlreadyGrappled: 'Unit is already grappled',
  AttackerNotBipedMekOrProtoMek: 'Attacker must be a biped Mek or ProtoMek',
  AttackerNotMekOrProtoMek: 'Attacker must be a Mek or ProtoMek',
  TargetNotMekOrProtoMek: 'Target must be a Mek or ProtoMek',
  NotGrappledToTarget: 'Target is not the grappled unit',
  TripLimbUnavailable: 'No usable trip limb',
  ThrashLimbUnavailable: 'No working arm or leg available',
  UnsupportedAttackType: 'Attack type is unsupported',
  PhysicalAttackLimitReached: 'Physical attack allowance used this turn',
  RetractableBladeNotExtended: 'Retractable blade is not extended',
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
