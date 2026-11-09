import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  PSRTrigger,
  type IHexCoordinate,
  type IHexGrid,
  type IUnitGameState,
  type MovementMotiveMode,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  createStuckRecoveryPSR,
  stuckUnitIdsForRecovery,
} from '@/utils/gameplay/movement/stuckRecovery';
import {
  JUMPED_INTO_BOG_DOWN_REASON,
  planMovementTerrainEffects,
  type MovementTerrainEffect,
  type TerrainBearingMovementStep,
} from '@/utils/gameplay/movement/terrainPsrTriggers';

const A = { q: 0, r: 0 };
const B = { q: 1, r: 0 };
const C = { q: 2, r: 0 };

function grid(terrain: Readonly<Record<string, string>>): IHexGrid {
  const base = createHexGrid({ radius: 4 });
  for (const [key, tag] of Object.entries(terrain)) {
    const hex = base.hexes.get(key);
    if (hex) base.hexes.set(key, { ...hex, terrain: tag });
  }
  return base;
}

function features(...list: readonly object[]): string {
  return JSON.stringify(list);
}

function forward(
  index: number,
  from: IHexCoordinate,
  to: IHexCoordinate,
): TerrainBearingMovementStep {
  return { kind: 'forward', index, from, to };
}

function codes(effects: readonly MovementTerrainEffect[]): readonly string[] {
  return effects.map((effect) =>
    effect.kind === 'psr' ? (effect.psr.reasonCode ?? '') : `stuck`,
  );
}

function plan(options: {
  readonly terrain: Readonly<Record<string, string>>;
  readonly steps: readonly TerrainBearingMovementStep[];
  readonly movementType?: MovementType;
  readonly unitType?: string;
  readonly tonnage?: number;
  readonly isStuck?: boolean;
  readonly prone?: boolean;
  readonly movementMode?: MovementMotiveMode;
}): readonly MovementTerrainEffect[] {
  return planMovementTerrainEffects({
    grid: grid(options.terrain),
    unitId: 'm1',
    unit: {
      unitType: options.unitType ?? 'BattleMech',
      ...(options.tonnage !== undefined ? { tonnage: options.tonnage } : {}),
      ...(options.isStuck ? { isStuck: true } : {}),
      ...(options.prone ? { prone: true } : {}),
    },
    movementType: options.movementType ?? MovementType.Walk,
    ...(options.movementMode ? { movementMode: options.movementMode } : {}),
    steps: options.steps,
  });
}

function onlyPsr(effects: readonly MovementTerrainEffect[]) {
  expect(effects).toHaveLength(1);
  const [effect] = effects;
  if (effect.kind !== 'psr') throw new Error('expected a PSR effect');
  return effect.psr;
}

