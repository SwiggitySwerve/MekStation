/** Construction and hit transport between the runner and existing family owners. */
import {
  adaptUnitFromData,
  fullUnitFromCustomSnapshot,
} from '@/engine/adapters/CompendiumAdapter';
import { isVehicleDefinition } from '@/engine/adapters/CompendiumAdapter.vehicle';
import { toMovementCapability } from '@/engine/GameEngine.helpers';
import {
  deriveAdaptedUnitsFromSession,
  isCustomCombatUnitRef,
} from '@/engine/InteractiveSession.recovery';
import { gameUnitsWithAdaptedCombatSeeds } from '@/engine/InteractiveSession.setup';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import {
  GameEventType,
  GamePhase,
  GameSide,
  Facing,
  MovementType,
  type IGameState,
  type IGameEvent,
  type IGameSession,
  type IGameUnit,
  type IGameCreatedPayload,
} from '@/types/gameplay';
import { formatUnitReference } from '@/types/unit/UnitIndex';
import { isAerospaceUnitType } from '@/utils/construction/aerospace/aerospaceBVUnitAdapter';
import { roll2d6 } from '@/utils/gameplay/diceTypes';
import { tryResolveAerospaceAttackHit } from '@/utils/gameplay/gameSessionAerospaceAttackResolution';
import { tryResolveVehicleAttackHit } from '@/utils/gameplay/gameSessionVehicleAttackResolution';
import { applyEvent, createInitialUnitState } from '@/utils/gameplay/gameState';
import { applyHeatChange } from '@/utils/gameplay/gameState/damageResolution';

import type { resolveWeaponHit } from './phases/weaponAttackHitResolution';
import type { IHydratedUnitData } from './UnitHydrationTypes';

import { createGameEvent } from './phases/utils';
import { toFiringArc } from './phases/weaponAttackHelpers';
import { consumeWeaponAmmo } from './phases/weaponAttackHitResolution.helpers';
import { DEFAULT_GUNNERY, DEFAULT_PILOTING } from './SimulationRunnerConstants';
export type IRunnerHydratedUnitData = IHydratedUnitData & {
  readonly sourceUnit?: IGameUnit;
};

export function nativeRunnerConstruction(data: IRunnerHydratedUnitData) {
  const vehicle = isVehicleDefinition(data.fullUnit);
  if (!vehicle && !isAerospaceUnitType(data.fullUnit)) return null;
  const adapted = {
    ...adaptUnitFromData(data.fullUnit, { side: data.side }),
    id: data.runnerUnitId,
  };
  const base: IGameUnit = {
    id: data.runnerUnitId,
    name: data.fullUnit.chassis,
    side: data.side,
    unitRef: formatUnitReference(
      data.fullUnit.id,
      vehicle ? 'vehicles' : 'aerospace',
    ),
    pilotRef: runnerPilotRef(data.runnerUnitId),
    gunnery: data.gunnery ?? DEFAULT_GUNNERY,
    piloting: data.piloting ?? DEFAULT_PILOTING,
    ...data.sourceUnit,
  };
  const [unit] = gameUnitsWithAdaptedCombatSeeds(
    [{ ...base, id: data.runnerUnitId, side: data.side }],
    [adapted],
    [],
  );
  return {
    unit,
    movement: toMovementCapability(adapted),
    state: createInitialUnitState(
      unit,
      data.position,
      data.side === GameSide.Player ? Facing.South : Facing.North,
    ),
  };
}

/** A new autonomous run uses recorded custom construction, never the mutable library. */
export async function runnerHydrationFromSession(session: IGameSession) {
  for (const unit of session.units)
    if (isCustomCombatUnitRef(unit.unitRef) && !unit.customUnitDefinition)
      throw new Error(
        `Runner requires recorded custom construction: ${unit.unitRef}`,
      );
  const adapted = await deriveAdaptedUnitsFromSession(session);
  const hydration = new Map<string, IRunnerHydratedUnitData>();
  const counts = { [GameSide.Player]: 0, [GameSide.Opponent]: 0 };
  for (const sourceUnit of session.units) {
    const unit = adapted.find((candidate) => candidate.id === sourceUnit.id);
    const fullUnit = sourceUnit.customUnitDefinition
      ? fullUnitFromCustomSnapshot(sourceUnit.customUnitDefinition)
      : await getCanonicalUnitService().getById(sourceUnit.unitRef);
    if (!unit || !fullUnit)
      throw new Error(`Runner construction missing: ${sourceUnit.unitRef}`);
    const id = runnerUnitId(sourceUnit.side, counts[sourceUnit.side]++);
    hydration.set(id, {
      runnerUnitId: id,
      side: sourceUnit.side,
      position: session.currentState.units[sourceUnit.id].position,
      fullUnit,
      aiWeapons: unit.weapons,
      gunnery: sourceUnit.gunnery,
      piloting: sourceUnit.piloting,
      sourceUnit,
    });
  }
  return hydration;
}

