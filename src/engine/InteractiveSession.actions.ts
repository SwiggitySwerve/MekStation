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
import type {
  IIndirectFireResolution,
  IWeaponAttack,
  WeaponFireMode,
} from '@/types/gameplay/CombatInterfaces';
import type { IAttackInvalidPayload } from '@/types/gameplay/GameSessionAttackEvents';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IMovementInvalidPayload,
  StandUpMode,
} from '@/types/gameplay/GameSessionMovementEvents';
import type { DiceRoller } from '@/utils/gameplay/diceTypes';

import {
  calculateSwarmDamage,
  type IBASwarmFireSquadDef,
} from '@/lib/combat/baCombat';
import { GameEventType } from '@/types/gameplay';
import {
  Facing,
  MovementType,
  RangeBracket,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import { determineArc } from '@/utils/gameplay/firingArcs';
import {
  createAttackInvalidEvent,
  createMovementInvalidEvent,
} from '@/utils/gameplay/gameEvents';
import { createSwarmDamageEvent } from '@/utils/gameplay/gameEvents/battleArmor';
import {
  declareAttack,
  declareMovement,
  lockAttack,
  lockMovement,
  attemptStandUp,
} from '@/utils/gameplay/gameSession';
import { appendEvent } from '@/utils/gameplay/gameSession';
import { coordToKey, hexDistance } from '@/utils/gameplay/hexMath';
import {
  calculateLOS,
  formatLOSBlockedDetails,
} from '@/utils/gameplay/lineOfSight';
import {
  calculateMovementHeat,
  gridWithUnitOccupants,
  getStandingCost,
  validateCommittedMovement,
} from '@/utils/gameplay/movement';
import { getWeaponRangeBracket } from '@/utils/gameplay/range';
import {
  gameUnitUsesMekHorizontalCover,
  gameUnitUsesMekWaterCover,
  getTargetCoverInfo,
} from '@/utils/gameplay/terrainCover';
import { calculateTargetTerrainModifierFromHex } from '@/utils/gameplay/toHit';
import {
  representedWaterAttackInvalidState,
  weaponPassesRepresentedWaterAttackRules,
} from '@/utils/gameplay/underwaterAttacks';
import { canPlayerSeeUnit } from '@/utils/gameplay/visibility';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';
import { weaponMountCoversTargetArc } from '@/utils/gameplay/weaponMountArcs';

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
  /** Optional authoritative roller for stand-up PSR resolution. */
  readonly diceRoller?: DiceRoller;
  /** Normal GET_UP or TacOps CAREFUL_STAND for prone stand-up attempts. */
  readonly standUpMode?: StandUpMode;
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

  const from = unit.position;
  const gridWithOccupants = gridWithUnitOccupants(
    input.grid,
    input.session.currentState.units,
  );
  const movementCapability = input.movementByUnit.get(input.unitId);
  const validation = validateCommittedMovement({
    grid: gridWithOccupants,
    unit,
    to: input.to,
    facing: input.facing,
    movementType: input.movementType,
    capability: movementCapability,
    path: input.path,
    standUpMode: input.standUpMode,
    optionalRules: input.session.config.optionalRules,
  });

  if (!validation.valid) {
    return appendInteractiveMovementInvalid(
      input.session,
      input.unitId,
      from,
      input.to,
      input.facing,
      input.movementType,
      validation.reason,
      validation.details,
      validation.mpCost,
      validation.heatGenerated,
    );
  }

  const standUpAttempt =
    unit.prone === true &&
    movementCapability !== undefined &&
    input.movementType !== MovementType.Jump &&
    input.movementType !== MovementType.Stationary;

  let session = input.session;
  let standUpSucceeded: boolean | undefined;
  const standUpMode = input.standUpMode ?? 'normal';
  if (standUpAttempt) {
    const beforeStandEventCount = session.events.length;
    session = attemptStandUp(
      session,
      input.unitId,
      input.diceRoller,
      standUpMode,
      movementCapability,
    );
    standUpSucceeded = session.events
      .slice(beforeStandEventCount)
      .some((event) => event.type === GameEventType.UnitStood);

    if (!standUpSucceeded) {
      session = declareMovement(
        session,
        input.unitId,
        from,
        from,
        unit.facing,
        input.movementType,
        getStandingCost(movementCapability, standUpMode),
        calculateMovementHeat(
          MovementType.Walk,
          0,
          movementCapability.movementMode,
          movementCapability.movementHeatProfile,
        ),
        [from],
        {
          standUpAttempt: true,
          standUpSucceeded: false,
          standUpMode,
        },
      );
      session = lockMovement(session, input.unitId);
      return session;
    }
  }

  session = declareMovement(
    session,
    input.unitId,
    from,
    input.to,
    input.facing,
    input.movementType,
    validation.mpCost,
    validation.heatGenerated,
    validation.path,
    {
      standUpAttempt,
      standUpSucceeded,
      standUpMode,
    },
  );
  session = lockMovement(session, input.unitId);
  return session;
}