describe('planMovementTerrainEffects (shared movement terrain PSR producer)', () => {
  it('T-X1 water: entry modifier by depth, step-stamped source, no roll water-to-water, exit roll', () => {
    const depths = [
      [1, -1],
      [2, 0],
      [3, 1],
    ] as const;
    for (const [level, modifier] of depths) {
      const psr = onlyPsr(
        plan({
          terrain: {
            [coordToKey(B)]: features({ type: TerrainType.Water, level }),
          },
          steps: [forward(0, A, B)],
        }),
      );
      expect(psr).toEqual({
        entityId: 'm1',
        reason: 'Entering water',
        reasonCode: PSRTrigger.EnteringWater,
        additionalModifier: modifier,
        terrainLevel: level,
        triggerSource: 'movement-step:0',
      });
    }

    const water = features({ type: TerrainType.Water, level: 1 });
    expect(
      plan({
        terrain: { [coordToKey(A)]: water, [coordToKey(B)]: water },
        steps: [forward(0, A, B)],
      }),
    ).toEqual([]);
    expect(
      onlyPsr(
        plan({
          terrain: { [coordToKey(A)]: water },
          steps: [forward(3, A, B)],
        }),
      ),
    ).toMatchObject({
      reasonCode: PSRTrigger.ExitingWater,
      triggerSource: 'movement-step:3',
    });
  });

  it('T-X2 rubble: entering rubble queues a rubble PSR', () => {
    expect(
      onlyPsr(
        plan({
          terrain: { [coordToKey(B)]: 'rubble' },
          steps: [forward(1, A, B)],
        }),
      ),
    ).toMatchObject({
      reasonCode: PSRTrigger.EnteringRubble,
      additionalModifier: 0,
      triggerSource: 'movement-step:1',
    });
  });

  it('T-X3 rough: only running into rough terrain queues a PSR', () => {
    const terrain = { [coordToKey(B)]: 'rough' };
    expect(
      codes(
        plan({
          terrain,
          steps: [forward(0, A, B)],
          movementType: MovementType.Run,
        }),
      ),
    ).toEqual([PSRTrigger.RunningRoughTerrain]);
    expect(plan({ terrain, steps: [forward(0, A, B)] })).toEqual([]);
  });

  it('T-X4 ice: entering ice queues a moving-on-ice PSR', () => {
    expect(
      codes(
        plan({
          terrain: { [coordToKey(B)]: 'ice' },
          steps: [forward(0, A, B)],
        }),
      ),
    ).toEqual([PSRTrigger.MovingOnIce]);
  });

  it('T-X5 skid: a running turn on pavement scales with hexes moved before it', () => {
    const terrain = { [coordToKey(A)]: 'pavement' };
    const turnAfter = (moved: number): TerrainBearingMovementStep[] => [
      ...Array.from({ length: moved }, (_, index) => forward(index, C, C)),
      { kind: 'turn', index: moved, at: A },
    ];
    const cases = [
      [1, -1],
      [3, 0],
      [5, 1],
      [8, 2],
      [11, 4],
    ] as const;
    for (const [moved, modifier] of cases) {
      expect(
        onlyPsr(
          plan({
            terrain,
            steps: turnAfter(moved),
            movementType: MovementType.Run,
          }),
        ),
      ).toMatchObject({
        reasonCode: PSRTrigger.Skidding,
        additionalModifier: modifier,
        triggerSource: `movement-step:${moved}`,
      });
    }
    expect(plan({ terrain, steps: turnAfter(3) })).toEqual([]);
  });

  it('T-X6 swamp: ground entry rolls, quicksand fails outright, pavement and non-Meks are exempt', () => {
    expect(
      onlyPsr(
        plan({
          terrain: { [coordToKey(B)]: 'swamp' },
          steps: [forward(0, A, B)],
        }),
      ),
    ).toEqual({
      entityId: 'm1',
      reason: 'Avoid bogging down',
      reasonCode: PSRTrigger.SwampBogDown,
      additionalModifier: 0,
      terrainLevel: 1,
      triggerSource: 'movement-step:0',
    });
    expect(
      onlyPsr(
        plan({
          terrain: {
            [coordToKey(B)]: features({ type: TerrainType.Swamp, level: 2 }),
          },
          steps: [forward(0, A, B)],
        }),
      ),
    ).toMatchObject({
      terrainLevel: 2,
      fixedTargetNumber: Number.POSITIVE_INFINITY,
    });
    expect(
      plan({
        terrain: {
          [coordToKey(B)]: features(
            { type: TerrainType.Swamp, level: 1 },
            { type: TerrainType.Pavement, level: 1 },
          ),
        },
        steps: [forward(0, A, B)],
      }),
    ).toEqual([]);
    expect(
      plan({
        terrain: { [coordToKey(B)]: 'swamp' },
        steps: [forward(0, A, B)],
        unitType: 'Tank',
      }),
    ).toEqual([]);
  });

  it('T-X7 jump into swamp sticks a free BattleMech once and never rolls', () => {
    const terrain = { [coordToKey(C)]: 'swamp' };
    const steps: TerrainBearingMovementStep[] = [
      { kind: 'jump', index: 0, from: A, to: C },
    ];
    expect(plan({ terrain, steps, movementType: MovementType.Jump })).toEqual([
      {
        kind: 'stuck',
        reason: JUMPED_INTO_BOG_DOWN_REASON,
        reasonCode: PSRTrigger.SwampBogDown,
      },
    ]);
    expect(
      plan({ terrain, steps, movementType: MovementType.Jump, isStuck: true }),
    ).toEqual([]);
    expect(
      plan({
        terrain,
        steps: [...steps, { kind: 'jump', index: 1, from: A, to: C }],
        movementType: MovementType.Jump,
      }).filter((effect) => effect.kind === 'stuck'),
    ).toHaveLength(1);
  });

  it('T-X8 building collapse needs explicit tonnage above the construction factor', () => {
    const terrain = {
      [coordToKey(B)]: features({
        type: TerrainType.Building,
        level: 2,
        constructionFactor: 40,
      }),
    };
    const steps = [forward(2, A, B)];
    expect(codes(plan({ terrain, steps, tonnage: 50 }))).toEqual([
      PSRTrigger.BuildingCollapse,
    ]);
    expect(plan({ terrain, steps, tonnage: 40 })).toEqual([]);
    expect(plan({ terrain, steps })).toEqual([]);
    expect(plan({ terrain, steps, tonnage: 50, unitType: 'Tank' })).toEqual([]);
  });

  it('T-X9 effects keep step order, and per step water then entered terrain', () => {
    const terrain = {
      [coordToKey(B)]: features(
        { type: TerrainType.Water, level: 1 },
        { type: TerrainType.Rubble, level: 1 },
      ),
      [coordToKey(C)]: 'ice',
    };
    expect(
      codes(plan({ terrain, steps: [forward(0, A, B), forward(1, B, C)] })),
    ).toEqual([
      PSRTrigger.EnteringWater,
      PSRTrigger.EnteringRubble,
      PSRTrigger.ExitingWater,
      PSRTrigger.MovingOnIce,
    ]);
  });
});

