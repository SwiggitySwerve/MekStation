import { type IINarcPodState } from '@/types/gameplay';
import { CombatLocation } from '@/types/gameplay';

export const CORE_PHYSICAL_ATTACK_TYPES = [
  'punch',
  'kick',
  'charge',
  'dfa',
  'push',
  'trip',
  'thrash',
  'jump-jet-attack',
  'brush-off',
  'grapple',
  'break-grapple',
] as const;

export const SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES = [
  'hatchet',
  'sword',
  'mace',
  'lance',
  'retractable-blade',
  'flail',
  'wrecking-ball',
] as const;

export const SUPPORTED_PHYSICAL_ATTACK_TYPES = [
  ...CORE_PHYSICAL_ATTACK_TYPES,
  ...SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
] as const;

export type PhysicalAttackType =
  (typeof SUPPORTED_PHYSICAL_ATTACK_TYPES)[number];

const ZWEIHANDER_PHYSICAL_ATTACK_TYPE_SET = new Set<string>([
  'punch',
  ...SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
]);

export function isZweihanderPhysicalAttackType(
  value: PhysicalAttackType | null | undefined,
): value is 'punch' | (typeof SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES)[number] {
  return (
    value !== null &&
    value !== undefined &&
    ZWEIHANDER_PHYSICAL_ATTACK_TYPE_SET.has(value)
  );
}

export type PhysicalHitTable = 'punch' | 'kick';

export type PhysicalTargetObjectType =
  | 'entity'
  | 'building'
  | 'fuelTank'
  | 'gunEmplacement'
  | 'buildingIgnite'
  | 'hexClear'
  | 'hexIgnite';

export function isSupportedPhysicalAttackType(
  value: unknown,
): value is PhysicalAttackType {
  return (
    typeof value === 'string' &&
    (SUPPORTED_PHYSICAL_ATTACK_TYPES as readonly string[]).includes(value)
  );
}

export function physicalTargetObjectTypeForUnitType(
  unitType: string | undefined,
): PhysicalTargetObjectType | undefined {
  const canonical = unitType?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return canonical === 'gunemplacement' ? 'gunEmplacement' : undefined;
}

export function isPhysicalAirborneVtolOrWigeTarget(
  unitType: string | undefined,
  motionType: string | undefined,
  isAirborne: boolean | undefined,
): boolean {
  if (!isAirborne) return false;

  const canonical = unitType?.toLowerCase().replace(/[^a-z0-9]/g, '');
  const canonicalMotion = motionType?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    canonical === 'vtol' ||
    canonical === 'wige' ||
    canonicalMotion === 'vtol' ||
    canonicalMotion === 'wige'
  );
}

/**
 * Per `implement-physical-attack-phase` task 2.1: canonical declaration
 * shape emitted by players (human UI + bot). `limb` is required for
 * `punch` and `kick` (which arm / leg) and may be supplied for club
 * attacks. Other attack types ignore `limb`.
 *
 * @spec openspec/changes/implement-physical-attack-phase/tasks.md § 2
 */
export interface IPhysicalAttackDeclaration {
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: PhysicalAttackType;
  readonly limb?: PhysicalAttackLimb;
  readonly selectedINarcPod?: PhysicalAttackINarcPodSelection;
}

/**
 * Per `implement-physical-attack-phase` task 2.3: `limb` is required
 * for `punch` and `kick`. We model it as arm-only / leg-only /
 * either to keep the restriction validator narrow.
 */
export type PhysicalAttackLimb =
  | 'leftArm'
  | 'rightArm'
  | 'leftLeg'
  | 'rightLeg';

export type PhysicalAttackINarcPodSelection = Pick<
  IINarcPodState,
  'teamId' | 'podType'
> &
  Partial<Pick<IINarcPodState, 'location'>>;

/**
 * Per `implement-physical-attack-phase` task 3.8: enumerated rejection
 * reasons returned by the restriction validator. Upstream consumers
 * (UI, replay) can switch on these without parsing free-form strings.
 */
