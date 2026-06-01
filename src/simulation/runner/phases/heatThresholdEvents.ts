import { GameEventType, GamePhase, type IGameEvent } from '@/types/gameplay';

import { createGameEvent } from './utils';

const HEAT_THRESHOLD_LADDER: ReadonlyArray<{
  readonly threshold: number;
  readonly effect:
    | 'movement_penalty'
    | 'attack_penalty'
    | 'shutdown_check'
    | 'shutdown'
    | 'pilot_damage'
    | 'ammo_explosion_risk';
}> = [
  { threshold: 5, effect: 'movement_penalty' },
  { threshold: 8, effect: 'attack_penalty' },
  { threshold: 13, effect: 'attack_penalty' },
  { threshold: 14, effect: 'shutdown_check' },
  { threshold: 15, effect: 'pilot_damage' },
  { threshold: 17, effect: 'attack_penalty' },
  { threshold: 19, effect: 'ammo_explosion_risk' },
  { threshold: 23, effect: 'ammo_explosion_risk' },
  { threshold: 24, effect: 'attack_penalty' },
  { threshold: 25, effect: 'pilot_damage' },
  { threshold: 28, effect: 'ammo_explosion_risk' },
  { threshold: 30, effect: 'shutdown' },
];

export function emitHeatThresholdEvents(options: {
  readonly unitId: string;
  readonly heat: number;
  readonly turn: number;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly shutdownCheckThreshold?: number;
}): void {
  const {
    events,
    gameId,
    heat,
    shutdownCheckThreshold = 14,
    turn,
    unitId,
  } = options;

  for (const entry of HEAT_THRESHOLD_LADDER) {
    const threshold =
      entry.effect === 'shutdown_check'
        ? shutdownCheckThreshold
        : entry.threshold;
    if (heat < threshold) continue;
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.HeatEffectApplied,
        turn,
        GamePhase.Heat,
        {
          unitId,
          threshold,
          effect: entry.effect,
          heatLevel: heat,
        },
        unitId,
      ),
    );
  }
}
