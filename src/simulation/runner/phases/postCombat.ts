import { getShutdownTN } from '@/constants/heat';
import {
  GameEventType,
  GamePhase,
  type IEnvironmentalConditions,
  IGameEvent,
  IGameState,
  IHexGrid,
} from '@/types/gameplay';
import { resolvePilotConsciousnessCheck } from '@/utils/gameplay/damage';
import { calculateEnvironmentalHeatModifier } from '@/utils/gameplay/environmentalModifiers';
import { getGridTerrainHeatEffect } from '@/utils/gameplay/heat';
import {
  IPSRBatchResult,
  resolveAllPSRs,
} from '@/utils/gameplay/pilotingSkillRolls';
import {
  getCoolUnderFireHeatReduction,
  getHotDogShutdownThresholdBonus,
} from '@/utils/gameplay/spaModifiers';

import type { IWeapon } from '../../ai/types';

import { SeededRandom } from '../../core/SeededRandom';
import {
  BASE_HEAT_SINKS,
  DEFAULT_COMPONENT_DAMAGE,
  DEFAULT_PILOTING,
  ENGINE_HEAT_PER_CRITICAL,
  LETHAL_PILOT_WOUNDS,
} from '../SimulationRunnerConstants';
import { applyHeatInducedAmmoExplosions } from './heatAmmoExplosions';
import {
  computeMovementHeat,
  computeWeaponHeat,
} from './heatPhaseCalculations';
import { applyRunnerHeatPilotDamage } from './heatPilotDamage';
import { queueRunnerShutdownPSR } from './heatShutdownPsr';
import { applyRunnerStartupAttempt } from './heatStartup';
import { emitHeatThresholdEvents } from './heatThresholdEvents';
import { createD6Roller, createGameEvent } from './utils';