function appendInteractiveMovementInvalid(
  session: IGameSession,
  unitId: string,
  from: IHexCoordinate,
  to: IHexCoordinate,
  facing: Facing,
  movementType: MovementType,
  reason: IMovementInvalidPayload['reason'],
  details?: string,
  mpCost?: number,
  heatGenerated?: number,
): IGameSession {
  return appendEvent(
    session,
    createMovementInvalidEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      unitId,
      from,
      to,
      facing,
      movementType,
      reason,
      details,
      mpCost,
      heatGenerated,
    ),
  );
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
  /** Optional requested per-weapon fire modes; invalid Indirect modes resolve to Direct. */
  readonly weaponModesByWeaponId?: Readonly<Record<string, WeaponFireMode>>;
  /** Wave 8 PR-K5: optional grid for indirect-fire LOS + spotter election. */
  readonly grid?: IHexGrid;
  /** Optional unit-id to canonical pilot SPA ids map for indirect-fire SPAs. */
  readonly pilotSpasByUnitId?: Readonly<Record<string, readonly string[]>>;
  /**
   * Wave 8 PR-K5: optional override of the target hex carried on the
   * indirect-fire event payloads. Defaults to the target unit's live
   * position when omitted.
   */
  readonly targetHex?: IHexCoordinate;
}

const ATTACK_RANGE_BRACKET_RANK: Readonly<Record<RangeBracket, number>> = {
  [RangeBracket.Short]: 0,
  [RangeBracket.Medium]: 1,
  [RangeBracket.Long]: 2,
  [RangeBracket.Extreme]: 3,
  [RangeBracket.OutOfRange]: 4,
};

function bestAttackRangeBracket(
  range: number,
  weaponAttacks: readonly IWeaponAttack[],
): RangeBracket {
  if (weaponAttacks.length === 0) return RangeBracket.Short;

  return weaponAttacks.reduce<RangeBracket>((best, weapon) => {
    const bracket = getWeaponRangeBracket(range, {
      short: weapon.shortRange,
      medium: weapon.mediumRange,
      long: weapon.longRange,
      extreme: weapon.extremeRange,
      minimum: weapon.minRange,
    });
    return ATTACK_RANGE_BRACKET_RANK[bracket] < ATTACK_RANGE_BRACKET_RANK[best]
      ? bracket
      : best;
  }, RangeBracket.OutOfRange);
}

function weaponCoversTargetArc(
  weapon: IWeaponAttack,
  targetArc: ReturnType<typeof determineArc>['arc'],
): boolean {
  return weaponMountCoversTargetArc(weapon, targetArc);
}

