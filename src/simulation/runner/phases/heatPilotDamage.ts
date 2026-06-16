import {
  getMaxTechPilotHeatDamageAvoidTN,
  getPilotHeatDamage,
} from '@/constants/heat';
import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IUnitGameState,
} from '@/types/gameplay';
import { resolvePilotConsciousnessCheck } from '@/utils/gameplay/damage';
import { D6Roller } from '@/utils/gameplay/hitLocation';
import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';

import { LETHAL_PILOT_WOUNDS } from '../SimulationRunnerConstants';
import { createGameEvent } from './utils';

interface IApplyRunnerHeatPilotDamageOptions {
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly heat: number;
  readonly lifeSupportHits: number;
  readonly turn: number;
  readonly events?: IGameEvent[];
  readonly gameId?: string;
  readonly d6Roller?: D6Roller;
  readonly hotDogTargetNumberModifier?: number;
  readonly maxTechHeatScale?: boolean;
}

export function applyRunnerHeatPilotDamage(
  options: IApplyRunnerHeatPilotDamageOptions,
): IUnitGameState {
  const {
    d6Roller,
    events,
    gameId,
    heat,
    hotDogTargetNumberModifier = 0,
    lifeSupportHits,
    maxTechHeatScale = false,
    turn,
    unit,
    unitId,
  } = options;
  const defaultPilotHeatDamage = getPilotHeatDamage(heat, lifeSupportHits);
  let pilotHeatDamage = defaultPilotHeatDamage;
  if (
    pilotHeatDamage <= 0 &&
    maxTechHeatScale &&
    d6Roller !== undefined &&
    !hasSPA(unit.abilities ?? [], 'artificial_pain_shunt')
  ) {
    const avoidTN = getMaxTechPilotHeatDamageAvoidTN(
      heat,
      hotDogTargetNumberModifier,
    );
    if (avoidTN > 0) {
      const roll = d6Roller() + d6Roller();
      pilotHeatDamage = roll < avoidTN ? 1 : 0;
    }
  }
  if (pilotHeatDamage <= 0) {
    return unit;
  }

  const pilotWounds = unit.pilotWounds + pilotHeatDamage;
  const consciousnessCheck = resolvePilotConsciousnessCheck(
    pilotWounds,
    pilotHeatDamage,
    unit.abilities ?? [],
    d6Roller,
    unit.pilotToughness,
    {
      edgePointsRemaining: unit.edgePointsRemaining,
      turn,
      unitId,
    },
  );
  const pilotConscious =
    pilotWounds < LETHAL_PILOT_WOUNDS &&
    unit.pilotConscious &&
    (consciousnessCheck.conscious ?? true);
  const pilotKilled = pilotWounds >= LETHAL_PILOT_WOUNDS && !unit.destroyed;

  if (events && gameId) {
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.PilotHit,
        turn,
        GamePhase.Heat,
        {
          unitId,
          wounds: pilotHeatDamage,
          totalWounds: pilotWounds,
          source: 'heat' as const,
          consciousnessCheckRequired: true,
          consciousnessCheckPassed: pilotConscious,
          edgeReroll: consciousnessCheck.edgeReroll,
          edgeSuperseded: consciousnessCheck.edgeSuperseded,
          edgeTrigger: consciousnessCheck.edgeTrigger,
          edgePointsRemaining: consciousnessCheck.edgePointsRemaining,
        },
        unitId,
      ),
    );

    if (pilotKilled) {
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.UnitDestroyed,
          turn,
          GamePhase.Heat,
          {
            unitId,
            cause: 'pilot_death' as const,
          },
        ),
      );
    }
  }

  return {
    ...unit,
    pilotWounds,
    pilotConscious,
    edgePointsRemaining:
      consciousnessCheck.edgePointsRemaining ?? unit.edgePointsRemaining,
    destroyed: pilotKilled ? true : unit.destroyed,
  };
}
