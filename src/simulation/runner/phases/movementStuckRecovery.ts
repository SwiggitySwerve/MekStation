import type { D6Roller } from '@/utils/gameplay/hitLocation';

import {
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IHexGrid,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
} from '@/utils/gameplay/gameEvents/statusChecks';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { parseTerrainFeatures } from '@/utils/gameplay/lineOfSight';
import { clearStuck } from '@/utils/gameplay/movement/stuckState';
import {
  createSwampUnstuckPSR,
  resolvePSR,
} from '@/utils/gameplay/pilotingSkillRolls';

import {
  DEFAULT_COMPONENT_DAMAGE,
  DEFAULT_PILOTING,
} from '../SimulationRunnerConstants';

type RecoveryUnit = IGameState['units'][string];

/**
 * MegaMek 48fcb2f64 TWPhasePreparationManager (L241) runs doTryUnstuck
 * (TWGameManager L31368-L31419) when the movement phase is prepared: every
 * stuck unit rolls to break free before anyone moves. Success clears stuck
 * and jump eligibility; failure leaves the unit stuck with no fall and no
 * pilot damage. Units that cannot act this phase (MegaMek's base piloting
 * roll is impossible or an automatic failure for them) do not roll and stay
 * stuck.
 */
export function runStuckRecoveryRolls(options: {
  readonly currentState: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly grid: IHexGrid;
  readonly d6Roller: D6Roller;
}): IGameState {
  let currentState = options.currentState;
  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.isStuck !== true || cannotAttemptRecovery(unit)) continue;
    currentState = rollStuckRecovery({ ...options, currentState, unitId });
  }
  return currentState;
}

function cannotAttemptRecovery(unit: RecoveryUnit): boolean {
  return (
    unit.destroyed ||
    unit.hasRetreated === true ||
    unit.hasEjected === true ||
    unit.shutdown === true ||
    !unit.pilotConscious
  );
}

function rollStuckRecovery(options: {
  readonly currentState: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly grid: IHexGrid;
  readonly d6Roller: D6Roller;
  readonly unitId: string;
}): IGameState {
  const { currentState, d6Roller, events, gameId, grid, unitId } = options;
  const unit = currentState.units[unitId];
  const piloting = unit.piloting ?? DEFAULT_PILOTING;
  const psr = createSwampUnstuckPSR(unitId, {
    swampDepth: swampLevelAt(grid, unit.position),
  });

  events.push(
    createPSRTriggeredEvent(
      gameId,
      events.length,
      currentState.turn,
      GamePhase.Movement,
      unitId,
      psr.reason,
      psr.additionalModifier,
      psr.triggerSource,
      piloting,
      psr.reasonCode,
    ),
  );

  const result = resolvePSR(
    piloting,
    psr,
    unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE,
    unit.pilotWounds,
    d6Roller,
    {
      unitQuirks: unit.unitQuirks ?? [],
      pilotAbilities: unit.abilities ?? [],
      neuralInterfaceActive: unit.neuralInterfaceActive,
      neuralInterfaceMode: unit.neuralInterfaceMode,
      hasDNICockpitMod: unit.hasDNICockpitMod,
      isQuadMek: unit.isQuad ?? false,
      unitType: unit.unitType,
    },
  );
  events.push(
    createPSRResolvedEvent(
      gameId,
      events.length,
      currentState.turn,
      GamePhase.Movement,
      unitId,
      result.targetNumber,
      result.roll,
      result.modifiers.reduce((total, modifier) => total + modifier.value, 0),
      result.passed,
      psr.reason,
      psr.reasonCode,
    ),
  );

  if (!result.passed) return currentState;
  return {
    ...currentState,
    units: { ...currentState.units, [unitId]: clearStuck(unit) },
  };
}

function swampLevelAt(
  grid: IHexGrid,
  position: RecoveryUnit['position'],
): number | undefined {
  const terrain = grid.hexes.get(coordToKey(position))?.terrain;
  if (!terrain) return undefined;
  const swamp = parseTerrainFeatures(terrain).find(
    (feature) => feature.type === TerrainType.Swamp && feature.level > 0,
  );
  return swamp?.level;
}
