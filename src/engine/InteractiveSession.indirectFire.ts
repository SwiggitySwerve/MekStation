/**
 * Interactive Session — indirect-fire collaborator.
 *
 * Implements `computeIndirectFireContext`, the single integration point
 * between the engine and the `src/utils/gameplay/indirectFire.ts` helper.
 * Extracted as a collaborator so `InteractiveSession` stays a thin
 * state-machine coordinator (consistent with the actions / resolvers /
 * phases / ai split).
 *
 * The helper (`resolveIndirectFire`) remains pure and engine-independent —
 * it operates on synthetic `ISpotterCandidate[]` inputs as specified in
 * the engine-integration-contract requirement.
 *
 * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md
 */

import type { IGameState } from '@/types/gameplay/GameSessionInterfaces';
import type { IUnitGameState } from '@/types/gameplay/GameSessionStateTypes';
import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';
import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';

import {
  resolveIndirectFire,
  isIndirectFireCapable,
  type ISpotterCandidate,
} from '@/utils/gameplay/indirectFire';
import {
  calculateLOS,
  type ILOSCalculationOptions,
  type ILOSUnitOccupantState,
  lineOfSightOptionsFromOptionalRules,
} from '@/utils/gameplay/lineOfSight';

interface ILegacyIndirectMarkerState {
  readonly narcMarkedByTeams?: readonly string[];
  readonly iNarcMarkedByTeams?: readonly string[];
}

export interface IComputeIndirectFireContextInput {
  readonly attackerId: string;
  readonly weaponId: string;
  readonly targetHex: IHexCoordinate;
  readonly gameState: IGameState;
  readonly grid: IHexGrid;
  readonly pilotSpasByUnitId?: Readonly<Record<string, readonly string[]>>;
  readonly targetEntityId?: string;
  readonly optionalRules?: readonly string[];
}

type ComputeIndirectFireContextArgs =
  | [input: IComputeIndirectFireContextInput]
  | [
      attackerId: string,
      weaponId: string,
      targetHex: IHexCoordinate,
      gameState: IGameState,
      grid: IHexGrid,
      pilotSpasByUnitId?: Readonly<Record<string, readonly string[]>>,
      targetEntityId?: string,
      optionalRules?: readonly string[],
    ];

function normalizeComputeIndirectFireContextInput(
  args: ComputeIndirectFireContextArgs,
): IComputeIndirectFireContextInput {
  if (args.length === 1) {
    return args[0];
  }
  const [
    attackerId,
    weaponId,
    targetHex,
    gameState,
    grid,
    pilotSpasByUnitId,
    targetEntityId,
    optionalRules,
  ] = args;
  return {
    attackerId,
    weaponId,
    targetHex,
    gameState,
    grid,
    pilotSpasByUnitId,
    targetEntityId,
    optionalRules,
  };
}

export function lineOfSightOptionsFromGameState(
  gameState: IGameState,
  optionalRules?: readonly string[],
): ILOSCalculationOptions {
  const occupants: Record<string, ILOSUnitOccupantState> = {};
  for (const unit of Object.values(gameState.units)) {
    occupants[unit.id] = {
      id: unit.id,
      unitType: unit.unitType,
      destroyed: unit.destroyed,
      airborne: unit.isAirborne,
    };
  }

  return {
    ...lineOfSightOptionsFromOptionalRules(optionalRules),
    occupants,
  };
}

/**
 * Derive `IIndirectFireResolution` for an attack declared from
 * `attackerId` using `weaponId` at `targetHex`.
 *
 * Steps:
 *  1. Reject immediately when the weapon cannot fire indirectly.
 *  2. Compute attacker→target LOS to decide if indirect is needed.
 *  3. When the attacker has LOS, return a direct-fire pass-through
 *     (permitted=true, isIndirect=false, toHitPenalty=0).
 *  4. Build `ISpotterCandidate[]` from every operational, friendly,
 *     non-attacker unit in the current game state. When `pilotSpasByUnitId`
 *     is supplied, the matching SPA list is threaded into each candidate so
 *     the helper can apply FO (Forward Observer) and future SPA cancellations.
 *  5. When no LOS spotter is found, check NARC/iNarc beacon flags on the
 *     target unit (§3). Canonical NARC state is `IUnitGameState.narcedBy`;
 *     legacy `narcMarkedByTeams` / `iNarcMarkedByTeams` arrays are still read
 *     defensively for older fixtures and saves.
 *  6. Delegate to `resolveIndirectFire` and map the result to
 *     `IIndirectFireResolution`.
 *
 * This function is a pure collaborator — it reads from `gameState` and
 * `grid` but never mutates them.
 *
 * @param pilotSpasByUnitId - Optional map of unit-id → canonical SPA id list.
 *   Callers (e.g. the attack resolver) can supply this when pilot data is
 *   already in scope. Units absent from the map receive no SPA modifiers.
 * @param targetEntityId - Optional entity ID of the target unit. When provided,
 *   NARC/iNarc beacon state is read from the target's unit game state.
 */