/** Reuse replay's native heat projection for the runner's already-calculated total. */
export function synchronizeNativeRunnerHeat(state: IGameState): IGameState {
  for (const unit of Object.values(state.units))
    if (unit.combatState?.kind === 'aero')
      state = applyHeatChange(state, {
        unitId: unit.id,
        amount: 0,
        source: 'external',
        newTotal: unit.heat,
      });
  return state;
}

/** Native hit resolution and replay are shared with GameEngine/InteractiveSession. */
export function tryResolveNativeRunnerHit(
  options: Parameters<typeof resolveWeaponHit>[0],
) {
  const {
    currentState,
    targetId,
    unitId,
    weapon,
    weaponId,
    gameId,
    events,
    d6Roller,
    firingArc,
    attackRoll,
    toHitNumber,
  } = options;
  const targetState = currentState.units[targetId];
  if (
    targetState.combatState?.kind !== 'vehicle' &&
    targetState.combatState?.kind !== 'aero'
  )
    return null;
  const created = events[0].payload as IGameCreatedPayload;
  const session: IGameSession = {
    id: gameId,
    config: created.config,
    units: created.units,
    events: [...events],
    currentState,
    createdAt: events[0].timestamp,
    updatedAt: events[0].timestamp,
  };
  const weaponData = {
    weaponId,
    weaponName: weapon.name,
    damage: weapon.damage,
    heat: weapon.heat,
  };
  const diceRoller = () => roll2d6(d6Roller);
  const input = {
    session,
    attackerId: unitId,
    targetId,
    weaponId,
    weaponData,
    targetState,
    attackRollTotal: attackRoll,
    toHitNumber,
    attackDirection: firingArc,
    diceRoller,
    d6Roller,
  };
  const resolved =
    targetState.combatState.kind === 'aero'
      ? tryResolveAerospaceAttackHit({
          ...input,
          weaponName: weapon.name,
          turn: currentState.turn,
          weaponToHitNumber: toHitNumber,
          firingArc: toFiringArc(firingArc),
          arcString: firingArc,
          ammoBinIdForResolved: null,
          criticalD6Roller: d6Roller,
          payload: {
            attackerId: unitId,
            targetId,
            weapons: [weaponId],
            toHitNumber,
            modifiers: [],
          },
        })
      : tryResolveVehicleAttackHit(input);
  if (!resolved)
    throw new Error('Native hit dispatch declined a supported unit');
  let state = currentState;
  for (const event of resolved.events.slice(events.length)) {
    const transported = createGameEvent({
      gameId,
      sequence: events.length,
      type: event.type,
      turn: event.turn,
      phase: event.phase,
      payload: event.payload,
      actorId: event.actorId,
    });
    events.push(transported);
    state = applyEvent(state, transported);
  }
  return consumeWeaponAmmo({
    currentState: state,
    events,
    gameId,
    attackerId: unitId,
    weapon,
    ammoWeaponType: options.ammoWeaponType,
  });
}

/** Explicit zero-MP setup placement records the runner's actual native formation. */
export function appendNativeRunnerDeploymentEvents(
  state: IGameState,
  events: IGameEvent[],
  gameId: string,
): void {
  for (const unit of Object.values(state.units)) {
    if (
      unit.combatState?.kind !== 'vehicle' &&
      unit.combatState?.kind !== 'aero'
    )
      continue;
    events.push(
      createGameEvent({
        gameId,
        sequence: events.length,
        type: GameEventType.MovementDeclared,
        turn: 0,
        phase: GamePhase.Movement,
        actorId: unit.id,
        payload: {
          unitId: unit.id,
          from: unit.position,
          to: unit.position,
          facing: unit.facing,
          movementType: MovementType.Stationary,
          mpUsed: 0,
          heatGenerated: 0,
        },
      }),
    );
  }
}

/** The allocation key shared by construction, replay roster and session entry. */
export function runnerUnitId(side: GameSide, index: number): string {
  return `${side === GameSide.Player ? 'player' : 'opponent'}-${index + 1}`;
}

export function runnerPilotRef(id: string): string {
  return `pilot-${id}`;
}
