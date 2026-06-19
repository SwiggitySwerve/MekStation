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
  it('applies occupied fire heat in the interactive resolver and quick-sim runHeatPhase', () => {
    const interactive = resolveHeatPhase(
      createInteractiveHeatSession(),
      fixedRoller,
      {
        getEnvironmentHeatEffect: (unitId) =>
          unitId === 'player-1'
            ? getTerrainHeatEffect([{ type: TerrainType.Fire, level: 1 }])
            : 0,
      },
    );

    const runnerEvents: IGameEvent[] = [];
    runHeatPhase({
      state: createRunnerHeatState(createRunnerUnit()),
      events: runnerEvents,
      gameId: 'heat-environment-parity-test',
      random: new SeededRandom(123),
      grid: createRunnerTerrainGrid(TerrainType.Fire),
    });

    expect(
      heatPayloads(interactive, GameEventType.HeatGenerated).filter(
        (payload) => payload.source === 'environment',
      ),
    ).toEqual([expect.objectContaining({ amount: 5 })]);
    expect(
      runnerEvents
        .filter((event) => event.type === GameEventType.HeatGenerated)
        .map((event) => event.payload as IHeatPayload),
    ).toEqual([expect.objectContaining({ amount: 5, source: 'environment' })]);
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['fire-heat']).toMatchObject({
      level: 'integrated',
    });
    expect(HEAT_RULE_COMBAT_SUPPORT['fire-heat']).toMatchObject({
      level: 'integrated',
    });
  });

  it('applies water cooling in the interactive resolver and quick-sim runHeatPhase', () => {
    const interactive = resolveHeatPhase(
      createInteractiveHeatSession([createPpc('ppc-1'), createPpc('ppc-2')]),
      fixedRoller,
      {
        getWaterDepth: (unitId) => (unitId === 'player-1' ? 1 : 0),
      },
    );
    const interactiveDissipation = heatPayloads(
      interactive,
      GameEventType.HeatDissipated,
    )[0];

    const runnerEvents: IGameEvent[] = [];
    const runnerState = runHeatPhase({
      state: createRunnerHeatState(createRunnerUnit({ heat: 20 })),
      events: runnerEvents,
      gameId: 'heat-environment-parity-test',
      random: new SeededRandom(456),
      grid: createRunnerTerrainGrid(`${TerrainType.Water}:1`),
    });
    const runnerDissipation = runnerEvents
      .filter((event) => event.type === GameEventType.HeatDissipated)
      .map((event) => event.payload as IHeatPayload)[0];

    expect(interactiveDissipation).toMatchObject({
      amount: -12,
      newTotal: 8,
      breakdown: { baseDissipation: 10, waterBonus: 2 },
    });
    expect(runnerDissipation).toMatchObject({
      amount: -12,
      newTotal: 8,
      breakdown: { baseDissipation: 10, waterBonus: 2 },
    });
    expect(runnerState.units['player-1'].heat).toBe(8);
    expect(
      RUNNER_INTERACTIVE_PARITY_SUPPORT['heat-environment-and-water'],
    ).toMatchObject({ level: 'integrated' });
    expect(
      RUNNER_INTERACTIVE_PARITY_SUPPORT['heat-dissipation-event-payload'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('negative HeatDissipated.amount'),
    });
    expect(HEAT_RULE_COMBAT_SUPPORT['water-cooling']).toMatchObject({
      level: 'integrated',
    });
  });

  it('applies Hot Dog shutdown target-number relief in the interactive resolver and quick-sim runHeatPhase', () => {
    const hotDogInteractiveBelow = resolveHeatPhase(
      withInteractiveUnit(createInteractiveHeatSession(), 'player-1', {
        heat: 23,
        abilities: ['hot-dog'],
      }),
      fixedRoller,
    );
    const hotDogInteractiveAtThreshold = resolveHeatPhase(
      withInteractiveUnit(createInteractiveHeatSession(), 'player-1', {
        heat: 24,
        abilities: ['hot-dog'],
      }),
      fixedRoller,
    );

    const runnerBelowEvents: IGameEvent[] = [];
    runHeatPhase({
      state: createRunnerHeatState(
        createRunnerUnit({ heat: 23, abilities: ['hot-dog'] }),
      ),
      events: runnerBelowEvents,
      gameId: 'heat-environment-parity-test',
      random: new SeededRandom(321),
    });

    const runnerAtEvents: IGameEvent[] = [];
    runHeatPhase({
      state: createRunnerHeatState(
        createRunnerUnit({ heat: 24, abilities: ['hot-dog'] }),
      ),
      events: runnerAtEvents,
      gameId: 'heat-environment-parity-test',
      random: new SeededRandom(321),
    });

    expect(
      hotDogInteractiveBelow.events.some(
        (event) => event.type === GameEventType.ShutdownCheck,
      ),
    ).toBe(false);
    expect(
      runnerBelowEvents.some(
        (event) => event.type === GameEventType.ShutdownCheck,
      ),
    ).toBe(false);
    expect(
      runnerBelowEvents
        .filter((event) => event.type === GameEventType.HeatEffectApplied)
        .map((event) => event.payload as IHeatEffectAppliedPayload)
        .some((payload) => payload.effect === 'shutdown_check'),
    ).toBe(false);

    const interactiveShutdown = hotDogInteractiveAtThreshold.events.find(
      (event) => event.type === GameEventType.ShutdownCheck,
    );
    const runnerShutdown = runnerAtEvents.find(
      (event) => event.type === GameEventType.ShutdownCheck,
    );

    expect(interactiveShutdown?.payload as IShutdownCheckPayload).toMatchObject(
      {
        unitId: 'player-1',
        heatLevel: 14,
        targetNumber: 3,
      },
    );
    expect(runnerShutdown?.payload as IShutdownCheckPayload).toMatchObject({
      unitId: 'player-1',
      heatLevel: 14,
      targetNumber: 3,
    });
    expect(
      runnerAtEvents
        .filter((event) => event.type === GameEventType.HeatEffectApplied)
        .map((event) => event.payload as IHeatEffectAppliedPayload),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          threshold: 14,
          effect: 'shutdown_check',
        }),
      ]),
    );
    expect(SPA_COMBAT_SUPPORT['hot-dog']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('opt-in MaxTech critical-damage'),
    });
  });
});
