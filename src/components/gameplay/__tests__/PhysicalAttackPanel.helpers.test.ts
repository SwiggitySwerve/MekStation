/**
 * Regression guard for audit finding A-11
 * (docs/audits/2026-06-09-full-codebase-review.md): the reconciliation merge
 * 7f22e4f22 shrank REASON_COPY from an exhaustive
 * Record<PhysicalAttackInvalidReason, string> to a 24-entry Partial, so ~60
 * validator reason codes rendered blank in the physical-attack UI. The runtime
 * assertions here pin copy coverage for the full union; the compile-time half
 * of the guard is REASON_COPY's non-Partial Record annotation in
 * PhysicalAttackPanel.helpers.ts plus the Equals assertion below.
 */
import type { PhysicalAttackInvalidReason } from '@/utils/gameplay/physicalAttacks/types';

import { REASON_COPY } from '../PhysicalAttackPanel.helpers';

// Canonical runtime mirror of the PhysicalAttackInvalidReason union, in
// declaration order. `satisfies` rejects typos and stale entries (list is a
// subset of the union); the Equals assertion below rejects omissions (the
// union is a subset of the list), so the two stay in lockstep forever.
const ALL_REASON_CODES = [
  'WeaponFiredThisTurn',
  'MissingActuator',
  'HipDestroyed',
  'ShoulderDestroyed',
  'SameLimbUsedThisTurn',
  'InvalidArmSelection',
  'AttackerEvading',
  'AttackerCargoInteraction',
  'AttackerStuck',
  'NoJumpThisTurn',
  'MechanicalJumpBooster',
  'ChargeJumpMovement',
  'NoRunThisTurn',
  'ChargeBackwardMovement',
  'AttackerInfantry',
  'AttackerNotMek',
  'AttackerNotProne',
  'AttackerQuad',
  'AttackerAirborne',
  'ArmsFlipped',
  'TargetNotMek',
  'TargetNotInfantry',
  'TargetInfantryOrProtoMek',
  'LimbMissing',
  'NoArmsQuirk',
  'LowArmsQuirk',
  'AttackerProne',
  'AttackerHullDown',
  'AttackerCannotUsePhysical',
  'AttackerCannotCharge',
  'TargetProne',
  'TargetMovementIncomplete',
  'TargetDropShip',
  'ElevationMismatch',
  'TargetMissing',
  'TargetDestroyed',
  'TargetRetreated',
  'TargetEjected',
  'DifferentBoard',
  'TargetPassenger',
  'TargetSwarming',
  'TargetMakingDFA',
  'TargetMakingDisplacementAttack',
  'TargetOfDisplacementAttack',
  'TargetPushingAnotherMek',
  'AttackerTargetOfDisplacementAttack',
  'TargetAirborne',
  'TargetInsideBuilding',
  'InvalidPhysicalTarget',
  'TargetBuilding',
  'SelfTarget',
  'FriendlyTarget',
  'TargetNotAdjacent',
  'TargetNotInPhysicalRange',
  'TargetElevationNotInRange',
  'TargetNotSameHex',
  'TargetNotDirectlyAhead',
  'TargetNotDirectlyBehindFeet',
  'TargetNotInFrontArc',
  'InvalidBrushOffTarget',
  'TerrainNotClearOrPavement',
  'TacOpsTripDisabled',
  'TacOpsJumpJetAttackDisabled',
  'TacOpsGrapplingDisabled',
  'CommonImpossible',
  'ChainWhipGrappled',
  'InvalidLegSelection',
  'BothLegsRequiresProne',
  'JumpJetsMissingOrDestroyed',
  'AttackerJumpedThisTurn',
  'LegWeaponFiredThisTurn',
  'LandAirMekNotMekMode',
  'AttackerAlreadyGrappled',
  'AlreadyGrappled',
  'AttackerNotBipedMekOrProtoMek',
  'AttackerNotMekOrProtoMek',
  'TargetNotMekOrProtoMek',
  'NotGrappledToTarget',
  'TripLimbUnavailable',
  'ThrashLimbUnavailable',
  'UnsupportedAttackType',
  'PhysicalAttackLimitReached',
  'RetractableBladeNotExtended',
  'DestinationBlocked',
] as const satisfies readonly PhysicalAttackInvalidReason[];

// Compile-time exhaustiveness: if the validator union gains a code missing
// from ALL_REASON_CODES, Equals degenerates to `false` and the `true`
// initializer stops compiling — forcing this list (and via the non-Partial
// Record annotation, the copy table) to be updated in the same change.
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const LIST_MATCHES_UNION: Equals<
  (typeof ALL_REASON_CODES)[number],
  PhysicalAttackInvalidReason
> = true;

describe('PhysicalAttackPanel.helpers REASON_COPY', () => {
  it('mirrors the full PhysicalAttackInvalidReason union', () => {
    // The real check is the compile-time Equals type above; this keeps the
    // constant referenced so lint cannot flag it as unused.
    expect(LIST_MATCHES_UNION).toBe(true);
  });

  it('provides non-empty copy for every validator reason code', () => {
    // Audit A-11: the merge left ~60 codes without copy, so blocked physical
    // attacks rendered blank reasons in the panel, dock commands, and
    // command preview. Every union member must map to displayable text.
    const blankCodes = ALL_REASON_CODES.filter((code) => {
      const copy: string | undefined = REASON_COPY[code];
      return typeof copy !== 'string' || copy.trim().length === 0;
    });
    expect(blankCodes).toEqual([]);
  });

  it('contains no keys outside the validator union', () => {
    // Guards against stale copy rows lingering after a reason code is
    // removed from the validator union.
    const known = new Set<string>(ALL_REASON_CODES);
    const staleKeys = Object.keys(REASON_COPY).filter((key) => !known.has(key));
    expect(staleKeys).toEqual([]);
  });
});