function indirectInterveningTerrainEffects({
  session,
  grid,
  targetHex,
  indirectFireResolution,
}: {
  readonly session: IGameSession;
  readonly grid: IHexGrid;
  readonly targetHex: IHexCoordinate;
  readonly indirectFireResolution?: IIndirectFireResolution;
}): ReturnType<typeof calculateLOS>['interveningTerrainEffects'] {
  if (
    indirectFireResolution?.permitted !== true ||
    indirectFireResolution.isIndirect !== true ||
    !indirectFireResolution.spotterId
  ) {
    return [];
  }

  const spotter = session.currentState.units[indirectFireResolution.spotterId];
  if (!spotter) return [];
  return calculateLOS(spotter.position, targetHex, grid)
    .interveningTerrainEffects;
}

function appendInteractiveAttackInvalid(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  reason: IAttackInvalidPayload['reason'],
  details: string,
  weaponId?: string,
): IGameSession {
  return appendEvent(
    session,
    createAttackInvalidEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      attackerId,
      targetId,
      reason,
      weaponId,
      details,
    ),
  );
}

function attackVisibilityBlockedReason(
  input: IApplyAttackInput,
  attackerUnit: IGameSession['currentState']['units'][string],
  targetUnit: IGameSession['currentState']['units'][string],
): string | undefined {
  if (input.session.config.fogOfWar !== true) return undefined;
  if (targetUnit.side === attackerUnit.side) return undefined;
  if (!input.grid) {
    return 'Target visibility cannot be verified without the battle map grid';
  }

  const attackerPlayerId =
    input.session.sideOwners?.[attackerUnit.side] ?? attackerUnit.side;
  const visibilityState = {
    ...input.session.currentState,
    sideOwners: input.session.sideOwners ?? null,
    grid: input.grid,
  };

  if (canPlayerSeeUnit(attackerPlayerId, input.targetId, visibilityState)) {
    return undefined;
  }

  return `Target ${input.targetId} is not currently visible to ${attackerUnit.side}`;
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
    input.weaponModesByWeaponId,
  );
  const attackerUnit = input.session.currentState.units[input.attackerId];
  const targetUnit = input.session.currentState.units[input.targetId];
  if (!attackerUnit) return input.session;
  if (!targetUnit || targetUnit.destroyed) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'InvalidTarget',
      `Target ${input.targetId} is not a live unit`,
      input.weaponIds[0],
    );
  }
  if (weaponAttacks.length === 0) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'InvalidTarget',
      'No valid weapons selected for this attack',
      input.weaponIds[0],
    );
  }
  const visibilityBlockedReason = attackVisibilityBlockedReason(
    input,
    attackerUnit,
    targetUnit,
  );
  if (visibilityBlockedReason) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'TargetNotVisible',
      visibilityBlockedReason,
      input.weaponIds[0],
    );
  }

  const resolvedTargetHex = input.targetHex ?? targetUnit.position;
  const attackRange = hexDistance(attackerUnit.position, resolvedTargetHex);
  if (attackRange === 0) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'SameHex',
      'Attacker and target occupy the same hex',
      input.weaponIds[0],
    );
  }

  const targetArc = determineArc(
    {
      unitId: input.attackerId,
      coord: attackerUnit.position,
      facing: attackerUnit.facing,
      prone: false,
    },
    resolvedTargetHex,
  ).arc;
  const weaponsInRange = weaponAttacks.filter(
    (weapon) =>
      getWeaponRangeBracket(attackRange, {
        short: weapon.shortRange,
        medium: weapon.mediumRange,
        long: weapon.longRange,
        extreme: weapon.extremeRange,
        minimum: weapon.minRange,
      }) !== RangeBracket.OutOfRange,
  );
  const weaponsInArc = weaponAttacks.filter((weapon) =>
    weaponCoversTargetArc(weapon, targetArc),
  );
  const rangeAndArcWeaponAttacks = weaponsInRange.filter((weapon) =>
    weaponCoversTargetArc(weapon, targetArc),
  );
  const waterAttackInvalidState =
    input.grid && resolvedTargetHex
      ? representedWaterAttackInvalidState({
          grid: input.grid,
          attackerPosition: attackerUnit.position,
          targetPosition: resolvedTargetHex,
          weapons: rangeAndArcWeaponAttacks,
        })
      : undefined;
  const usableWeaponAttacks = rangeAndArcWeaponAttacks.filter((weapon) =>
    input.grid && resolvedTargetHex
      ? weaponPassesRepresentedWaterAttackRules({
          grid: input.grid,
          attackerPosition: attackerUnit.position,
          targetPosition: resolvedTargetHex,
          weapon,
        })
      : true,
  );
  // Wave 8 PR-K5: pre-compute indirect-fire resolution when grid available.
  let indirectFireResolution: IIndirectFireResolution | undefined;
  if (input.grid && usableWeaponAttacks.length > 0) {
    if (resolvedTargetHex && targetUnit) {
      for (const weaponId of usableWeaponAttacks.map(
        (weapon) => weapon.weaponId,
      )) {
        const result = computeIndirectFireContext(
          input.attackerId,
          weaponId,
          resolvedTargetHex,
          input.session.currentState,
          input.grid,
          input.pilotSpasByUnitId,
          input.targetId,
        );
        if (result.permitted && result.isIndirect) {
          indirectFireResolution = result;
          break;
        }
      }
    }
  }
  if (weaponsInRange.length === 0) {
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'OutOfRange',
      `Target at ${attackRange} hexes is outside the selected weapons' range`,
      input.weaponIds[0],
    );
  }
  if (weaponsInArc.length === 0 || usableWeaponAttacks.length === 0) {
    if (waterAttackInvalidState) {
      return appendInteractiveAttackInvalid(
        input.session,
        input.attackerId,
        input.targetId,
        waterAttackInvalidState.reason,
        waterAttackInvalidState.details,
        input.weaponIds[0],
      );
    }
    return appendInteractiveAttackInvalid(
      input.session,
      input.attackerId,
      input.targetId,
      'OutOfArc',
      `No selected weapons can fire into the ${targetArc} arc`,
      input.weaponIds[0],
    );
  }

  const attackRangeBracket = bestAttackRangeBracket(
    attackRange,
    usableWeaponAttacks,
  );

  let directLos: ReturnType<typeof calculateLOS> | undefined;
  if (input.grid && resolvedTargetHex) {
    directLos = calculateLOS(
      attackerUnit.position,
      resolvedTargetHex,
      input.grid,
    );
    const indirectAllowed =
      indirectFireResolution?.permitted === true &&
      indirectFireResolution.isIndirect;
    if (!directLos.hasLOS && !indirectAllowed) {
      return appendInteractiveAttackInvalid(
        input.session,
        input.attackerId,
        input.targetId,
        'NoLineOfSight',
        formatLOSBlockedDetails(directLos),
        input.weaponIds[0],
      );
    }
  }

  const targetPartialCover =
    input.grid && resolvedTargetHex
      ? getTargetCoverInfo(
          input.grid,
          attackerUnit.position,
          resolvedTargetHex,
          {
            horizontalCoverEligible: gameUnitUsesMekHorizontalCover(
              input.session.units.find((unit) => unit.id === input.targetId),
            ),
            targetHexWaterCoverEligible: gameUnitUsesMekWaterCover(
              input.session.units.find((unit) => unit.id === input.targetId),
            ),
          },
        ).partialCover
      : false;
  const targetTerrainModifier =
    input.grid && resolvedTargetHex
      ? calculateTargetTerrainModifierFromHex(
          input.grid.hexes.get(coordToKey(resolvedTargetHex)),
        )
      : null;

  let session = declareAttack(
    input.session,
    input.attackerId,
    input.targetId,
    usableWeaponAttacks,
    attackRange,
    attackRangeBracket,
    indirectFireResolution,
    resolvedTargetHex,
    targetPartialCover,
    directLos?.hasLOS
      ? directLos.interveningTerrainEffects
      : input.grid
        ? indirectInterveningTerrainEffects({
            session: input.session,
            grid: input.grid,
            targetHex: resolvedTargetHex,
            indirectFireResolution,
          })
        : [],
    targetTerrainModifier,
  );
  session = lockAttack(session, input.attackerId);
  return session;
}

