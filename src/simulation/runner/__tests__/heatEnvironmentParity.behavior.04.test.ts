/**
 * Behavior-class coverage for heat environment parity boundaries.
 *
 * The event-session heat resolver accepts water/fire providers, and the
 * quick-sim runner heat phase consumes occupied grid terrain for water/fire
 * effects. These tests keep the remaining generic environment boundary explicit
 * so the validation catalog does not overstate runner parity.
 */

import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';
import type { DiceRoller } from '@/utils/gameplay/diceTypes';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IGameConfig,
  IGameEvent,
  IGameSession,
  IGameState,
  IGameUnit,
  IHexGrid,
  IHeatEffectAppliedPayload,
  IHeatPayload,
  IPilotHitPayload,
  IShutdownCheckPayload,
  IUnitGameState,
  IWeaponAttack,
  LockState,
  MovementType,
  RangeBracket,
  WeaponCategory,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';
import {
  advancePhase,
  createGameSession,
  declareAttack,
  lockAttack,
  resolveHeatPhase,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';
import { getTerrainHeatEffect } from '@/utils/gameplay/heat';

import type { IWeapon } from '../../ai/types';

import { SeededRandom } from '../../core/SeededRandom';
import { PILOT_DAMAGE_COMBAT_SUPPORT } from '../CombatDamageSupport';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { RUNNER_INTERACTIVE_PARITY_SUPPORT } from '../CombatParitySupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import {
  HEAT_RULE_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import { runHeatPhase } from '../phases/postCombat';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import { createMinimalGrid } from '../SimulationRunnerSupport';
import {
  fixedD6,
  fixedRoller,
  rollSeven,
  createScriptedDiceRoller,
  createConfig,
  createGameUnit,
  createPpc,
  createRunnerPpc,
  createInteractiveHeatSession,
  createRunnerUnit,
  createRunnerHeatState,
  createRunnerTerrainGrid,
  withInteractiveUnit,
  heatPayloads,
} from './heatEnvironmentParity.behavior.test-helpers';

describe('heat environment runner/interactive parity boundaries', () => {
  it('applies heat pilot wounds in the interactive resolver and quick-sim runHeatPhase', () => {
    const heatDamagedComponentState = {
      ...DEFAULT_COMPONENT_DAMAGE,
      lifeSupport: 1,
    };
    const interactive = resolveHeatPhase(
      withInteractiveUnit(createInteractiveHeatSession(), 'player-1', {
        heat: 35,
        componentDamage: heatDamagedComponentState,
      }),
      fixedRoller,
    );
    const interactivePilotHits = interactive.events.filter(
      (event) =>
        event.type === GameEventType.PilotHit &&
        event.actorId === 'player-1' &&
        event.phase === GamePhase.Heat,
    );

    const runnerEvents: IGameEvent[] = [];
    const runnerState = runHeatPhase({
      state: createRunnerHeatState(
        createRunnerUnit({
          heat: 35,
          componentDamage: heatDamagedComponentState,
        }),
      ),
      events: runnerEvents,
      gameId: 'heat-environment-parity-test',
      random: new SeededRandom(789),
    });
    const runnerHeatPilotEffects = runnerEvents
      .filter((event) => event.type === GameEventType.HeatEffectApplied)
      .map((event) => event.payload as IHeatEffectAppliedPayload)
      .filter((payload) => payload.effect === 'pilot_damage');
    const runnerPilotHits = runnerEvents.filter(
      (event) =>
        event.type === GameEventType.PilotHit &&
        event.actorId === 'player-1' &&
        event.phase === GamePhase.Heat,
    );

    expect(interactivePilotHits).toHaveLength(1);
    expect(interactivePilotHits[0].payload as IPilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 2,
      totalWounds: 2,
      source: 'heat',
    });
    expect(interactive.currentState.units['player-1'].pilotWounds).toBe(2);

    expect(runnerHeatPilotEffects.map((payload) => payload.threshold)).toEqual([
      15, 25,
    ]);
    expect(runnerPilotHits).toHaveLength(1);
    expect(runnerPilotHits[0].payload as IPilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 2,
      totalWounds: 2,
      source: 'heat',
    });
    expect(runnerState.units['player-1'].pilotWounds).toBe(2);
    expect(
      RUNNER_INTERACTIVE_PARITY_SUPPORT['heat-pilot-damage'],
    ).toMatchObject({
      level: 'integrated',
    });
    expect(HEAT_RULE_COMBAT_SUPPORT['pilot-heat-damage']).toMatchObject({
      level: 'integrated',
    });
    expect(PILOT_DAMAGE_COMBAT_SUPPORT['heat-pilot-damage']).toMatchObject({
      level: 'integrated',
    });
  });
});
