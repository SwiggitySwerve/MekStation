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
  it('applies optional MaxTech heat pilot wounds and Hot Dog relief in both heat resolvers', () => {
    const interactiveBase = resolveHeatPhase(
      withInteractiveUnit(createInteractiveHeatSession(), 'player-1', {
        heat: 42,
      }),
      rollSeven,
      { maxTechHeatScale: true },
    );
    const interactiveHotDog = resolveHeatPhase(
      withInteractiveUnit(createInteractiveHeatSession(), 'player-1', {
        heat: 42,
        abilities: ['hot_dog'],
      }),
      rollSeven,
      { maxTechHeatScale: true },
    );
    const interactiveBasePilotHits = interactiveBase.events.filter(
      (event) =>
        event.type === GameEventType.PilotHit &&
        event.actorId === 'player-1' &&
        event.phase === GamePhase.Heat,
    );
    const interactiveHotDogPilotHits = interactiveHotDog.events.filter(
      (event) =>
        event.type === GameEventType.PilotHit &&
        event.actorId === 'player-1' &&
        event.phase === GamePhase.Heat,
    );

    const runnerBaseEvents: IGameEvent[] = [];
    const runnerHotDogEvents: IGameEvent[] = [];
    const runnerBase = runHeatPhase({
      state: createRunnerHeatState(
        createRunnerUnit({
          heat: 32,
          heatSinks: 0,
        }),
      ),
      events: runnerBaseEvents,
      gameId: 'heat-environment-parity-test',
      random: new SeededRandom(2),
      maxTechHeatScale: true,
    });
    const runnerHotDog = runHeatPhase({
      state: createRunnerHeatState(
        createRunnerUnit({
          heat: 32,
          heatSinks: 0,
          abilities: ['hot_dog'],
        }),
      ),
      events: runnerHotDogEvents,
      gameId: 'heat-environment-parity-test',
      random: new SeededRandom(2),
      maxTechHeatScale: true,
    });
    const runnerBasePilotHits = runnerBaseEvents.filter(
      (event) =>
        event.type === GameEventType.PilotHit &&
        event.actorId === 'player-1' &&
        event.phase === GamePhase.Heat,
    );
    const runnerHotDogPilotHits = runnerHotDogEvents.filter(
      (event) =>
        event.type === GameEventType.PilotHit &&
        event.actorId === 'player-1' &&
        event.phase === GamePhase.Heat,
    );

    expect(interactiveBasePilotHits).toHaveLength(1);
    expect(
      interactiveBasePilotHits[0].payload as IPilotHitPayload,
    ).toMatchObject({
      unitId: 'player-1',
      wounds: 1,
      totalWounds: 1,
      source: 'heat',
    });
    expect(interactiveBase.currentState.units['player-1'].pilotWounds).toBe(1);
    expect(interactiveHotDogPilotHits).toHaveLength(0);
    expect(interactiveHotDog.currentState.units['player-1'].pilotWounds).toBe(
      0,
    );

    expect(runnerBasePilotHits).toHaveLength(1);
    expect(runnerBasePilotHits[0].payload as IPilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 1,
      totalWounds: 1,
      source: 'heat',
    });
    expect(runnerBase.units['player-1'].pilotWounds).toBe(1);
    expect(runnerHotDogPilotHits).toHaveLength(0);
    expect(runnerHotDog.units['player-1'].pilotWounds).toBe(0);
  });

  it('routes optional MaxTech heat critical damage in both heat resolvers', () => {
    const interactiveManifests = new Map<string, CriticalSlotManifest>();
    const interactive = resolveHeatPhase(
      withInteractiveUnit(createInteractiveHeatSession(), 'player-1', {
        heat: 46,
      }),
      createScriptedDiceRoller([
        [6, 6],
        [3, 3],
        [1, 1],
      ]),
      {
        maxTechHeatScale: true,
        maxTechCriticalLocationRoller: () => 2,
        criticalManifestsByUnit: interactiveManifests,
      },
    );

    const runnerEvents: IGameEvent[] = [];
    const runnerD6 = [6, 6, 3, 3, 1].map((roll) => (roll - 1) / 6 + 0.001);
    const runnerState = runHeatPhase({
      state: createRunnerHeatState(
        createRunnerUnit({
          heat: 36,
          heatSinks: 0,
        }),
      ),
      events: runnerEvents,
      gameId: 'heat-environment-parity-test',
      random: {
        next: () => runnerD6.shift() ?? 0,
        nextInt: () => 2,
      } as unknown as SeededRandom,
      maxTechHeatScale: true,
      manifestsByUnit: new Map<string, CriticalSlotManifest>(),
    });

    const interactiveCritical = interactive.events.find(
      (event) =>
        event.type === GameEventType.CriticalHitResolved &&
        event.phase === GamePhase.Heat,
    );
    const runnerCritical = runnerEvents.find(
      (event) =>
        event.type === GameEventType.CriticalHitResolved &&
        event.phase === GamePhase.Heat,
    );

    expect(interactiveCritical).toMatchObject({
      payload: expect.objectContaining({
        unitId: 'player-1',
        location: 'right_torso',
        componentType: 'engine',
      }),
    });
    expect(runnerCritical).toMatchObject({
      payload: expect.objectContaining({
        unitId: 'player-1',
        location: 'right_torso',
        componentType: 'engine',
      }),
    });
    expect(
      interactive.currentState.units['player-1'].componentDamage?.engineHits,
    ).toBe(1);
    expect(runnerState.units['player-1'].componentDamage?.engineHits).toBe(1);
  });
});