// =============================================================================
// PR-L2 §3 — Swarm-fire-while-attached action handler
// =============================================================================

/**
 * Inputs for `applyInteractiveSessionSwarmFire` — fires a BA squad's non-missile
 * non-body-mounted weapons at the host mek it is currently swarm-attached to,
 * auto-hitting (no to-hit roll) per TacticalOperations swarm-fire rules.
 *
 * The caller is responsible for:
 *   1. Confirming the swarm is in fact attached (the action does not re-validate).
 *   2. Building `squadDef.weapons` filtered down to swarm-eligible weapons
 *      (non-missile, non-body-mounted, non-InfantryAttack).  The dispatch
 *      layer that does this filtering lives in PR-L3; this action handler
 *      trusts its caller's filter.
 *   3. Computing `hostLocation` per the mounted-trooper-adapter mapping
 *      established by PR-L §5.1 (RT-front->1, LT-front->2, RT-rear->3,
 *      LT-rear->4, CT-front->6, CT-rear->5).  The action does not pick a
 *      location; it just stamps whatever the caller chose into the event.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Swarm Fire While Attached)
 */
export interface IApplySwarmFireInput {
  readonly session: IGameSession;
  /** Attacker (BA squad) unit id. */
  readonly squadId: string;
  /** Host (mek) unit id being swarmed. */
  readonly hostUnitId: string;
  /** Squad combat state (new IBASquadCombatState shape). */
  readonly squad: import('@/types/gameplay').IBASquadCombatState;
  /** Pre-filtered swarm-eligible weapons + vibroclaw / myomer flags. */
  readonly squadDef: IBASwarmFireSquadDef;
  /**
   * Host location label to stamp on the SwarmDamage event.  Caller picks
   * this via the PR-L mounted-trooper adapter — front-trooper slots resolve
   * to front locations; rear-trooper slots to rear locations.
   */
  readonly hostLocationLabel: string;
}

