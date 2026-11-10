/**
 * ProtoMech editor movement limits: what the walk and jump inputs accept.
 *
 * MegaMekLab 62bf193 limits a ProtoMech's spinners only by (MovementView.java:224-292,
 * 316-376; PMStructureTab.java:264-282,568-638):
 *   - the motive's minimum walk: biped 1, glider ceil(GLIDER_MIN_FLANK_MP / 1.5) = 3,
 *     quad floor(QUAD_MIN_RUN_MP / 1.5) = 2 (:267,270,272);
 *   - the engine: a walk whose rating is not a valid engine is refused
 *     (recalculateEngineRating, "exceeds the maximum");
 *   - jump: TestProtoMek.maxJumpMP (:233), and 0 for a glider, whose spinner is
 *     disabled (:265-268, :354). Lowering walk below jump snaps jump down (:370-371).
 * It has no weight-class cap, and nothing locks an ultraheavy's jump. These limits are
 * the editor's input rules; the verifier's validity rules are in `movementRules.ts`,
 * whose `protoMaxJumpMP` this reuses.
 *
 * Pure: no React, store or UI imports.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import {
  PROTO_MAX_ENGINE_RATING,
  computeProtoEngineRating,
  protoChassisCanJump,
} from './movementCaps';
import {
  PROTO_GLIDER_MIN_FLANK_MP,
  PROTO_QUAD_MIN_RUN_MP,
  protoMaxJumpMP,
  summarizeProtoJumpEquipment,
} from './movementRules';

/** MovementView.java:267,270,272. */
export function protoMinWalkMP(chassis: ProtoChassis): number {
  if (chassis === ProtoChassis.GLIDER) {
    return Math.ceil(PROTO_GLIDER_MIN_FLANK_MP / 1.5);
  }
  if (chassis === ProtoChassis.QUAD) {
    return Math.floor(PROTO_QUAD_MIN_RUN_MP / 1.5);
  }
  return 1;
}

/**
 * The largest walk whose engine rating is a valid engine (rating <= 500). The rating
 * never falls as walk rises, so the search stops at the first walk that is too fast.
 */
export function protoMaxWalkMP(tonnage: number, chassis: ProtoChassis): number {
  let walk = protoMinWalkMP(chassis);
  while (
    computeProtoEngineRating(tonnage, walk + 1, chassis) <=
    PROTO_MAX_ENGINE_RATING
  ) {
    walk++;
  }
  return walk;
}

/**
 * Why a tonnage edit must be refused, or undefined when it may go ahead. A tonnage edit
 * keeps the walk, and MML recalculates the engine for the new tonnage and refuses the
 * change when the rating exceeds the maximum (PMStructureTab.java:446-456,
 * recalculateEngineRating :264-276). It never rewrites the walk to make the edit fit.
 */
export function protoTonnageChangeError(
  tonnage: number,
  walk: number,
  chassis: ProtoChassis,
): string | undefined {
  const rating = computeProtoEngineRating(tonnage, walk, chassis);
  return rating > PROTO_MAX_ENGINE_RATING
    ? `A ${tonnage} t ProtoMech cannot keep walk ${walk}: its engine rating would be ${rating}, over the maximum of ${PROTO_MAX_ENGINE_RATING}.`
    : undefined;
}

/** The most jump MP the editor accepts: maxJumpMP, and 0 for a glider. */
export function protoJumpLimit(
  walk: number,
  chassis: ProtoChassis,
  equipment: readonly { readonly equipmentId: string }[],
): number {
  return protoChassisCanJump(chassis)
    ? protoMaxJumpMP(
        walk,
        summarizeProtoJumpEquipment(equipment).improvedJumpJets,
      )
    : 0;
}

export interface ProtoMovementInput {
  readonly walk: number;
  readonly jump: number;
  readonly tonnage: number;
  readonly chassis: ProtoChassis;
  readonly equipment: readonly { readonly equipmentId: string }[];
}

/**
 * Bring a walk and jump into the editor's limits: walk to the motive minimum and the
 * engine bound, then jump down to the limit for that walk (never up).
 */
export function clampProtoMovement(input: ProtoMovementInput): {
  walk: number;
  jump: number;
} {
  const walk = Math.max(
    protoMinWalkMP(input.chassis),
    Math.min(input.walk, protoMaxWalkMP(input.tonnage, input.chassis)),
  );
  const jump = Math.max(
    0,
    Math.min(input.jump, protoJumpLimit(walk, input.chassis, input.equipment)),
  );
  return { walk, jump };
}