export type PhysicalAttackInvalidReason =
  | 'WeaponFiredThisTurn'
  | 'MissingActuator'
  | 'HipDestroyed'
  | 'ShoulderDestroyed'
  | 'SameLimbUsedThisTurn'
  | 'InvalidArmSelection'
  | 'AttackerEvading'
  | 'AttackerCargoInteraction'
  | 'AttackerStuck'
  | 'NoJumpThisTurn'
  | 'MechanicalJumpBooster'
  | 'ChargeJumpMovement'
  | 'NoRunThisTurn'
  | 'ChargeBackwardMovement'
  | 'AttackerInfantry'
  | 'AttackerNotMek'
  | 'AttackerNotProne'
  | 'AttackerQuad'
  | 'AttackerAirborne'
  | 'ArmsFlipped'
  | 'TargetNotMek'
  | 'TargetNotInfantry'
  | 'TargetInfantryOrProtoMek'
  | 'LimbMissing'
  | 'NoArmsQuirk'
  | 'LowArmsQuirk'
  | 'AttackerProne'
  | 'AttackerHullDown'
  | 'AttackerCannotUsePhysical'
  | 'AttackerCannotCharge'
  | 'TargetProne'
  | 'TargetMovementIncomplete'
  | 'TargetDropShip'
  | 'ElevationMismatch'
  | 'TargetMissing'
  | 'TargetDestroyed'
  | 'TargetRetreated'
  | 'TargetEjected'
  | 'DifferentBoard'
  | 'TargetPassenger'
  | 'TargetSwarming'
  | 'TargetMakingDFA'
  | 'TargetMakingDisplacementAttack'
  | 'TargetOfDisplacementAttack'
  | 'TargetPushingAnotherMek'
  | 'AttackerTargetOfDisplacementAttack'
  | 'TargetAirborne'
  | 'TargetInsideBuilding'
  | 'InvalidPhysicalTarget'
  | 'TargetBuilding'
  | 'SelfTarget'
  | 'FriendlyTarget'
  | 'TargetNotAdjacent'
  | 'TargetNotInPhysicalRange'
  | 'TargetElevationNotInRange'
  | 'TargetNotSameHex'
  | 'TargetNotDirectlyAhead'
  | 'TargetNotDirectlyBehindFeet'
  | 'TargetNotInFrontArc'
  | 'InvalidBrushOffTarget'
  | 'TerrainNotClearOrPavement'
  | 'TacOpsTripDisabled'
  | 'TacOpsJumpJetAttackDisabled'
  | 'TacOpsGrapplingDisabled'
  | 'CommonImpossible'
  | 'ChainWhipGrappled'
  | 'InvalidLegSelection'
  | 'BothLegsRequiresProne'
  | 'JumpJetsMissingOrDestroyed'
  | 'AttackerJumpedThisTurn'
  | 'LegWeaponFiredThisTurn'
  | 'LandAirMekNotMekMode'
  | 'AttackerAlreadyGrappled'
  | 'AlreadyGrappled'
  | 'AttackerNotBipedMekOrProtoMek'
  | 'AttackerNotMekOrProtoMek'
  | 'TargetNotMekOrProtoMek'
  | 'NotGrappledToTarget'
  | 'TripLimbUnavailable'
  | 'ThrashLimbUnavailable'
  | 'UnsupportedAttackType'
  | 'PhysicalAttackLimitReached'
  | 'RetractableBladeNotExtended'
  | 'RequiredSpaMissing'
  | 'DestinationBlocked';

export interface IPhysicalAttackElevationContext {
  readonly attackerBaseElevation: number;
  readonly attackerArmElevation: number;
  readonly targetBaseElevation: number;
  readonly targetTopElevation: number;
  readonly targetIsAirborneVTOLOrWiGE?: boolean;
}

export interface IPhysicalAttackTerrainContext {
  readonly attackerInBuilding: boolean;
  readonly targetInBuilding: boolean;
  readonly attackerBuildingId?: string;
  readonly targetBuildingId?: string;
}

export interface IPhysicalToHitResult {
  readonly baseToHit: number;
  readonly finalToHit: number;
  readonly modifiers: readonly IPhysicalModifier[];
  readonly allowed: boolean;
  readonly restrictionReason?: string;
  /**
   * Per `implement-physical-attack-phase` task 3.8: typed rejection
   * reason matching the `IPhysicalAttackRestriction.reasonCode`.
   */
  readonly restrictionReasonCode?: PhysicalAttackInvalidReason;
  readonly automaticHit?: boolean;
  readonly automaticHitReason?: string;
}

export interface IPhysicalModifier {
  readonly name: string;
  readonly value: number;
  readonly source: string;
}

export interface IPhysicalDamageResult {
  readonly targetDamage: number;
  readonly attackerDamage: number;
  readonly attackerLegDamagePerLeg: number;
  readonly targetPSR: boolean;
  readonly attackerPSR: boolean;
  readonly attackerPSRModifier: number;
  readonly hitTable: PhysicalHitTable;
  readonly targetDisplaced: boolean;
}

export interface IPhysicalAttackResult {
  readonly attackType: PhysicalAttackType;
  readonly toHitNumber: number;
  readonly roll: number;
  readonly hit: boolean;
  readonly targetDamage: number;
  readonly attackerDamage: number;
  readonly attackerLegDamagePerLeg: number;
  readonly targetPSR: boolean;
  readonly attackerPSR: boolean;
  readonly attackerPSRModifier: number;
  readonly hitLocation?: CombatLocation;
  readonly restrictionReasonCode?: PhysicalAttackInvalidReason;
  readonly targetDisplaced: boolean;
  readonly automaticHit?: boolean;
  readonly automaticHitReason?: string;
}

export interface IPhysicalAttackRestriction {
  allowed: boolean;
  reason?: string;
  /**
   * Per `implement-physical-attack-phase` task 3.8: typed rejection
   * reason. Optional for backward-compat — existing callers read the
   * free-form `reason`; new code should branch on `reasonCode`.
   */
  reasonCode?: PhysicalAttackInvalidReason;
}

export type { IPhysicalAttackInput } from './typesInput';
export type {
  IChooseBestPhysicalAttackOptions,
  IPhysicalAttackCandidate,
  IPhysicalAttackOption,
  IPhysicalAttackSelfRisk,
  IPhysicalAttackUnitStatePair,
} from './typesOptions';