describe('terrain PSR fall eligibility (MegaMek Mek.canFall and checkWaterMove)', () => {
  const water = JSON.stringify([{ type: TerrainType.Water, level: 1 }]);
  const enterWater = {
    terrain: { [coordToKey(B)]: water },
    steps: [forward(0, A, B)],
  };
  const exitWater = {
    terrain: { [coordToKey(A)]: water },
    steps: [forward(0, A, B)],
  };
  const rubble = {
    terrain: { [coordToKey(B)]: 'rubble' },
    steps: [forward(0, A, B)],
  };
  const ice = {
    terrain: { [coordToKey(B)]: 'ice' },
    steps: [forward(0, A, B)],
  };
  const skid = {
    terrain: { [coordToKey(A)]: 'pavement' },
    steps: [
      forward(0, C, C),
      forward(1, C, C),
      forward(2, C, C),
      { kind: 'turn', index: 3, at: A } as TerrainBearingMovementStep,
    ],
    movementType: MovementType.Run,
  };
  const exemptWaterModes: readonly MovementMotiveMode[] = [
    'hover',
    'vtol',
    'naval',
    'hydrofoil',
    'submarine',
    'umu',
    'biped_swim',
    'quad_swim',
    'wige',
  ];

  it('T-G1 non-walking water modes never roll water entry, and a Mek exiting water still rolls', () => {
    for (const movementMode of exemptWaterModes) {
      expect(plan({ ...enterWater, movementMode })).toEqual([]);
      expect(codes(plan({ ...exitWater, movementMode }))).toEqual([
        PSRTrigger.ExitingWater,
      ]);
    }
    expect(
      plan({ ...enterWater, unitType: 'Tank', movementMode: 'tracked' }),
    ).toEqual([]);
  });

  it('T-G2 vehicles never roll water, rubble, skid or ice', () => {
    for (const unitType of [
      'Tank',
      'SupportVehicle',
      'ProtoMech',
      'Infantry',
    ]) {
      for (const scenario of [enterWater, exitWater, rubble, ice, skid]) {
        expect(plan({ ...scenario, unitType })).toEqual([]);
      }
    }
  });

  it('T-G3 a standing BattleMech-like unit still rolls every gated trigger', () => {
    for (const unitType of ['BattleMech', 'OmniMech', 'IndustrialMech']) {
      const mover = { unitType };
      expect(codes(plan({ ...enterWater, ...mover }))).toEqual([
        PSRTrigger.EnteringWater,
      ]);
      expect(codes(plan({ ...exitWater, ...mover }))).toEqual([
        PSRTrigger.ExitingWater,
      ]);
      expect(codes(plan({ ...rubble, ...mover }))).toEqual([
        PSRTrigger.EnteringRubble,
      ]);
      expect(codes(plan({ ...ice, ...mover }))).toEqual([
        PSRTrigger.MovingOnIce,
      ]);
      expect(codes(plan({ ...skid, ...mover }))).toEqual([PSRTrigger.Skidding]);
      expect(
        codes(plan({ ...enterWater, ...mover, movementMode: 'walk' })),
      ).toEqual([PSRTrigger.EnteringWater]);
    }
  });

  it('T-G4 a prone BattleMech makes none of the fall rolls', () => {
    for (const scenario of [enterWater, exitWater, rubble, ice, skid]) {
      expect(plan({ ...scenario, prone: true })).toEqual([]);
    }
  });
});

describe('stuck recovery helpers (shared movement-start recovery roll)', () => {
  function unit(overrides: Partial<IUnitGameState> = {}): IUnitGameState {
    return {
      id: 'm1',
      side: GameSide.Player,
      position: A,
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
      isStuck: true,
      ...overrides,
    };
  }

  it('T-X10 only stuck units that can act roll, in roster order', () => {
    expect(
      stuckUnitIdsForRecovery({
        a: unit(),
        free: unit({ isStuck: false }),
        dead: unit({ destroyed: true }),
        out: unit({ pilotConscious: false }),
        off: unit({ shutdown: true }),
        gone: unit({ hasRetreated: true }),
        ejected: unit({ hasEjected: true }),
        b: unit(),
      }),
    ).toEqual(['a', 'b']);
  });

  it('T-X11 recovery modifier: +1 swamp, +4 quicksand, nothing outside a swamp', () => {
    const cases = [
      ['swamp', 1, 1],
      [features({ type: TerrainType.Swamp, level: 2 }), 4, 2],
      ['clear', 0, undefined],
    ] as const;
    for (const [tag, modifier, level] of cases) {
      const psr = createStuckRecoveryPSR(
        grid({ [coordToKey(A)]: tag }),
        'm1',
        unit(),
      );
      expect(psr).toEqual({
        entityId: 'm1',
        reason: 'Break free of swamp',
        reasonCode: PSRTrigger.SwampUnstuck,
        additionalModifier: modifier,
        ...(level !== undefined ? { terrainLevel: level } : {}),
        triggerSource: PSRTrigger.SwampUnstuck,
      });
    }
  });
});
