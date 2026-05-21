/**
 * Interactive Session — player-action collaborator.
 *
 * Extracted from `InteractiveSession` so the class stays a thin
 * state-machine coordinator. This module owns the declare-then-lock
 * logic for the two human-driven actions: declaring a unit's movement
 * and declaring a weapon attack.
 *
 * Each function is pure with respect to the session: it takes the
 * current `IGameSession` plus the cached lookup maps and returns the
 * next session. The coordinator keeps ownership of the trailing
 * `tryFinalizeAndPublish()` call so the once-per-session outcome guard
 * stays in one place. Behaviour is preserved exactly.
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';

import {
  Facing,
  MovementType,
  RangeBracket,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import {
  declareAttack,
  declareMovement,
  lockAttack,
  lockMovement,
} from '@/utils/gameplay/gameSession';
import {
  buildMovementEventPath,
  maxMovementCostForCapability,
} from '@/utils/gameplay/movement/eventPath';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import { computeIndirectFireContext } from './InteractiveSession.indirectFire';

/**
 * Inputs for `applyInteractiveSessionMovement` — the live session, the
 * grid the pathfinder uses, and the cached per-unit movement maps.
 */
export interface IApplyMovementInput {
  readonly session: IGameSession;
  readonly grid: IHexGrid;
  readonly movementByUnit: Map<string, IMovementCapability>;
  readonly unitId: string;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  /** Optional pre-computed path; built from the grid when omitted. */
  readonly path?: readonly IHexCoordinate[];
}

/**
 * Declare and lock a unit's movement for the current Movement phase.
 * Returns the unchanged session when the unit id is unknown (callers
 * treat a missing unit as a no-op). When no explicit path is given the
 * event path is rebuilt from the grid so movement costs stay in
 * lockstep with the pathfinder.
 */
export function applyInteractiveSessionMovement(
  input: IApplyMovementInput,
): IGameSession {
  const unit = input.session.currentState.units[input.unitId];
  if (!unit) return input.session;

  const capability = input.movementByUnit.get(input.unitId);
  const eventPath =
    input.path ??
    buildMovementEventPath({
      grid: input.grid,
      from: unit.position,
      to: input.to,
      movementType: input.movementType,
      maxCost: maxMovementCostForCapability(capability, input.movementType),
    });

  let session = declareMovement(
    input.session,
    input.unitId,
    unit.position,
    input.to,
    input.facing,
    input.movementType,
    0,
    input.movementType === MovementType.Jump ? 1 : 0,
    eventPath,
  );
  session = lockMovement(session, input.unitId);
  return session;
}

/**
 * Inputs for `applyInteractiveSessionAttack` — the live session and the
 * cached per-unit weapon map.
 *
 * Wave 8 PR-K5: `grid` and `targetHex` are OPTIONAL fields. When `grid`
 * is supplied, `applyInteractiveSessionAttack` pre-computes the
 * indirect-fire resolution per weapon and threads the first
 * `permitted && isIndirect` result into `declareAttack` (the engine path
 * established by PR-K + PR-K4). When omitted, the function behaves
 * identically to its pre-K5 contract — no resolution computed, no
 * indirect-fire events emitted.
 */
export interface IApplyAttackInput {
  readonly session: IGameSession;
  readonly weaponsByUnit: Map<string, readonly IWeapon[]>;
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponIds: readonly string[];
  /** Wave 8 PR-K5: optional grid for indirect-fire LOS + spotter election. */
  readonly grid?: IHexGrid;
  /**
   * Wave 8 PR-K5: optional override of the target hex carried on the
   * indirect-fire event payloads. Defaults to the target unit's live
   * position when omitted.
   */
  readonly targetHex?: IHexCoordinate;
}

/**
 * Declare and lock a weapon attack for the current WeaponAttack phase.
 * Firing arc is intentionally NOT pre-computed here — `resolveAttack`
 * derives it from live positions + target facing at resolve time.
 *
 * Wave 8 PR-K5: when `input.grid` is supplied, walks weapon ids and
 * picks the first weapon whose `computeIndirectFireContext` returns
 * `permitted && isIndirect` to thread into `declareAttack`. LRM volleys
 * share a single spotter election per declaration (matches MegaMek
 * `Compute.findSpottersForArtillery`).
 */
export function applyInteractiveSessionAttack(
  input: IApplyAttackInput,
): IGameSession {
  const unitWeapons = input.weaponsByUnit.get(input.attackerId) ?? [];
  const weaponAttacks: IWeaponAttack[] = buildWeaponAttacks(
    input.weaponIds,
    unitWeapons,
    input.attackerId,
  );

  // Wave 8 PR-K5: pre-compute indirect-fire resolution when grid available.
  let indirectFireResolution:
    | import('@/types/gameplay/CombatInterfaces').IIndirectFireResolution
    | undefined;
  let resolvedTargetHex = input.targetHex;
  if (input.grid) {
    const targetUnit = input.session.currentState.units[input.targetId];
    resolvedTargetHex = resolvedTargetHex ?? targetUnit?.position;
    if (resolvedTargetHex && targetUnit) {
      for (const weaponId of input.weaponIds) {
        const result = computeIndirectFireContext(
          input.attackerId,
          weaponId,
          resolvedTargetHex,
          input.session.currentState,
          input.grid,
        );
        if (result.permitted && result.isIndirect) {
          indirectFireResolution = result;
          break;
        }
      }
    }
  }

  let session = declareAttack(
    input.session,
    input.attackerId,
    input.targetId,
    weaponAttacks,
    3,
    RangeBracket.Short,
    indirectFireResolution,
    resolvedTargetHex,
  );
  session = lockAttack(session, input.attackerId);
  return session;
}
