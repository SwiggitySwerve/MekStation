import type {
  IEnvironmentalConditions,
  IGameEvent,
  IGameState,
  IHexGrid,
} from '@/types/gameplay';

import type { IWeapon } from '../../ai/types';

import { SeededRandom } from '../../core/SeededRandom';
import {
  computeHeatAccounting,
  createHeatEmissionContext,
  emitHeatAccountingEvents,
} from './postCombatHeatAccounting';
import {
  applyHeatAmmoExplosions,
  applyHeatCriticalDamage,
  applyHeatPilotDamage,
  applyHeatShutdownCheck,
  applyHeatStartup,
  commitHeatPhaseUnit,
  type CriticalSlotManifestsByUnit,
  wakePilotIfConsciousnessReturns,
} from './postCombatHeatLifecycle';

export function runHeatPhase(options: {
  state: IGameState;
  events?: IGameEvent[];
  gameId?: string;
  random?: SeededRandom;
  /**
   * Per `add-combat-fidelity-suite` Phase 1: per-unit hydrated weapon
   * list, keyed by runner unit id. When supplied, weapon heat is
   * sourced from the catalog per mount; without it, the legacy
   * synthetic-laser fallback fires.
   */
  weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
  grid?: IHexGrid;
  environmentalConditions?: IEnvironmentalConditions;
  maxTechHeatScale?: boolean;
  manifestsByUnit?: CriticalSlotManifestsByUnit;
}): IGameState {
  const {
    environmentalConditions,
    grid,
    manifestsByUnit,
    maxTechHeatScale,
    state,
    weaponsByUnit,
  } = options;
  let currentState = { ...state };
  const emission = createHeatEmissionContext(options);

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed) {
      continue;
    }

    const accounting = computeHeatAccounting({
      unit,
      unitId,
      weaponsByUnit,
      grid,
      environmentalConditions,
    });
    emitHeatAccountingEvents({
      emission,
      state: currentState,
      unitId,
      accounting,
    });

    let heatPhaseUnit = wakePilotIfConsciousnessReturns({
      unit: accounting.unitAfterHeatAccounting,
      emission,
    });
    heatPhaseUnit = applyHeatStartup({
      unit: heatPhaseUnit,
      unitId,
      heat: accounting.newHeat,
      turn: currentState.turn,
      hotDogTargetNumberModifier: accounting.hotDogTargetNumberModifier,
      emission,
    });

    const shutdownResult = applyHeatShutdownCheck({
      unit: heatPhaseUnit,
      unitId,
      heat: accounting.newHeat,
      turn: currentState.turn,
      hotDogTargetNumberModifier: accounting.hotDogTargetNumberModifier,
      emission,
    });
    heatPhaseUnit = shutdownResult.unit;

    const ammoResult = applyHeatAmmoExplosions({
      currentState,
      unit: heatPhaseUnit,
      unitId,
      heat: accounting.newHeat,
      emission,
      weaponsByUnit,
      targetNumberModifier: accounting.hotDogTargetNumberModifier,
    });
    currentState = ammoResult.state;
    heatPhaseUnit = applyHeatPilotDamage({
      unit: ammoResult.unit,
      unitId,
      heat: accounting.newHeat,
      turn: currentState.turn,
      componentDamage: accounting.componentDamage,
      hotDogTargetNumberModifier: accounting.hotDogTargetNumberModifier,
      maxTechHeatScale,
      emission,
    });

    const criticalResult = applyHeatCriticalDamage({
      unit: heatPhaseUnit,
      unitId,
      heat: accounting.newHeat,
      turn: currentState.turn,
      componentDamage: accounting.componentDamage,
      hotDogTargetNumberModifier: accounting.hotDogTargetNumberModifier,
      maxTechHeatScale,
      manifestsByUnit,
      emission,
    });
    currentState = commitHeatPhaseUnit({
      state: currentState,
      unitId,
      unit: criticalResult.unit,
      heat: accounting.newHeat,
      shutdown: shutdownResult.shutdown,
      criticalEvents: criticalResult.criticalEvents,
    });
  }

  return currentState;
}