export function runPSRPhase(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  random: SeededRandom;
}): IGameState {
  const { events, gameId, random, state } = options;
  let currentState = state;
  const d6Roller = createD6Roller(random);

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed) {
      continue;
    }

    const pendingPSRs = unit.pendingPSRs ?? [];
    if (pendingPSRs.length === 0) {
      continue;
    }

    const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
    const pilotingSkill = unit.piloting ?? DEFAULT_PILOTING;
    const batchResult: IPSRBatchResult = resolveAllPSRs(
      pilotingSkill,
      pendingPSRs,
      componentDamage,
      unit.pilotWounds,
      d6Roller,
      unit.unitQuirks ?? [],
      unit.abilities ?? [],
      unit.isQuad ?? false,
    );

    for (const psrResult of batchResult.results) {
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PSRResolved,
          currentState.turn,
          currentState.phase,
          {
            unitId,
            reason: psrResult.psr.reason,
            targetNumber: psrResult.targetNumber,
            roll: psrResult.roll,
            modifiers: psrResult.modifiers.reduce(
              (sum, modifier) => sum + modifier.value,
              0,
            ),
            passed: psrResult.passed,
            // Per `structure-psr-reason-as-discriminated-code` (PR E):
            // forward the canonical reasonCode the factory stamped onto
            // the source IPendingPSR.
            ...(psrResult.psr.reasonCode !== undefined
              ? { reasonCode: psrResult.psr.reasonCode }
              : {}),
          },
          unitId,
        ),
      );
    }

    if (batchResult.unitFell) {
      const currentUnit = currentState.units[unitId];
      const newPilotWounds = currentUnit.pilotWounds + 1;
      const consciousnessCheck = resolvePilotConsciousnessCheck(
        newPilotWounds,
        1,
        currentUnit.abilities ?? [],
        d6Roller,
      );
      const pilotConscious =
        newPilotWounds < LETHAL_PILOT_WOUNDS &&
        currentUnit.pilotConscious &&
        (consciousnessCheck.conscious ?? true);

      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [unitId]: {
            ...currentUnit,
            prone: true,
            pilotWounds: newPilotWounds,
            pilotConscious,
            destroyed: !pilotConscious ? true : currentUnit.destroyed,
            pendingPSRs: [],
          },
        },
      };

      // Per `denormalize-event-envelope-and-close-emission-contract-gaps`
      // (piloting-skill-rolls delta — UnitFell Carries Location and Reason):
      // pull the failing-PSR reason from batchResult; default location is
      // `'center_torso'` (canonical fall-damage location for damage-induced
      // PSR failures — PR E tightens this to a per-trigger discriminated
      // location once `PSRReasonCode` lands).
      const failedPsr = batchResult.results.find((r) => !r.passed);
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.UnitFell,
          currentState.turn,
          currentState.phase,
          {
            unitId,
            pilotDamage: 1,
            location: 'center_torso',
            ...(failedPsr ? { reason: failedPsr.psr.reason } : {}),
            // Per `structure-psr-reason-as-discriminated-code` (PR E):
            // canonical reasonCode of the failed PSR that caused the
            // fall.
            ...(failedPsr?.psr.reasonCode !== undefined
              ? { reasonCode: failedPsr.psr.reasonCode }
              : {}),
          },
          unitId,
        ),
      );

      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PilotHit,
          currentState.turn,
          currentState.phase,
          {
            unitId,
            wounds: 1,
            totalWounds: newPilotWounds,
            source: 'fall' as const,
            consciousnessCheckRequired: true,
            consciousnessCheckPassed: pilotConscious,
          },
          unitId,
        ),
      );

      if (!pilotConscious && !currentUnit.destroyed) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.UnitDestroyed,
            currentState.turn,
            currentState.phase,
            {
              unitId,
              cause: 'pilot_death' as const,
            },
          ),
        );
      }
    } else {
      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [unitId]: {
            ...currentState.units[unitId],
            pendingPSRs: [],
          },
        },
      };
    }
  }

  return currentState;
}

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
}): IGameState {
  const { state, events, gameId, random } = options;
  const { weaponsByUnit, grid, environmentalConditions } = options;
  let currentState = { ...state };

  const canEmit =
    events !== undefined && gameId !== undefined && random !== undefined;
  const d6Roller = random !== undefined ? createD6Roller(random) : undefined;

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed) {
      continue;
    }

    const weaponsFired = unit.weaponsFiredThisTurn ?? [];
    const weaponHeat = computeWeaponHeat(
      weaponsFired,
      weaponsByUnit?.get(unitId),
      unit.weaponQuirks,
    );
    const movementHeat = computeMovementHeat(unit);

    const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
    const engineHeat = componentDamage.engineHits * ENGINE_HEAT_PER_CRITICAL;
    const terrainHeatEffect = grid
      ? getGridTerrainHeatEffect(grid, unit.position)
      : 0;
    const environmentHeat = Math.max(0, terrainHeatEffect);
    const waterBonus = Math.max(0, -terrainHeatEffect);
    const environmentalModifier =
      environmentalConditions !== undefined
        ? calculateEnvironmentalHeatModifier(environmentalConditions)
        : 0;
    const heatGenerationReduction = Math.min(
      getCoolUnderFireHeatReduction(unit.abilities ?? []),
      weaponHeat + movementHeat + engineHeat + environmentHeat,
    );
    const hotDogBonus = getHotDogShutdownThresholdBonus(unit.abilities ?? []);

    const heatSinkCount = unit.heatSinks ?? BASE_HEAT_SINKS;
    const heatSinkRating = unit.heatSinkType === 'double' ? 2 : 1;
    const heatSinksLost = componentDamage.heatSinksDestroyed ?? 0;
    const baseDissipation = Math.max(
      0,
      (heatSinkCount - heatSinksLost) * heatSinkRating,
    );
    const dissipation = Math.max(
      0,
      baseDissipation +
        waterBonus +
        environmentalModifier +
        heatGenerationReduction,
    );

    const generated = weaponHeat + movementHeat + engineHeat + environmentHeat;
    const previousHeat = unit.heat;
    const newHeat = Math.max(0, previousHeat + generated - dissipation);

    if (canEmit) {
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.HeatGenerated,
          currentState.turn,
          GamePhase.Heat,
          {
            unitId,
            amount: generated,
            source:
              engineHeat > 0
                ? 'engine_hit'
                : environmentHeat > weaponHeat && environmentHeat > movementHeat
                  ? 'environment'
                  : weaponHeat >= movementHeat
                    ? 'firing'
                    : 'movement',
            newTotal: newHeat,
            previousTotal: previousHeat,
            ammoExplosionRisk: newHeat >= 19,
          },
          unitId,
        ),
      );

      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.HeatDissipated,
          currentState.turn,
          GamePhase.Heat,
          {
            unitId,
            amount: dissipation === 0 ? 0 : -dissipation,
            source: 'dissipation',
            newTotal: newHeat,
            previousTotal: previousHeat,
            breakdown: {
              baseDissipation,
              waterBonus,
              environmentalModifier,
              heatGenerationReduction,
            },
          },
          unitId,
        ),
      );

      emitHeatThresholdEvents({
        unitId,
        heat: newHeat,
        turn: currentState.turn,
        events,
        gameId,
        shutdownCheckThreshold: 14 + hotDogBonus,
      });
    }

    const startupUnit = applyRunnerStartupAttempt({
      unit,
      unitId,
      heat: newHeat,
      turn: currentState.turn,
      events: canEmit ? events : undefined,
      gameId: canEmit ? gameId : undefined,
      d6Roller: canEmit ? d6Roller : undefined,
      hotDogBonus,
    });

    let shutdownNow = startupUnit.shutdown ?? false;
    let heatPhaseUnit = startupUnit;
    const shutdownTargetNumber = getShutdownTN(newHeat, hotDogBonus);
    if (canEmit && d6Roller && (shutdownTargetNumber > 0 || newHeat >= 30)) {
      const automatic = newHeat >= 30;
      let roll = 0;
      let shutdownOccurred = automatic;
      if (!automatic) {
        const die1 = d6Roller();
        const die2 = d6Roller();
        roll = die1 + die2;
        shutdownOccurred = roll < shutdownTargetNumber;
      }
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.ShutdownCheck,
          currentState.turn,
          GamePhase.Heat,
          {
            unitId,
            heatLevel: newHeat,
            targetNumber: automatic ? Infinity : shutdownTargetNumber,
            roll,
            shutdownOccurred,
            automatic,
          },
          unitId,
        ),
      );
      if (shutdownOccurred) {
        shutdownNow = true;
        heatPhaseUnit = queueRunnerShutdownPSR({
          unit: heatPhaseUnit,
          unitId,
          turn: currentState.turn,
          events,
          gameId,
        });
      }
    }

    if (canEmit && d6Roller) {
      currentState = applyHeatInducedAmmoExplosions({
        currentState,
        unit: heatPhaseUnit,
        unitId,
        heat: newHeat,
        events,
        gameId,
        d6Roller,
        unitWeapons: weaponsByUnit?.get(unitId),
      });
      heatPhaseUnit = currentState.units[unitId];
    }

    const heatPilotUnit = applyRunnerHeatPilotDamage({
      unit: heatPhaseUnit,
      unitId,
      heat: newHeat,
      lifeSupportHits: componentDamage.lifeSupport ?? 0,
      turn: currentState.turn,
      events: canEmit ? events : undefined,
      gameId: canEmit ? gameId : undefined,
      d6Roller: canEmit ? d6Roller : undefined,
    });

    currentState = {
      ...currentState,
      units: {
        ...currentState.units,
        [unitId]: {
          ...heatPilotUnit,
          heat: newHeat,
          shutdown: shutdownNow,
        },
      },
    };
  }

  return currentState;
}
