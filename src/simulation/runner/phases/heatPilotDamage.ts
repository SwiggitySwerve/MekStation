import { getPilotHeatDamage } from '@/constants/heat';
import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IUnitGameState,
} from '@/types/gameplay';
import { resolvePilotConsciousnessCheck } from '@/utils/gameplay/damage';
import { D6Roller } from '@/utils/gameplay/hitLocation';

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
}

export function applyRunnerHeatPilotDamage(
  options: IApplyRunnerHeatPilotDamageOptions,
): IUnitGameState {
  const {
    d6Roller,
    events,
    gameId,
    heat,
    lifeSupportHits,
    turn,
    unit,
    unitId,
  } = options;
  const pilotHeatDamage = getPilotHeatDamage(heat, lifeSupportHits);
  if (pilotHeatDamage <= 0) {
    return unit;
  }

  const pilotWounds = unit.pilotWounds + pilotHeatDamage;
  const consciousnessCheck = resolvePilotConsciousnessCheck(
    pilotWounds,
    pilotHeatDamage,
    unit.abilities ?? [],
    d6Roller,
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
    destroyed: pilotKilled ? true : unit.destroyed,
  };
}
