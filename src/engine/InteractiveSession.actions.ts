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
  calculateSwarmDamage,
  type IBALegAttackSquadDef,
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
import {
  createLegAttackResolvedEvent,
  createSwarmDamageEvent,
} from '@/utils/gameplay/gameEvents/battleArmor';
import {
  declareAttack,
  declareMovement,
  lockAttack,
  lockMovement,
} from '@/utils/gameplay/gameSession';
import { appendEvent } from '@/utils/gameplay/gameSession';
import {
  buildMovementEventPath,
  maxMovementCostForCapability,
} from '@/utils/gameplay/movement/eventPath';
import { validateMovement } from '@/utils/gameplay/movement/validation';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import { prepareAttackContext } from './attackContext';

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
  if (!capability) return input.session;

  const validation = validateMovement(
    input.grid,
    {
      unitId: input.unitId,
      coord: unit.position,
      facing: unit.facing,
      prone: unit.prone ?? false,
      isStuck: unit.isStuck ?? false,
    },
    input.to,
    input.facing,
    input.movementType,
    capability,
    unit.heat,
    undefined,
    { pilotAbilities: unit.abilities },
  );
  if (!validation.valid) {
    throw new Error(
      `Invalid movement for ${input.unitId}: ${validation.error ?? 'unknown'}`,
    );
  }

  const eventPath =
    input.movementType === MovementType.Jump && input.path
      ? input.path
      : buildMovementEventPath({
          grid: input.grid,
          from: unit.position,
          to: input.to,
          movementType: input.movementType,
          maxCost: Math.min(
            validation.mpCost,
            maxMovementCostForCapability(capability, input.movementType),
          ),
          movementContext: { pilotAbilities: unit.abilities },
        });

  let session = declareMovement(
    input.session,
    input.unitId,
    unit.position,
    input.to,
    input.facing,
    input.movementType,
    validation.mpCost,
    validation.heatGenerated,
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
  /** Optional called-shot intent keyed by weapon id. */
  readonly calledShots?: Readonly<Record<string, boolean>>;
  /** Optional teammate-assisted called-shot intent keyed by weapon id. */
  readonly teammateCalledShots?: Readonly<Record<string, boolean>>;
}

/**
 * Declare and lock a weapon attack for the current WeaponAttack phase.
 * Firing arc is intentionally NOT pre-computed here — `resolveAttack`
 * derives it from live positions + target facing at resolve time.
 *
 * Wave 8 PR-K5/K11: when `input.grid` is supplied, delegates to
 * `prepareAttackContext` to derive the indirect-fire pre-resolution
 * union (direct vs indirect+spotter), then threads it into
 * `declareAttack`. LRM volleys share a single spotter election per
 * declaration (matches MegaMek `Compute.findSpottersForArtillery`).
 */
