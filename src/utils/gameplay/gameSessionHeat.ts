import { GamePhase, IGameSession } from '@/types/gameplay';

import type {
  HeatCriticalContext,
  IResolveHeatPhaseOptions,
} from './gameSessionHeat.types';

import {
  buildDefaultCriticalSlotManifest,
  type CriticalSlotManifest,
} from './criticalHitResolution';
import { type DiceRoller } from './diceTypes';
import { resolveHeatForUnit } from './gameSessionHeat.effects';
import {
  createD6RollerFromDiceRoller,
  hasMaxTechHeatScaleRule,
} from './gameSessionHeat.helpers';
import { roll2d6 as rollDice } from './hitLocation';
import { getHotDogHeatTargetNumberModifier } from './spaModifiers';

export type { IResolveHeatPhaseOptions } from './gameSessionHeat.types';

export function resolveHeatPhase(
  session: IGameSession,
  diceRoller: DiceRoller = rollDice,
  options?: IResolveHeatPhaseOptions,
): IGameSession {
  if (session.currentState.phase !== GamePhase.Heat) {
    throw new Error('Not in heat phase');
  }

  const { turn } = session.currentState;
  let currentSession = session;
  const maxTechHeatScale =
    options?.maxTechHeatScale ??
    hasMaxTechHeatScaleRule(session.config.optionalRules);
  const getOrSeedCriticalManifest = (unitId: string): CriticalSlotManifest => {
    const existing = options?.criticalManifestsByUnit?.get(unitId);
    if (existing) return existing;
    const seeded = buildDefaultCriticalSlotManifest();
    options?.criticalManifestsByUnit?.set(unitId, seeded);
    return seeded;
  };
  const heatCriticalContext: HeatCriticalContext = {
    enabled: maxTechHeatScale,
    getOrSeedCriticalManifest,
    heatCriticalD6Roller: createD6RollerFromDiceRoller(diceRoller),
    maxTechCriticalLocationRoller:
      options?.maxTechCriticalLocationRoller ??
      (() => Math.floor(Math.random() * 8)),
  };

  const turnEvents = session.events.filter((event) => event.turn === turn);
  const unitIds = Object.keys(session.currentState.units);

  for (const unitId of unitIds) {
    const unitState = currentSession.currentState.units[unitId];
    const unit = currentSession.units.find((entry) => entry.id === unitId);
    if (!unit || unitState.destroyed) {
      continue;
    }

    currentSession = resolveHeatForUnit(
      currentSession,
      {
        unitId,
        unit,
        unitState,
        turn,
        hotDogTargetNumberModifier: getHotDogHeatTargetNumberModifier(
          unitState.abilities ?? unit.abilities ?? [],
        ),
        diceRoller,
        options,
      },
      turnEvents,
      heatCriticalContext,
    );
  }

  return currentSession;
}