export function computeIndirectFireContext(
  ...args: ComputeIndirectFireContextArgs
): IIndirectFireResolution {
  const {
    attackerId,
    weaponId,
    targetHex,
    gameState,
    grid,
    pilotSpasByUnitId,
    targetEntityId,
    optionalRules,
  } = normalizeComputeIndirectFireContextInput(args);
  const attackerUnit = gameState.units[attackerId];
  if (!attackerUnit) {
    return {
      permitted: false,
      isIndirect: false,
      spotterId: null,
      toHitPenalty: 0,
      reason: `Attacker '${attackerId}' not found in game state`,
    };
  }

  // Reject non-indirect-capable weapons before any LOS work.
  if (!isIndirectFireCapable(weaponId)) {
    return {
      permitted: false,
      isIndirect: false,
      spotterId: null,
      toHitPenalty: 0,
      reason: `Weapon '${weaponId}' is not capable of indirect fire`,
    };
  }

  // Compute attacker→target LOS to determine whether indirect is needed.
  const losOptions = lineOfSightOptionsFromGameState(gameState, optionalRules);
  const attackerLOS = calculateLOS(
    attackerUnit.position,
    targetHex,
    grid,
    undefined,
    undefined,
    losOptions,
  );
  if (attackerLOS.hasLOS) {
    // Direct fire is available; indirect context is a pass-through.
    return {
      permitted: true,
      isIndirect: false,
      spotterId: null,
      toHitPenalty: 0,
    };
  }

  // Attacker has no LOS — enumerate spotter candidates from the current state.
  // Use the unit's `side` value as the team ID so the helper's eligibility
  // check (same team as attacker) maps cleanly to game sides.
  const attackerTeamId = attackerUnit.side as string;

  const spotterCandidates: ISpotterCandidate[] = [];
  for (const [unitId, unit] of Object.entries(gameState.units)) {
    // Skip destroyed, retreated, or non-operational units.
    if (unit.destroyed || unit.hasRetreated || unit.hasEjected) continue;
    spotterCandidates.push({
      entityId: unitId,
      teamId: unit.side as string,
      position: unit.position,
      movementType: unit.movementThisTurn,
      sprintedThisTurn: unit.sprintedThisTurn,
      isEvading: unit.isEvading,
      isOperational: !unit.destroyed && !unit.shutdown,
      // Thread pilot SPA list into candidate when caller supplies it, falling
      // back to the combat-state ability list hydrated onto the unit.
      pilotSpas: pilotSpasByUnitId?.[unitId] ?? unit.abilities,
      // Audit C-5: thread the per-turn fired state into the candidate so the
      // helper can apply the +1 spotter-attacking modifier (MegaMek
      // ComputeToHit.java L1540-1544 / Entity.isAttackingThisTurn).
      // weaponsFiredThisTurn is reset on every TurnStarted boundary
      // (gameState/phaseManagement.ts), so it is an honest this-turn signal.
      attackedThisTurn: (unit.weaponsFiredThisTurn?.length ?? 0) > 0,
    });
  }

  // Derive NARC/iNarc beacon flags for the target unit (§3). NARC uses the
  // canonical `narcedBy` state field; iNARC uses Homing pods from `iNarcPods`.
  // Legacy arrays stay as compatibility fallbacks until older fixtures retire.
  const targetUnit = targetEntityId
    ? gameState.units[targetEntityId]
    : undefined;
  const legacyTargetMarkers = targetUnit as
    | (IUnitGameState & ILegacyIndirectMarkerState)
    | undefined;
  const legacyNarcMarkedByTeams: readonly string[] =
    legacyTargetMarkers?.narcMarkedByTeams ?? [];
  const narcMarkedByTeams: readonly string[] = [
    ...(targetUnit?.narcedBy ?? []),
    ...legacyNarcMarkedByTeams,
  ];
  const canonicalINarcMarkedByTeams =
    targetUnit?.iNarcPods
      ?.filter((pod) => pod.podType === 'homing')
      .map((pod) => pod.teamId) ?? [];
  const inarcMarkedByTeams: readonly string[] =
    legacyTargetMarkers?.iNarcMarkedByTeams ?? [];
  const targetNarcMarkedByTeam = narcMarkedByTeams.includes(attackerTeamId);
  const targetINarcMarkedByTeam = [
    ...canonicalINarcMarkedByTeams,
    ...inarcMarkedByTeams,
  ].includes(attackerTeamId);

  // Delegate to the pure helper — it handles eligibility, LOS per spotter,
  // spotter-election tiebreak, NARC/iNarc override, and penalty arithmetic.
  const result = resolveIndirectFire({
    attackerEntityId: attackerId,
    attackerTeamId,
    attackerPosition: attackerUnit.position,
    targetPosition: targetHex,
    weaponId,
    attackerHasLOS: false,
    attackerPilotSpas:
      pilotSpasByUnitId?.[attackerId] ?? attackerUnit.abilities,
    spotterCandidates,
    grid,
    losOptions,
    targetNarcMarkedByTeam,
    targetINarcMarkedByTeam,
  });

  if (!result.permitted) {
    return {
      permitted: false,
      isIndirect: result.isIndirect,
      spotterId: null,
      toHitPenalty: 0,
      reason: result.reason,
    };
  }

  // Map basis from helper result — 'los' | 'narc' | 'inarc' all pass through.
  return {
    permitted: true,
    isIndirect: true,
    spotterId: result.spotter?.entityId ?? null,
    basis: result.basis,
    toHitPenalty: result.toHitPenalty,
    forwardObserverApplied: result.forwardObserverApplied,
    obliqueAttackerApplied: result.obliqueAttackerApplied,
    commImplantApplied: result.commImplantApplied,
    spotterAttackedThisTurn: result.spotterAttackedThisTurn,
    spotterMovementPenaltyCancelled: result.spotterMovementPenaltyCancelled,
    commImplantPenaltyRelief: result.commImplantPenaltyRelief,
  };
}
