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

const fixedD6 = (): number => 6;
const fixedRoller: DiceRoller = () => ({
  dice: [6, 6],
  total: 12,
  isSnakeEyes: false,
  isBoxcars: true,
});
const rollSeven: DiceRoller = () => ({
  dice: [3, 4],
  total: 7,
  isSnakeEyes: false,
  isBoxcars: false,
});

function createScriptedDiceRoller(
  rolls: readonly (readonly [number, number])[],
): DiceRoller {
  const queuedRolls = [...rolls];
  return () => {
    const dice = queuedRolls.shift() ?? [6, 6];
    const total = dice[0] + dice[1];
    return {
      dice,
      total,
      isSnakeEyes: total === 2,
      isBoxcars: total === 12,
    };
  };
}

function createConfig(): IGameConfig {
  return {
    mapRadius: 5,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function createGameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: `${id}-ref`,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
    heatSinks: 10,
    heatSinkType: 'single',
  };
}

function createPpc(id: string): IWeaponAttack {
  return {
    weaponId: id,
    weaponName: 'PPC',
    damage: 10,
    heat: 10,
    category: WeaponCategory.ENERGY,
    minRange: 3,
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    isCluster: false,
  };
}

function createRunnerPpc(id: string): IWeapon {
  return {
    id,
    name: 'PPC',
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    damage: 10,
    heat: 10,
    minRange: 3,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function createInteractiveHeatSession(
  playerWeapons: readonly IWeaponAttack[] = [],
): IGameSession {
  let session = createGameSession(createConfig(), [
    createGameUnit('player-1', GameSide.Player),
    createGameUnit('opponent-1', GameSide.Opponent),
  ]);

  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, fixedD6);
  session = advancePhase(session); // Movement
  session = advancePhase(session); // WeaponAttack

  if (playerWeapons.length > 0) {
    session = declareAttack(
      session,
      'player-1',
      'opponent-1',
      playerWeapons,
      6,
      RangeBracket.Short,
    );
    session = lockAttack(session, 'player-1');
  }

  session = advancePhase(session); // PhysicalAttack
  session = advancePhase(session); // Heat
  return session;
}

function createRunnerUnit(
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id: 'player-1',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {},
    structure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    pendingPSRs: [],
    weaponsFiredThisTurn: [],
    gunnery: 4,
    piloting: 5,
    heatSinks: 10,
    heatSinkType: 'single',
    ...overrides,
  };
}

function createRunnerHeatState(unit: IUnitGameState): IGameState {
  return {
    gameId: 'heat-environment-parity-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Heat,
    activationIndex: 0,
    units: { [unit.id]: unit },
    turnEvents: [],
  };
}

function createRunnerTerrainGrid(terrain: string): IHexGrid {
  const grid = createMinimalGrid(3);
  const hex = grid.hexes.get('0,0');
  if (!hex) return grid;

  const hexes = new Map(grid.hexes);
  hexes.set('0,0', { ...hex, terrain });
  return { ...grid, hexes };
}

function withInteractiveUnit(
  session: IGameSession,
  unitId: string,
  overrides: Partial<IUnitGameState>,
): IGameSession {
  return {
    ...session,
    currentState: {
      ...session.currentState,
      units: {
        ...session.currentState.units,
        [unitId]: {
          ...session.currentState.units[unitId],
          ...overrides,
        },
      },
    },
  };
}

function heatPayloads(
  session: IGameSession,
  type: GameEventType,
  unitId = 'player-1',
): readonly IHeatPayload[] {
  return session.events
    .filter((event) => event.type === type && event.actorId === unitId)
    .map((event) => event.payload as IHeatPayload);
}

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
      level: 'helper-only',
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
