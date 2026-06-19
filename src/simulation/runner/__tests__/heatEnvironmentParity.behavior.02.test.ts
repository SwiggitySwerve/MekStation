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
  it('applies weapon cooling quirks but does not consume local-only Cool Under Fire in heat resolution', () => {
    const interactive = resolveHeatPhase(
      withInteractiveUnit(
        createInteractiveHeatSession([createPpc('ppc-1')]),
        'player-1',
        {
          heat: 20,
          abilities: ['cool-under-fire'],
          weaponQuirks: { 'ppc-1': ['improved_cooling'] },
        },
      ),
      fixedRoller,
    );
    const interactiveDissipation = heatPayloads(
      interactive,
      GameEventType.HeatDissipated,
    )[0];

    const runnerEvents: IGameEvent[] = [];
    const runnerState = runHeatPhase({
      state: createRunnerHeatState(
        createRunnerUnit({
          heat: 20,
          abilities: ['cool-under-fire'],
          weaponQuirks: { 'ppc-1': ['improved_cooling'] },
          weaponsFiredThisTurn: ['ppc-1'],
        }),
      ),
      events: runnerEvents,
      gameId: 'heat-environment-parity-test',
      random: new SeededRandom(654),
      weaponsByUnit: new Map([['player-1', [createRunnerPpc('ppc-1')]]]),
    });
    const runnerDissipation = runnerEvents
      .filter((event) => event.type === GameEventType.HeatDissipated)
      .map((event) => event.payload as IHeatPayload)[0];

    expect(
      heatPayloads(interactive, GameEventType.HeatGenerated).filter(
        (payload) => payload.source === 'firing',
      ),
    ).toEqual([expect.objectContaining({ amount: 9 })]);
    expect(interactiveDissipation).toMatchObject({
      amount: -10,
      newTotal: 19,
      breakdown: {
        baseDissipation: 10,
        heatGenerationReduction: 0,
      },
    });
    expect(
      runnerEvents
        .filter((event) => event.type === GameEventType.HeatGenerated)
        .map((event) => event.payload as IHeatPayload),
    ).toEqual([expect.objectContaining({ amount: 9, source: 'firing' })]);
    expect(runnerDissipation).toMatchObject({
      amount: -10,
      newTotal: 19,
      breakdown: {
        baseDissipation: 10,
        heatGenerationReduction: 0,
      },
    });
    expect(runnerState.units['player-1'].heat).toBe(19);
    expect(SPA_COMBAT_SUPPORT['cool-under-fire']).toMatchObject({
      level: 'out-of-scope',
      gap: expect.stringContaining('No MegaMek source'),
    });
    expect(QUIRK_COMBAT_SUPPORT.improved_cooling).toMatchObject({
      level: 'integrated',
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'leaving local Cool Under Fire unconsumed',
      ),
    });
  });

  it('applies atmosphere and temperature heat modifiers in the interactive resolver and quick-sim runHeatPhase', () => {
    const scenarios = [
      {
        conditions: createEnvironmentalConditions({
          atmosphere: 'thin',
          temperature: 'extreme_heat',
        }),
        expectedDissipation: 6,
        expectedHeat: 4,
        expectedModifier: -4,
      },
      {
        conditions: createEnvironmentalConditions({
          temperature: 'extreme_cold',
        }),
        expectedDissipation: 12,
        expectedHeat: 0,
        expectedModifier: 2,
      },
    ];

    for (const scenario of scenarios) {
      const interactive = resolveHeatPhase(
        withInteractiveUnit(createInteractiveHeatSession(), 'player-1', {
          heat: 10,
        }),
        fixedRoller,
        {
          environmentalConditions: scenario.conditions,
        },
      );
      const interactiveDissipation = heatPayloads(
        interactive,
        GameEventType.HeatDissipated,
      )[0];

      const runnerEvents: IGameEvent[] = [];
      const runnerState = runHeatPhase({
        state: createRunnerHeatState(createRunnerUnit({ heat: 10 })),
        events: runnerEvents,
        gameId: 'heat-environment-parity-test',
        random: new SeededRandom(654),
        environmentalConditions: scenario.conditions,
      });
      const runnerDissipation = runnerEvents
        .filter((event) => event.type === GameEventType.HeatDissipated)
        .map((event) => event.payload as IHeatPayload)[0];

      expect(interactiveDissipation).toMatchObject({
        amount: -scenario.expectedDissipation,
        newTotal: scenario.expectedHeat,
        breakdown: {
          baseDissipation: 10,
          waterBonus: 0,
          environmentalModifier: scenario.expectedModifier,
        },
      });
      expect(runnerDissipation).toMatchObject({
        amount: -scenario.expectedDissipation,
        newTotal: scenario.expectedHeat,
        breakdown: {
          baseDissipation: 10,
          waterBonus: 0,
          environmentalModifier: scenario.expectedModifier,
        },
      });
      expect(runnerState.units['player-1'].heat).toBe(scenario.expectedHeat);
    }

    expect(
      RUNNER_INTERACTIVE_PARITY_SUPPORT['heat-environment-and-water'],
    ).toMatchObject({ level: 'integrated' });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.atmosphere).toMatchObject({
      level: 'integrated',
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['extreme-temperature'],
    ).toMatchObject({
      level: 'integrated',
    });
    expect(HEAT_RULE_COMBAT_SUPPORT['environmental-heat']).toMatchObject({
      level: 'integrated',
    });
  });
});