export function applyInteractiveSessionAttack(
  input: IApplyAttackInput,
): IGameSession {
  const unitWeapons = input.weaponsByUnit.get(input.attackerId) ?? [];
  const weaponAttacks: IWeaponAttack[] = buildWeaponAttacks(
    input.weaponIds,
    unitWeapons,
    input.attackerId,
    {
      calledShots: input.calledShots,
      teammateCalledShots: input.teammateCalledShots,
    },
  );

  // Wave 8 PR-K11: extracted the inline indirect-fire pre-compute loop
  // into prepareAttackContext (src/engine/attackContext.ts). Pass the
  // returned union straight into declareAttack — the function accepts
  // either shape (back-compat preserved).
  let resolvedTargetHex = input.targetHex;
  let attackPreResolution:
    | import('./attackContext').IAttackPreResolution
    | undefined;
  if (input.grid) {
    const targetUnit = input.session.currentState.units[input.targetId];
    resolvedTargetHex = resolvedTargetHex ?? targetUnit?.position;
    if (resolvedTargetHex && targetUnit) {
      attackPreResolution = prepareAttackContext(
        input.attackerId,
        input.weaponIds,
        input.targetId,
        input.session.currentState,
        input.grid,
      );
    }
  }

  const eventCountBeforeDeclaration = input.session.events.length;
  let session = declareAttack(
    input.session,
    input.attackerId,
    input.targetId,
    weaponAttacks,
    3,
    RangeBracket.Short,
    attackPreResolution,
    resolvedTargetHex,
  );
  const declarationEmitted = session.events
    .slice(eventCountBeforeDeclaration)
    .some((event) => event.type === GameEventType.AttackDeclared);
  if (!declarationEmitted) return session;

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
// =============================================================================
// PR-L3 §3 — BA leg-attack action handler (Mek + Vehicle targets)
// =============================================================================

/**
 * Inputs for `applyInteractiveSessionLegAttack`. The action handler is
 * intentionally thin — it does NOT pick the rolled leg, does NOT compute
 * the firing arc, and does NOT apply damage to the target's armor. Those
 * concerns live in `resolveMekLegAttack` / `resolveVehicleLegAttack`
 * (in `src/utils/gameplay/battlearmor/legAttackResolver.ts`) and the
 * downstream damage pipeline that consumes the emitted
 * `LegAttackResolved` event.
 *
 * Callers (the dispatch layer) MUST:
 *   1. confirm the attack is legal (squad in same hex as target, etc.),
 *   2. build `squadDef` with the squad's vibroclaw / myomer flags,
 *   3. supply the pre-resolved `ILegAttackResolution` from the resolver
 *      (carries hit / damage / hitLocation / critModifier).
 *
 * Pattern mirror: `applyInteractiveSessionSwarmFire` (PR-L2 §3).
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Leg Attack)
 */
export interface IApplyLegAttackInput {
  readonly session: IGameSession;
  /** Attacker (BA squad) unit id. */
  readonly squadId: string;
  /** Target Mek or Vehicle unit id. */
  readonly targetUnitId: string;
  /**
   * Pre-resolved leg-attack outcome from `resolveMekLegAttack` /
   * `resolveVehicleLegAttack`. The action handler stamps these fields
   * onto the emitted `LegAttackResolved` event.
   */
  readonly resolution: import('@/utils/gameplay/battlearmor/legAttackResolver').ILegAttackResolution;
  /** Surviving troopers in the attacking squad after the resolution. */
  readonly survivingTroopers: number;
}

/**
 * Resolve one BA leg attack from `squadId` against `targetUnitId`.
 *
 * Appends a single `LegAttackResolved` event carrying the pre-resolved
 * outcome. Returns the original session unchanged when the attacking
 * squad or target unit cannot be found.
 *
 * The action handler is intentionally side-effect-free beyond appending
 * the event; damage application to the target's armor pipeline (Mek leg
 * armor or Vehicle arc armor) lives downstream in the dispatch layer
 * that consumes this event. The squad's attack action is considered
 * consumed in BOTH the hit and clean-miss cases.
 */
export function applyInteractiveSessionLegAttack(
  input: IApplyLegAttackInput,
): IGameSession {
  const attackerUnit = input.session.currentState.units[input.squadId];
  const targetUnit = input.session.currentState.units[input.targetUnitId];
  if (!attackerUnit || !targetUnit) return input.session;

  const sequence = input.session.events.length;
  const { turn, phase } = input.session.currentState;
  const event = createLegAttackResolvedEvent(
    input.session.id,
    sequence,
    turn,
    phase,
    input.squadId,
    input.targetUnitId,
    input.resolution.hit,
    input.resolution.damage,
    input.resolution.hitLocation,
    input.resolution.critModifier,
    input.survivingTroopers,
  );

  return appendEvent(input.session, event);
}

// Re-export the squad-def type so callers can build it without reaching
// into `@/lib/combat/baCombat` directly. Mirrors the IBASwarmFireSquadDef
// re-export pattern established by PR-L2.
export type { IBALegAttackSquadDef };
