import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
} from '@/types/gameplay';
import {
  resolveBattleMechAmmoExplosionPilotDamage,
  type CASEProtectionLevel,
} from '@/utils/gameplay/ammoTracking';
import { applyPilotDamage } from '@/utils/gameplay/damage';

import { buildDamageState } from '../SimulationRunnerState';
import { createGameEvent } from './utils';

interface IApplyAmmoExplosionPilotDamageOptions {
  readonly currentState: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly targetId: string;
  readonly sourceUnitId: string;
  readonly phase: GamePhase;
  readonly totalExplosionDamage: number;
  readonly caseProtection: CASEProtectionLevel;
  readonly d6Roller: () => number;
}

export function applyAmmoExplosionPilotDamage(
  options: IApplyAmmoExplosionPilotDamageOptions,
): { readonly currentState: IGameState; readonly pilotDestroyed: boolean } {
  const {
    caseProtection,
    currentState,
    d6Roller,
    events,
    gameId,
    phase,
    sourceUnitId,
    targetId,
    totalExplosionDamage,
  } = options;
  const target = currentState.units[targetId];
  if (!target) {
    return { currentState, pilotDestroyed: false };
  }

  const wounds = resolveBattleMechAmmoExplosionPilotDamage({
    totalDamage: totalExplosionDamage,
    caseProtection,
    pilotAbilities: target.abilities,
  });
  if (wounds <= 0) {
    return { currentState, pilotDestroyed: false };
  }

  const pilotDamage = applyPilotDamage(
    buildDamageState(target),
    wounds,
    'ammo_explosion',
    d6Roller,
  );
  const updatedState: IGameState = {
    ...currentState,
    units: {
      ...currentState.units,
      [targetId]: {
        ...target,
        pilotWounds: pilotDamage.state.pilotWounds,
        pilotConscious: pilotDamage.state.pilotConscious,
        destroyed: pilotDamage.state.destroyed,
        destructionCause: pilotDamage.state.destructionCause,
      },
    },
  };

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.PilotHit,
      currentState.turn,
      phase,
      {
        unitId: targetId,
        wounds,
        totalWounds: pilotDamage.result.totalWounds,
        source: 'ammo_explosion' as const,
        consciousnessCheckRequired:
          pilotDamage.result.consciousnessCheckRequired,
        consciousnessCheckPassed: pilotDamage.result.conscious,
      },
      sourceUnitId,
    ),
  );

  return {
    currentState: updatedState,
    pilotDestroyed: pilotDamage.result.dead,
  };
}