/**
 * Resolve one tick of swarm fire from `squadId` against `hostUnitId`.
 *
 * Computes damage via `calculateSwarmDamage` and appends a single
 * `SwarmDamage` event (using the established `createSwarmDamageEvent`
 * factory from the prior `add-battlearmor-combat-behavior` change — its
 * `unitId / targetUnitId / damage / locationLabel` shape exactly matches
 * what this action needs).
 *
 * Returns the original session unchanged when:
 *   - the attacking squad is destroyed (0 active troopers; damage = 0),
 *   - OR the host or squad units cannot be found in `session.currentState`.
 *
 * Otherwise returns the session with one new `SwarmDamage` event appended.
 * The action handler is intentionally side-effect-free beyond appending
 * the event; damage application to the host mek's armor pipeline lives
 * downstream (PR-L3 wires the dispatch layer that consumes this event).
 */
export function applyInteractiveSessionSwarmFire(
  input: IApplySwarmFireInput,
): IGameSession {
  const attackerUnit = input.session.currentState.units[input.squadId];
  const hostUnit = input.session.currentState.units[input.hostUnitId];
  if (!attackerUnit || !hostUnit) return input.session;

  const damage = calculateSwarmDamage(input.squad, input.squadDef);
  if (damage <= 0) return input.session;

  const sequence = input.session.events.length;
  const { turn, phase } = input.session.currentState;
  const event = createSwarmDamageEvent(
    input.session.id,
    sequence,
    turn,
    phase,
    input.squadId,
    input.hostUnitId,
    damage,
    input.hostLocationLabel,
  );

  return appendEvent(input.session, event);
}
