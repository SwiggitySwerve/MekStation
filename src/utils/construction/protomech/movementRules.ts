/**
 * ProtoMech movement construction rules: the single owner.
 *
 * Pinned MegaMek 48fcb2f64 `TestProtoMek`:
 *   - maxJumpMP (TestProtoMek.java:84-92): the original walk MP, or 1.5 times it
 *     rounded up when the ProtoMech mounts an improved jump jet.
 *   - correctMovement (TestProtoMek.java:445-464): a glider's run must be at least
 *     GLIDER_MIN_FLANK_MP (4), else a quad's at least QUAD_MIN_RUN_MP (3); then jump MP
 *     and UMU count must each stay within maxJumpMP.
 *
 * Nothing else limits movement there: no weight-class walk or jump cap, no ban on an
 * ultraheavy jumping, and no glider weight rule. The weight-class tables that used to
 * stand in for these have no pinned counterpart and are not applied here.
 *
 * Pure: no React, store or UI imports. The messages are Java's, without the line end.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { computeRunMP } from './movementCaps';

/** TestProtoMek.GLIDER_MIN_FLANK_MP (TestProtoMek.java:75). */
export const PROTO_GLIDER_MIN_FLANK_MP = 4;
/** TestProtoMek.QUAD_MIN_RUN_MP (TestProtoMek.java:79). */
export const PROTO_QUAD_MIN_RUN_MP = 3;

/**
 * EquipmentTypeLookup.EXTENDED_JUMP_JET_SYSTEM. MiscType.createExtendedJumpJet
 * (MiscType.java:2054-2060) gives it S_IMPROVED, the flag maxJumpMP reads. The
 * equipment catalog has no entry or flag for it, so this is the one place that names
 * it; every other caller asks `isProtoExtendedJumpJet`.
 */
export const PROTO_EXTENDED_JUMP_JET_ID = 'ExtendedJumpJetSystem';
/** EquipmentTypeLookup.PROTOMEK_JUMP_JET, MiscType.createProtomekJumpJet. */
export const PROTO_JUMP_JET_ID = 'ProtoMechJumpJet';
/** EquipmentTypeLookup.PROTOMEK_UMU, MiscType.createProtomekUMU (MiscType.java:2079). */
export const PROTO_UMU_ID = 'ProtoMechUMU';

const squash = (id: string): string =>
  id.toLowerCase().replace(/[^a-z0-9]/g, '');

/** A BLK name or display name of the Extended Jump Jet System. */
export function isProtoExtendedJumpJet(equipmentId: string): boolean {
  return squash(equipmentId) === squash(PROTO_EXTENDED_JUMP_JET_ID);
}

/** A BLK name or display name of the standard ProtoMech jump jet. */
export function isProtoStandardJumpJet(equipmentId: string): boolean {
  return squash(equipmentId) === squash(PROTO_JUMP_JET_ID);
}

/** A BLK name of the ProtoMech UMU (display name "UMU" is not matched). */
export function isProtoUmu(equipmentId: string): boolean {
  return squash(equipmentId) === squash(PROTO_UMU_ID);
}

/** What the movement rules read from a loadout. */
export function summarizeProtoJumpEquipment(
  equipment: readonly { readonly equipmentId: string }[],
): { improvedJumpJets: boolean; umu: number } {
  return {
    improvedJumpJets: equipment.some((m) =>
      isProtoExtendedJumpJet(m.equipmentId),
    ),
    umu: equipment.filter((m) => isProtoUmu(m.equipmentId)).length,
  };
}

/** TestProtoMek.maxJumpMP (TestProtoMek.java:84-92). */
export function protoMaxJumpMP(
  walkMP: number,
  improvedJumpJets: boolean,
): number {
  return improvedJumpJets ? Math.ceil(walkMP * 1.5) : walkMP;
}

export interface ProtoMovementFacts {
  /** Original walk MP, before any Myomer Booster. */
  readonly walk: number;
  readonly jump: number;
  /** UMU mounts (Entity.getAllUMUCount). */
  readonly umu: number;
  readonly quad: boolean;
  readonly glider: boolean;
  /** An improved jump jet is mounted (S_IMPROVED). */
  readonly improvedJumpJets: boolean;
}

/** TestProtoMek.correctMovement (TestProtoMek.java:445-464), message for message. */
export function getProtoMovementErrors(facts: ProtoMovementFacts): string[] {
  const errors: string[] = [];
  const run = computeRunMP(facts.walk);
  if (facts.glider && run < PROTO_GLIDER_MIN_FLANK_MP) {
    errors.push(
      `Glider ProtoMeks have a minimum flanking MP of ${PROTO_GLIDER_MIN_FLANK_MP}.`,
    );
  } else if (facts.quad && run < PROTO_QUAD_MIN_RUN_MP) {
    errors.push(
      `Quad ProtoMeks have a minimum running MP of ${PROTO_QUAD_MIN_RUN_MP}.`,
    );
  }
  const maxJump = protoMaxJumpMP(facts.walk, facts.improvedJumpJets);
  if (facts.jump > maxJump) errors.push('Exceeds maximum jump MP.');
  if (facts.umu > maxJump) errors.push('Exceeds maximum UMU MP.');
  return errors;
}
