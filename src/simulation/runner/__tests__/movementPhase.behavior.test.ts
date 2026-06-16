import type {
  IAttackEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from '@/simulation/ai/AIPlayerEvents';
import type { IMovementEvent } from '@/simulation/ai/AIPlayerEvents';
import type { IAIPlayer, IAIUnitState } from '@/simulation/ai/IAIPlayer';
import type {
  IEnvironmentalConditions,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  LightCondition,
} from '@/types/gameplay';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  PSRTrigger,
  type IDamageAppliedPayload,
  type IGameState,
  type IMinefieldChangedPayload,
  type IMovementDeclaredPayload,
  type IMovementInvalidPayload,
  type IPSRResolvedPayload,
  type IPSRTriggeredPayload,
  type IRepresentedMinefieldState,
  type ISwarmDismountedPayload,
  type IUnitStoodPayload,
} from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { UnitType } from '@/types/unit';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';
import { applyEvent } from '@/utils/gameplay/gameState';
import { coordToKey } from '@/utils/gameplay/hexMath';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { COMBAT_COMMAND_ACTION_SUPPORT } from '../CombatActionSupport';
import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from '../CombatCanonicalSpaSupport';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { RUNNER_PSR_TRIGGER_COMBAT_SUPPORT } from '../CombatLifecycleSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import {
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import { TERRAIN_TYPE_PSR_COMBAT_SUPPORT } from '../CombatTerrainEnvironmentSupport';
import {
  applyRunnerMinefieldClearing,
  applyRunnerMinefieldCommandDetonation,
  applyRunnerMinefieldDetection,
  applyRunnerMinefieldManualDetonation,
  applyRunnerMinefieldReset,
} from '../phases/minefieldActions';
import { runMovementPhase } from '../phases/movement';
import { applyMovementMinefieldEffects } from '../phases/movementMines';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import { resetTurnState } from '../SimulationRunnerState';
import {
  createMinimalGrid,
  createMinimalUnitState,
} from '../SimulationRunnerSupport';

class ScriptedMovePlayer implements IAIPlayer {
  constructor(
    private readonly unitId: string,
    private readonly target: IHexCoordinate,
    private readonly movementType = MovementType.Walk,
    private readonly facing = Facing.North,
  ) {}

  evaluateRetreat(): IRetreatEvent | null {
    return null;
  }

  playMovementPhase(unit: IAIUnitState): IMovementEvent | null {
    if (unit.unitId !== this.unitId) return null;
    return {
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: unit.unitId,
        from: unit.position,
        to: this.target,
        facing: this.facing,
        movementType: this.movementType,
        mpUsed: 1,
        heatGenerated: 0,
      },
    };
  }

  playAttackPhase(): IAttackEvent | null {
    return null;
  }

  playPhysicalAttackPhase(): IPhysicalAttackEvent | null {
    return null;
  }
}

class ScriptedGoPronePlayer implements IAIPlayer {
  constructor(private readonly unitId: string) {}

  evaluateRetreat(): IRetreatEvent | null {
    return null;
  }

  playMovementPhase(unit: IAIUnitState): IMovementEvent | null {
    if (unit.unitId !== this.unitId) return null;
    return {
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: unit.unitId,
        from: unit.position,
        to: unit.position,
        facing: unit.facing,
        movementType: MovementType.Stationary,
        mpUsed: 1,
        heatGenerated: 0,
        steps: [
          {
            kind: 'goProne',
            index: 0,
            at: { q: unit.position.q, r: unit.position.r },
            mpCost: 1,
          },
        ],
      },
    };
  }

  playAttackPhase(): IAttackEvent | null {
    return null;
  }

  playPhysicalAttackPhase(): IPhysicalAttackEvent | null {
    return null;
  }
}

function fixedRandom(nextValue: number): SeededRandom {
  return { next: () => nextValue } as unknown as SeededRandom;
}

function scriptedD6Roller(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    if (index >= values.length) {
      throw new Error(`scripted d6 exhausted after ${values.length} rolls`);
    }
    return values[index++];
  };
}

function setTerrain(
  grid: IHexGrid,
  coord: IHexCoordinate,
  terrain: TerrainType,
): IHexGrid {
  const key = `${coord.q},${coord.r}`;
  const existing = grid.hexes.get(key);
  if (!existing) throw new Error(`Missing hex ${key}`);

  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...existing, terrain });
  return { ...grid, hexes };
}

function setElevation(
  grid: IHexGrid,
  coord: IHexCoordinate,
  elevation: number,
): IHexGrid {
  const key = `${coord.q},${coord.r}`;
  const existing = grid.hexes.get(key);
  if (!existing) throw new Error(`Missing hex ${key}`);

  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...existing, elevation });
  return { ...grid, hexes };
}

function setTerrainFeatures(
  grid: IHexGrid,
  coord: IHexCoordinate,
  terrainFeatures: readonly ITerrainFeature[],
): IHexGrid {
  const key = `${coord.q},${coord.r}`;
  const existing = grid.hexes.get(key);
  if (!existing) throw new Error(`Missing hex ${key}`);

  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...existing, terrain: JSON.stringify(terrainFeatures) });
  return { ...grid, hexes };
}

function setOccupant(
  grid: IHexGrid,
  coord: IHexCoordinate,
  occupantId: string,
): IHexGrid {
  const key = `${coord.q},${coord.r}`;
  const existing = grid.hexes.get(key);
  if (!existing) throw new Error(`Missing hex ${key}`);

  const hexes = new Map(grid.hexes);
  hexes.set(key, { ...existing, occupantId });
  return { ...grid, hexes };
}

function runScriptedMove(
  grid: IHexGrid,
  target: IHexCoordinate,
  unitOverrides: Partial<ReturnType<typeof createMinimalUnitState>> = {},
  options: {
    readonly movementType?: MovementType;
    readonly facing?: Facing;
    readonly capability?: IMovementCapability;
    readonly environmentalConditions?: IEnvironmentalConditions;
    readonly optionalRules?: readonly string[];
    readonly random?: SeededRandom;
  } = {},
) {
  const defaultFacing = facingFromOriginTo(target);
  const unit = {
    ...createMinimalUnitState('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    }),
    facing: defaultFacing,
    secondaryFacing: defaultFacing,
    ...unitOverrides,
  };
  const state = {
    gameId: 'runner-movement-validation',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': unit,
    },
    turnEvents: [],
  };
  const events: Parameters<typeof runMovementPhase>[0]['events'] = [];
  const violations: Parameters<typeof runMovementPhase>[0]['violations'] = [];

  const next = runMovementPhase({
    state,
    botPlayer: new ScriptedMovePlayer(
      'player-1',
      target,
      options.movementType,
      options.facing ?? unit.facing,
    ),
    grid,
    environmentalConditions: options.environmentalConditions,
    optionalRules: options.optionalRules,
    ...(options.capability
      ? {
          movementCapabilitiesByUnit: new Map([
            ['player-1', options.capability],
          ]),
        }
      : {}),
    invariantRunner: new InvariantRunner(),
    violations,
    events,
    gameId: state.gameId,
    random: options.random,
  });

  return { next, events };
}

function facingFromOriginTo(target: IHexCoordinate): Facing {
  const distance = Math.max(
    Math.abs(target.q),
    Math.abs(target.r),
    Math.abs(target.q + target.r),
  );
  if (distance === 0) return Facing.North;

  const step = {
    q: target.q / distance,
    r: target.r / distance,
  };
  if (step.q === 0 && step.r === -1) return Facing.North;
  if (step.q === 1 && step.r === -1) return Facing.Northeast;
  if (step.q === 1 && step.r === 0) return Facing.Southeast;
  if (step.q === 0 && step.r === 1) return Facing.South;
  if (step.q === -1 && step.r === 1) return Facing.Southwest;
  if (step.q === -1 && step.r === 0) return Facing.Northwest;
  return Facing.North;
}

function psrPayloads(
  events: readonly Parameters<typeof runMovementPhase>[0]['events'][number][],
): readonly IPSRTriggeredPayload[] {
  return events
    .filter((event) => event.type === GameEventType.PSRTriggered)
    .map((event) => event.payload as IPSRTriggeredPayload);
}

function expectMovementEnhancementPsrBeforeMovementCommit(
  events: readonly Parameters<typeof runMovementPhase>[0]['events'][number][],
  reasonCode: PSRTrigger.MASCFailure | PSRTrigger.SuperchargerFailure,
): void {
  const psrIndex = events.findIndex(
    (event) =>
      event.type === GameEventType.PSRTriggered &&
      (event.payload as IPSRTriggeredPayload).reasonCode === reasonCode,
  );
  const movementIndex = events.findIndex(
    (event) => event.type === GameEventType.MovementDeclared,
  );

  expect(psrIndex).toBeGreaterThanOrEqual(0);
  expect(movementIndex).toBeGreaterThanOrEqual(0);
  expect(psrIndex).toBeLessThan(movementIndex);
}

function expectSingleMovementInvalid(
  events: readonly Parameters<typeof runMovementPhase>[0]['events'][number][],
  reason: IMovementInvalidPayload['reason'],
): void {
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    type: GameEventType.MovementInvalid,
    payload: {
      unitId: 'player-1',
      reason,
    },
  });
}

describe('runMovementPhase movement validation parity', () => {
  it('rejects invalid ground movement before committing the bot payload', () => {
    const target = { q: 1, r: 0 };
    const grid = setElevation(createMinimalGrid(3), target, 3);

    const { next, events } = runScriptedMove(grid, target);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: GameEventType.MovementInvalid,
      payload: {
        unitId: 'player-1',
        to: target,
        reason: 'TerrainBlocked',
      },
    });
    expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
    expect(next.units['player-1'].movementThisTurn).toBe(
      MovementType.Stationary,
    );
  });

  it('replaces bot-reported MP and heat with authoritative movement validation', () => {
    const target = { q: 1, r: 0 };
    const grid = setTerrain(
      createMinimalGrid(3),
      target,
      TerrainType.LightWoods,
    );

    const { next, events } = runScriptedMove(grid, target);
    const payload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'player-1',
      to: target,
      mpUsed: 2,
      heatGenerated: 1,
      hexesMoved: 1,
    });
    expect(next.units['player-1'].position).toEqual(target);
    expect(next.units['player-1'].hexesMovedThisTurn).toBe(1);
    expect(next.units['player-1'].heat).toBe(0);
  });

  it('commits Maneuvering Ace biped lateral shifts through movement validation and event steps', () => {
    const target = { q: 1, r: -1 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(3),
      target,
      {
        facing: Facing.North,
        secondaryFacing: Facing.North,
        abilities: ['maneuvering_ace'],
      },
      {
        facing: Facing.North,
        capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
      },
    );
    const payload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'player-1',
      to: target,
      facing: Facing.North,
      movementType: MovementType.Walk,
      mpUsed: 2,
      hexesMoved: 1,
      straightHexes: 1,
      turningMpCost: 0,
    });
    expect(payload?.steps).toEqual([
      expect.objectContaining({
        kind: 'lateral',
        direction: 'right',
        from: { q: 0, r: 0 },
        to: target,
        mpCost: 2,
      }),
    ]);
    expect(next.units['player-1']).toMatchObject({
      position: target,
      facing: Facing.North,
      movementThisTurn: MovementType.Walk,
      hexesMovedThisTurn: 1,
    });
    expect(psrPayloads(events)).not.toContainEqual(
      expect.objectContaining({
        reasonCode: PSRTrigger.ControlledSideslip,
      }),
    );
  });

  it('queues controlled-sideslip PSRs for represented running lateral movement', () => {
    const target = { q: 1, r: -1 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(3),
      target,
      {
        facing: Facing.North,
        secondaryFacing: Facing.North,
        abilities: ['maneuvering_ace'],
      },
      {
        movementType: MovementType.Run,
        facing: Facing.North,
        capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
      },
    );

    expect(next.units['player-1'].pendingPSRs).toEqual([
      expect.objectContaining({
        entityId: 'player-1',
        reason: 'Controlled sideslip',
        reasonCode: PSRTrigger.ControlledSideslip,
        additionalModifier: -1,
        triggerSource: 'movement-step:0',
      }),
    ]);
    expect(psrPayloads(events)).toEqual([
      expect.objectContaining({
        unitId: 'player-1',
        reason: 'Controlled sideslip',
        reasonCode: PSRTrigger.ControlledSideslip,
        additionalModifier: -1,
        triggerSource: 'movement-step:0',
      }),
    ]);
  });

  it('queues one flanking-and-turning PSR for represented BattleMech run movement that turns after moving', () => {
    const target = { q: 1, r: -2 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(4),
      target,
      {
        abilities: ['maneuvering_ace'],
        facing: Facing.North,
        secondaryFacing: Facing.North,
      },
      {
        movementType: MovementType.Run,
        facing: Facing.Northeast,
        capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
      },
    );
    const movementPayload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expect(movementPayload).toMatchObject({
      unitId: 'player-1',
      to: target,
      facing: Facing.Northeast,
      movementType: MovementType.Run,
      mpUsed: 3,
      hexesMoved: 2,
      straightHexes: 2,
      turningMpCost: 1,
    });
    expect(movementPayload?.steps).toEqual([
      expect.objectContaining({
        kind: 'forward',
        index: 0,
        from: { q: 0, r: 0 },
        to: { q: 0, r: -1 },
      }),
      expect.objectContaining({
        kind: 'turn',
        index: 1,
        at: { q: 0, r: -1 },
        fromFacing: Facing.North,
        toFacing: Facing.Northeast,
      }),
      expect.objectContaining({
        kind: 'forward',
        index: 2,
        from: { q: 0, r: -1 },
        to: target,
      }),
    ]);
    expect(next.units['player-1'].pendingPSRs).toEqual([
      expect.objectContaining({
        entityId: 'player-1',
        reason: 'Flanking and turning',
        reasonCode: PSRTrigger.FlankingAndTurning,
        additionalModifier: 0,
        triggerSource: 'movement-step:2',
      }),
    ]);
    expect(psrPayloads(events)).toEqual([
      expect.objectContaining({
        unitId: 'player-1',
        reason: 'Flanking and turning',
        reasonCode: PSRTrigger.FlankingAndTurning,
        additionalModifier: 0,
        triggerSource: 'movement-step:2',
      }),
    ]);
  });

  it.each([
    [
      'walking movement',
      MovementType.Walk,
      { q: 1, r: -2 },
      Facing.Northeast,
      {},
      { walkMP: 3, runMP: 4, jumpMP: 0 },
    ],
    [
      'straight running movement',
      MovementType.Run,
      { q: 2, r: 0 },
      Facing.Southeast,
      {},
      { walkMP: 2, runMP: 3, jumpMP: 0 },
    ],
    [
      'ProtoMech running movement',
      MovementType.Run,
      { q: 1, r: -2 },
      Facing.Northeast,
      { unitType: UnitType.PROTOMECH },
      { walkMP: 2, runMP: 3, jumpMP: 0 },
    ],
    [
      'Infantry running movement',
      MovementType.Run,
      { q: 1, r: -2 },
      Facing.Northeast,
      { unitType: UnitType.INFANTRY },
      { walkMP: 2, runMP: 3, jumpMP: 0 },
    ],
  ] as const)(
    'does not queue flanking-and-turning PSRs for %s',
    (_label, movementType, target, facing, unitOverrides, capability) => {
      const { next, events } = runScriptedMove(
        createMinimalGrid(4),
        target,
        {
          facing: Facing.North,
          secondaryFacing: Facing.North,
          ...unitOverrides,
        },
        {
          movementType,
          facing,
          capability,
        },
      );

      expect(next.units['player-1'].pendingPSRs ?? []).not.toContainEqual(
        expect.objectContaining({
          reasonCode: PSRTrigger.FlankingAndTurning,
        }),
      );
      expect(psrPayloads(events)).not.toContainEqual(
        expect.objectContaining({
          reasonCode: PSRTrigger.FlankingAndTurning,
        }),
      );
    },
  );

  it('commits QuadMek Maneuvering Ace lateral steps at entry cost', () => {
    const target = { q: 1, r: -1 };
    const grid = setTerrain(
      createMinimalGrid(3),
      target,
      TerrainType.LightWoods,
    );
    const { next, events } = runScriptedMove(
      grid,
      target,
      {
        facing: Facing.North,
        secondaryFacing: Facing.North,
        abilities: ['maneuvering_ace'],
        isQuad: true,
      },
      {
        facing: Facing.North,
        capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
      },
    );
    const payload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'player-1',
      to: target,
      facing: Facing.North,
      movementType: MovementType.Walk,
      mpUsed: 2,
      hexesMoved: 1,
      straightHexes: 1,
      turningMpCost: 0,
    });
    expect(payload?.steps).toEqual([
      expect.objectContaining({
        kind: 'lateral',
        direction: 'right',
        from: { q: 0, r: 0 },
        to: target,
        mpCost: 2,
      }),
    ]);
    expect(next.units['player-1']).toMatchObject({
      position: target,
      facing: Facing.North,
      movementThisTurn: MovementType.Walk,
      hexesMovedThisTurn: 1,
    });
  });

  it('commits TacOps Evade as run-based movement with source-backed evasion state', () => {
    const target = { q: 2, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(4),
      target,
      {},
      {
        movementType: MovementType.Evade,
        capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
      },
    );
    const payload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'player-1',
      to: target,
      movementType: MovementType.Evade,
      mode: MovementType.Run,
      mpUsed: 2,
      heatGenerated: 4,
      hexesMoved: 2,
    });
    expect(next.units['player-1']).toMatchObject({
      position: target,
      movementThisTurn: MovementType.Evade,
      isEvading: true,
      evasionBonus: 1,
      hexesMovedThisTurn: 2,
    });

    const reset = resetTurnState(next);
    expect(reset.units['player-1']).toMatchObject({
      sprintedThisTurn: false,
      isEvading: false,
      evasionBonus: undefined,
    });
  });

  it('does not allow MASC or Supercharger boosted MP to extend TacOps Evade reach', () => {
    const target = { q: 4, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(5),
      target,
      {
        hasMASC: true,
        activeMASC: true,
      },
      {
        movementType: MovementType.Evade,
        capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
      },
    );

    expectSingleMovementInvalid(events, 'InsufficientMP');
    expect(next.units['player-1']).toMatchObject({
      position: { q: 0, r: 0 },
      movementThisTurn: MovementType.Stationary,
    });
    expect(next.units['player-1'].isEvading).not.toBe(true);
    expect(next.units['player-1'].evasionBonus).toBeUndefined();
  });

  it('commits TacOps Sprint as run-based movement with source-backed sprint state', () => {
    const target = { q: 4, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(5),
      target,
      {},
      {
        movementType: MovementType.Sprint,
        capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
      },
    );
    const payload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'player-1',
      to: target,
      movementType: MovementType.Sprint,
      mode: MovementType.Run,
      mpUsed: 4,
      heatGenerated: 3,
      hexesMoved: 4,
    });
    expect(next.units['player-1']).toMatchObject({
      position: target,
      movementThisTurn: MovementType.Sprint,
      sprintedThisTurn: true,
      isEvading: false,
      hexesMovedThisTurn: 4,
    });

    const reset = resetTurnState(next);
    expect(reset.units['player-1']).toMatchObject({
      sprintedThisTurn: false,
      isEvading: false,
      evasionBonus: undefined,
    });
  });

  it('applies active MASC/Supercharger sprint MP and queues their failure PSRs', () => {
    const target = { q: 12, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(13),
      target,
      {
        hasMASC: true,
        hasSupercharger: true,
        activeMASC: true,
        activeSupercharger: true,
      },
      {
        movementType: MovementType.Sprint,
        capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
      },
    );
    const movementPayload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;
    const payloads = psrPayloads(events);

    expect(movementPayload).toMatchObject({
      unitId: 'player-1',
      to: target,
      movementType: MovementType.Sprint,
      mpUsed: 12,
      heatGenerated: 3,
    });
    expect(next.units['player-1']).toMatchObject({
      position: target,
      sprintedThisTurn: true,
    });
    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixedTargetNumber: 3,
          reasonCode: PSRTrigger.MASCFailure,
          triggerSource: PSRTrigger.MASCFailure,
        }),
        expect.objectContaining({
          fixedTargetNumber: 3,
          reasonCode: PSRTrigger.SuperchargerFailure,
          triggerSource: PSRTrigger.SuperchargerFailure,
        }),
      ]),
    );
  });

  it('applies Terrain Master: Mountaineer movement relief before committing runner movement', () => {
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Rubble);

    const { next, events } = runScriptedMove(
      grid,
      target,
      { abilities: ['tm_mountaineer'] },
      {
        movementType: MovementType.Walk,
        capability: { walkMP: 1, runMP: 1, jumpMP: 0 },
      },
    );
    const payload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'player-1',
      to: target,
      mpUsed: 1,
      heatGenerated: 1,
    });
    expect(next.units['player-1'].position).toEqual(target);
    expect(SPA_COMBAT_SUPPORT.tm_mountaineer).toMatchObject({
      level: 'integrated',
    });
  });

  it('commits same-hex facing changes with authoritative turn MP', () => {
    const { next, events } = runScriptedMove(
      createMinimalGrid(3),
      { q: 0, r: 0 },
      { facing: Facing.North },
      {
        movementType: MovementType.Walk,
        facing: Facing.Northeast,
        capability: { walkMP: 1, runMP: 2, jumpMP: 0 },
      },
    );
    const payload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 0, r: 0 },
      facing: Facing.Northeast,
      mpUsed: 1,
      heatGenerated: 1,
      hexesMoved: 0,
      straightHexes: 0,
      turningMpCost: 1,
      netDisplacement: 0,
    });
    expect(payload?.steps).toEqual([
      expect.objectContaining({
        kind: 'turn',
        fromFacing: Facing.North,
        toFacing: Facing.Northeast,
      }),
    ]);
    expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
    expect(next.units['player-1'].facing).toBe(Facing.Northeast);
    expect(COMBAT_COMMAND_ACTION_SUPPORT['facing.rotate-right']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('same-hex MovementDeclared'),
    });
  });

  it('applies strong wind jump-distance reduction during runner movement validation', () => {
    const target = { q: 3, r: 0 };
    const capability = { walkMP: 4, runMP: 6, jumpMP: 4 };
    const calm = createEnvironmentalConditions({ wind: 'none' });
    const strongWind = createEnvironmentalConditions({ wind: 'strong' });

    const calmMove = runScriptedMove(
      createMinimalGrid(4),
      target,
      {},
      {
        movementType: MovementType.Jump,
        capability,
        environmentalConditions: calm,
      },
    );
    const windyMove = runScriptedMove(
      createMinimalGrid(4),
      target,
      {},
      {
        movementType: MovementType.Jump,
        capability,
        environmentalConditions: strongWind,
      },
    );

    expect(calmMove.events).toHaveLength(1);
    expect(calmMove.next.units['player-1'].position).toEqual(target);
    expectSingleMovementInvalid(windyMove.events, 'InsufficientMP');
    expect(windyMove.next.units['player-1'].position).toEqual({ q: 0, r: 0 });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.wind).toMatchObject({
      level: 'integrated',
    });
  });

  it('applies represented low-light movement penalties and Nightwalker relief before committing runner movement', () => {
    const target = { q: 1, r: 0 };
    const grid = createMinimalGrid(3);
    const night = createEnvironmentalConditions({ light: 'night' });
    const capability = { walkMP: 1, runMP: 2, jumpMP: 0 };

    const blockedWithoutAbility = runScriptedMove(
      grid,
      target,
      {},
      {
        movementType: MovementType.Walk,
        capability,
        environmentalConditions: night,
      },
    );
    const allowedWithNightwalker = runScriptedMove(
      grid,
      target,
      { abilities: ['tm_nightwalker'] },
      {
        movementType: MovementType.Walk,
        capability,
        environmentalConditions: night,
      },
    );
    const payload = allowedWithNightwalker.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expectSingleMovementInvalid(blockedWithoutAbility.events, 'InsufficientMP');
    expect(payload).toMatchObject({
      unitId: 'player-1',
      to: target,
      mpUsed: 1,
      heatGenerated: 1,
    });
    expect(allowedWithNightwalker.next.units['player-1'].position).toEqual(
      target,
    );
  });

  it('prohibits Nightwalker run-derived runner movement in represented low light', () => {
    const target = { q: 1, r: 0 };
    const night = createEnvironmentalConditions({ light: 'night' });
    const run = runScriptedMove(
      createMinimalGrid(3),
      target,
      { abilities: ['tm_nightwalker'] },
      {
        movementType: MovementType.Run,
        capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
        environmentalConditions: night,
      },
    );
    const invalid = run.events[0]?.payload as
      | IMovementInvalidPayload
      | undefined;

    expectSingleMovementInvalid(run.events, 'TerrainBlocked');
    expect(invalid?.details).toContain('Nightwalker prohibits running');
    expect(run.next.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it.each<{ readonly light: LightCondition; readonly blockedCost: number }>([
    { light: 'full_moon', blockedCost: 2 },
    { light: 'glare', blockedCost: 2 },
    { light: 'moonless', blockedCost: 3 },
    { light: 'solar_flare', blockedCost: 3 },
    { light: 'pitch_black', blockedCost: 4 },
  ])(
    'applies MegaMek $light movement penalties and Nightwalker relief before runner commit',
    ({ light, blockedCost }) => {
      const target = { q: 1, r: 0 };
      const conditions = createEnvironmentalConditions({ light });
      const capability = { walkMP: 1, runMP: 2, jumpMP: 0 };

      const blockedWithoutAbility = runScriptedMove(
        createMinimalGrid(3),
        target,
        {},
        {
          movementType: MovementType.Walk,
          capability,
          environmentalConditions: conditions,
        },
      );
      const allowedWithNightwalker = runScriptedMove(
        createMinimalGrid(3),
        target,
        { abilities: ['tm_nightwalker'] },
        {
          movementType: MovementType.Walk,
          capability,
          environmentalConditions: conditions,
        },
      );
      const prohibitedRun = runScriptedMove(
        createMinimalGrid(3),
        target,
        { abilities: ['tm_nightwalker'] },
        {
          movementType: MovementType.Run,
          capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
          environmentalConditions: conditions,
        },
      );

      expectSingleMovementInvalid(
        blockedWithoutAbility.events,
        'InsufficientMP',
      );
      expect(blockedWithoutAbility.events[0]?.payload).toMatchObject({
        mpCost: blockedCost,
      });
      expect(allowedWithNightwalker.next.units['player-1'].position).toEqual(
        target,
      );
      expectSingleMovementInvalid(prohibitedRun.events, 'TerrainBlocked');
      expect(
        (
          prohibitedRun.events[0]?.payload as
            | IMovementInvalidPayload
            | undefined
        )?.details,
      ).toContain('Nightwalker prohibits running');
    },
  );

  it('applies active TSM walk MP before runner movement validation', () => {
    const target = { q: 5, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(6),
      target,
      { hasTSM: true, heat: 9 },
      {
        movementType: MovementType.Walk,
        capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
      },
    );
    const payload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'player-1',
      to: target,
      mpUsed: 5,
      heatGenerated: 1,
    });
    expect(next.units['player-1'].position).toEqual(target);
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[MovementEnhancementType.TSM],
    ).toMatchObject({
      level: 'integrated',
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({ kind: 'megamek-source' }),
      ]),
    });
  });

  it('keeps TSM dormant below the heat-9 activation threshold', () => {
    const target = { q: 5, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(6),
      target,
      { hasTSM: true, heat: 8 },
      {
        movementType: MovementType.Walk,
        capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
      },
    );

    expectSingleMovementInvalid(events, 'InsufficientMP');
    expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('applies explicit active MASC run MP and queues a failure PSR', () => {
    const target = { q: 8, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(9),
      target,
      { hasMASC: true, activeMASC: true },
      {
        movementType: MovementType.Run,
        capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
      },
    );
    const movementPayload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;
    const payloads = psrPayloads(events);

    expect(movementPayload).toMatchObject({
      unitId: 'player-1',
      to: target,
      mpUsed: 8,
    });
    expect(next.units['player-1'].position).toEqual(target);
    expect(next.units['player-1'].pendingPSRs).toContainEqual(
      expect.objectContaining({
        fixedTargetNumber: 3,
        reasonCode: PSRTrigger.MASCFailure,
        triggerSource: PSRTrigger.MASCFailure,
      }),
    );
    expect(payloads).toContainEqual(
      expect.objectContaining({
        fixedTargetNumber: 3,
        unitId: 'player-1',
        reasonCode: PSRTrigger.MASCFailure,
        triggerSource: PSRTrigger.MASCFailure,
      }),
    );
    expectMovementEnhancementPsrBeforeMovementCommit(
      events,
      PSRTrigger.MASCFailure,
    );
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[MovementEnhancementType.MASC],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('active MASC run and sprint MP'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({ kind: 'megamek-source' }),
      ]),
    });
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[MovementEnhancementType.MASC].gap,
    ).toBeUndefined();
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['masc-side-paths'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('named MASC failure trigger source'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({ kind: 'megamek-source' }),
      ]),
    });
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['masc-side-paths'].gap,
    ).toBeUndefined();
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[
        'masc-battlemech-represented-side-paths'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'Represented BattleMech MASC side-path accounting',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({ kind: 'megamek-source' }),
      ]),
    });
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[
        'masc-battlemech-represented-side-paths'
      ].gap,
    ).toBeUndefined();
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.MASCFailure],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('movementEnhancementPsr'),
    });
  });

  it('keeps inactive MASC from expanding run MP', () => {
    const target = { q: 8, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(9),
      target,
      { hasMASC: true },
      {
        movementType: MovementType.Run,
        capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
      },
    );

    expectSingleMovementInvalid(events, 'InsufficientMP');
    expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it.each([
    {
      label: 'MASC sprint',
      unit: { hasMASC: true, activeMASC: true },
      movementType: MovementType.Sprint,
      target: { q: 10, r: 0 },
      gridSize: 11,
      expectedMpUsed: 10,
      expectedReasonCode: PSRTrigger.MASCFailure,
    },
    {
      label: 'Supercharger run',
      unit: { hasSupercharger: true, activeSupercharger: true },
      movementType: MovementType.Run,
      target: { q: 8, r: 0 },
      gridSize: 9,
      expectedMpUsed: 8,
      expectedReasonCode: PSRTrigger.SuperchargerFailure,
    },
    {
      label: 'Supercharger sprint',
      unit: { hasSupercharger: true, activeSupercharger: true },
      movementType: MovementType.Sprint,
      target: { q: 10, r: 0 },
      gridSize: 11,
      expectedMpUsed: 10,
      expectedReasonCode: PSRTrigger.SuperchargerFailure,
    },
  ] as const)(
    'applies represented single-booster $label MP and queues only its standard failure PSR',
    ({
      expectedMpUsed,
      expectedReasonCode,
      gridSize,
      movementType,
      target,
      unit,
    }) => {
      const { next, events } = runScriptedMove(
        createMinimalGrid(gridSize),
        target,
        unit,
        {
          movementType,
          capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
        },
      );
      const movementPayload = events.find(
        (event) => event.type === GameEventType.MovementDeclared,
      )?.payload as IMovementDeclaredPayload | undefined;
      const payloads = psrPayloads(events);

      expect(movementPayload).toMatchObject({
        unitId: 'player-1',
        to: target,
        movementType,
        mpUsed: expectedMpUsed,
      });
      expect(next.units['player-1'].position).toEqual(target);
      expect(payloads).toHaveLength(1);
      expect(payloads[0]).toMatchObject({
        fixedTargetNumber: 3,
        reasonCode: expectedReasonCode,
        triggerSource: expectedReasonCode,
      });
      expect(next.units['player-1'].pendingPSRs).toContainEqual(
        expect.objectContaining({
          fixedTargetNumber: 3,
          reasonCode: expectedReasonCode,
          triggerSource: expectedReasonCode,
        }),
      );
      expectMovementEnhancementPsrBeforeMovementCommit(
        events,
        expectedReasonCode,
      );
    },
  );

  it('does not queue MASC or Supercharger failure PSRs for validation-rejected boosted run movement', () => {
    const target = { q: 11, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(12),
      target,
      {
        hasMASC: true,
        hasSupercharger: true,
        activeMASC: true,
        activeSupercharger: true,
      },
      {
        movementType: MovementType.Run,
        capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
      },
    );

    expectSingleMovementInvalid(events, 'InsufficientMP');
    expect(psrPayloads(events)).toEqual([]);
    expect(next.units['player-1']).toMatchObject({
      position: { q: 0, r: 0 },
      movementThisTurn: MovementType.Stationary,
      hexesMovedThisTurn: 0,
      heat: 0,
      damageThisPhase: 0,
      pendingPSRs: [],
    });
    expect(
      events.some((event) => event.type === GameEventType.MovementDeclared),
    ).toBe(false);
    expect(
      events.some(
        (event) =>
          event.type === GameEventType.PSRTriggered ||
          event.type === GameEventType.PSRResolved,
      ),
    ).toBe(false);
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['masc-side-paths'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('named MASC failure trigger source'),
    });
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['masc-side-paths'].gap,
    ).toBeUndefined();
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['supercharger-side-paths'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'named Supercharger failure trigger source',
      ),
    });
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['supercharger-side-paths'].gap,
    ).toBeUndefined();
  });

  it('applies combined active MASC and Supercharger run MP and queues both failure PSRs', () => {
    const target = { q: 10, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(11),
      target,
      {
        hasMASC: true,
        hasSupercharger: true,
        activeMASC: true,
        activeSupercharger: true,
      },
      {
        movementType: MovementType.Run,
        capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
      },
    );
    const movementPayload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;
    const payloads = psrPayloads(events);

    expect(movementPayload).toMatchObject({
      unitId: 'player-1',
      to: target,
      mpUsed: 10,
    });
    expect(next.units['player-1'].position).toEqual(target);
    expect(next.units['player-1'].pendingPSRs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixedTargetNumber: 3,
          reasonCode: PSRTrigger.MASCFailure,
          triggerSource: PSRTrigger.MASCFailure,
        }),
        expect.objectContaining({
          fixedTargetNumber: 3,
          reasonCode: PSRTrigger.SuperchargerFailure,
          triggerSource: PSRTrigger.SuperchargerFailure,
        }),
      ]),
    );
    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixedTargetNumber: 3,
          reasonCode: PSRTrigger.MASCFailure,
        }),
        expect.objectContaining({
          fixedTargetNumber: 3,
          reasonCode: PSRTrigger.SuperchargerFailure,
        }),
      ]),
    );
    expectMovementEnhancementPsrBeforeMovementCommit(
      events,
      PSRTrigger.MASCFailure,
    );
    expectMovementEnhancementPsrBeforeMovementCommit(
      events,
      PSRTrigger.SuperchargerFailure,
    );
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[MovementEnhancementType.SUPERCHARGER],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'active Supercharger run and sprint MP',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({ kind: 'megamek-source' }),
      ]),
    });
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[MovementEnhancementType.SUPERCHARGER]
        .gap,
    ).toBeUndefined();
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['supercharger-side-paths'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'named Supercharger failure trigger source',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({ kind: 'megamek-source' }),
      ]),
    });
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['supercharger-side-paths'].gap,
    ).toBeUndefined();
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[
        'supercharger-battlemech-represented-side-paths'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'Represented BattleMech Supercharger side-path accounting',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({ kind: 'megamek-source' }),
      ]),
    });
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[
        'supercharger-battlemech-represented-side-paths'
      ].gap,
    ).toBeUndefined();
  });

  it('uses explicit prior booster use counts for MASC/Supercharger failure target numbers', () => {
    const target = { q: 10, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(11),
      target,
      {
        hasMASC: true,
        hasSupercharger: true,
        activeMASC: true,
        activeSupercharger: true,
        mascTurnsUsed: 2,
        superchargerTurnsUsed: 3,
      },
      {
        movementType: MovementType.Run,
        capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
      },
    );
    const payloads = psrPayloads(events);

    expect(next.units['player-1'].pendingPSRs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixedTargetNumber: 7,
          reasonCode: PSRTrigger.MASCFailure,
        }),
        expect.objectContaining({
          fixedTargetNumber: 11,
          reasonCode: PSRTrigger.SuperchargerFailure,
        }),
      ]),
    );
    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixedTargetNumber: 7,
          reasonCode: PSRTrigger.MASCFailure,
        }),
        expect.objectContaining({
          fixedTargetNumber: 11,
          reasonCode: PSRTrigger.SuperchargerFailure,
        }),
      ]),
    );
  });

  it.each([
    {
      label: 'alternate MASC first-use table',
      unit: { hasMASC: true, activeMASC: true, mascTurnsUsed: 0 },
      optionalRules: ['alternate_masc'],
      expectedReasonCode: PSRTrigger.MASCFailure,
      expectedFixedTargetNumber: 0,
    },
    {
      label: 'alternate-enhanced Supercharger repeated-use table',
      unit: {
        hasSupercharger: true,
        activeSupercharger: true,
        superchargerTurnsUsed: 2,
      },
      optionalRules: ['alternate_masc_enhanced'],
      expectedReasonCode: PSRTrigger.SuperchargerFailure,
      expectedFixedTargetNumber: 3,
    },
  ] as const)(
    'threads optional-rule booster failure target numbers through runner movement for $label',
    ({
      expectedFixedTargetNumber,
      expectedReasonCode,
      optionalRules,
      unit,
    }) => {
      const { next, events } = runScriptedMove(
        createMinimalGrid(9),
        { q: 8, r: 0 },
        unit,
        {
          movementType: MovementType.Run,
          capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
          optionalRules,
        },
      );
      const payloads = psrPayloads(events);

      expect(next.units['player-1'].position).toEqual({ q: 8, r: 0 });
      expect(payloads).toHaveLength(1);
      expect(payloads[0]).toMatchObject({
        fixedTargetNumber: expectedFixedTargetNumber,
        reasonCode: expectedReasonCode,
      });
      expect(next.units['player-1'].pendingPSRs).toContainEqual(
        expect.objectContaining({
          fixedTargetNumber: expectedFixedTargetNumber,
          reasonCode: expectedReasonCode,
        }),
      );
    },
  );

  it('advances and decays MASC/Supercharger prior-use counters at turn reset', () => {
    const target = { q: 10, r: 0 };
    const { next } = runScriptedMove(
      createMinimalGrid(11),
      target,
      {
        hasMASC: true,
        hasSupercharger: true,
        activeMASC: true,
        activeSupercharger: true,
        mascTurnsUsed: 1,
        superchargerTurnsUsed: 2,
      },
      {
        movementType: MovementType.Run,
        capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
      },
    );

    const afterUsedTurn = resetTurnState({ ...next, turn: 2 });

    expect(afterUsedTurn.units['player-1']).toMatchObject({
      activeMASC: false,
      activeSupercharger: false,
      mascTurnsUsed: 2,
      superchargerTurnsUsed: 3,
      mascFailureLevelIncreasedLastTurn: true,
      superchargerFailureLevelIncreasedLastTurn: true,
    });

    const afterIdleTurn = resetTurnState({ ...afterUsedTurn, turn: 3 });

    expect(afterIdleTurn.units['player-1']).toMatchObject({
      mascTurnsUsed: 0,
      superchargerTurnsUsed: 1,
      mascFailureLevelIncreasedLastTurn: false,
      superchargerFailureLevelIncreasedLastTurn: false,
    });
  });

  it('applies explicit Partial Wing jump MP and jump heat support', () => {
    const target = { q: 5, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(6),
      target,
      { partialWingJumpBonus: 2 },
      {
        movementType: MovementType.Jump,
        capability: { walkMP: 4, runMP: 6, jumpMP: 3 },
      },
    );
    const payload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'player-1',
      to: target,
      mpUsed: 5,
      heatGenerated: 3,
    });
    expect(next.units['player-1'].position).toEqual(target);
    expect(
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[MovementEnhancementType.PARTIAL_WING],
    ).toMatchObject({
      level: 'integrated',
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({ kind: 'megamek-source' }),
      ]),
    });
  });

  it('does not let Partial Wing create jump capability without base jump MP', () => {
    const target = { q: 1, r: 0 };
    const { next, events } = runScriptedMove(
      createMinimalGrid(3),
      target,
      { partialWingJumpBonus: 2 },
      {
        movementType: MovementType.Jump,
        capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
      },
    );

    expectSingleMovementInvalid(events, 'JumpUnavailable');
    expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it('applies jump-jet critical damage before runner jump validation', () => {
    const componentDamage = {
      ...DEFAULT_COMPONENT_DAMAGE,
      jumpJetsDestroyed: 1,
    };
    const capability = { walkMP: 4, runMP: 6, jumpMP: 4 };
    const blocked = runScriptedMove(
      createMinimalGrid(5),
      { q: 4, r: 0 },
      { componentDamage },
      { movementType: MovementType.Jump, capability },
    );
    const allowed = runScriptedMove(
      createMinimalGrid(5),
      { q: 3, r: 0 },
      { componentDamage },
      { movementType: MovementType.Jump, capability },
    );

    expectSingleMovementInvalid(blocked.events, 'InsufficientMP');
    expect(blocked.next.units['player-1'].position).toEqual({ q: 0, r: 0 });
    expect(allowed.next.units['player-1'].position).toEqual({ q: 3, r: 0 });
    expect(
      allowed.events.find(
        (event) => event.type === GameEventType.MovementDeclared,
      )?.payload,
    ).toMatchObject({
      unitId: 'player-1',
      mpUsed: 3,
      heatGenerated: 3,
    });
  });

  it('does not let Partial Wing recreate jump capability after jump-jet crits destroy all base jump MP', () => {
    const { next, events } = runScriptedMove(
      createMinimalGrid(3),
      { q: 1, r: 0 },
      {
        partialWingJumpBonus: 2,
        componentDamage: {
          ...DEFAULT_COMPONENT_DAMAGE,
          jumpJetsDestroyed: 3,
        },
      },
      {
        movementType: MovementType.Jump,
        capability: { walkMP: 4, runMP: 6, jumpMP: 3 },
      },
    );

    expectSingleMovementInvalid(events, 'JumpUnavailable');
    expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
  });

  it.each([
    {
      name: 'rubble entry',
      terrain: TerrainType.Rubble,
      movementType: MovementType.Walk,
      expected: PSRTrigger.EnteringRubble,
    },
    {
      name: 'rough terrain while running',
      terrain: TerrainType.Rough,
      movementType: MovementType.Run,
      expected: PSRTrigger.RunningRoughTerrain,
    },
    {
      name: 'ice movement',
      terrain: TerrainType.Ice,
      movementType: MovementType.Walk,
      expected: PSRTrigger.MovingOnIce,
    },
    {
      name: 'swamp bog-down entry',
      terrain: TerrainType.Swamp,
      movementType: MovementType.Walk,
      expected: PSRTrigger.SwampBogDown,
    },
    {
      name: 'jumping into water',
      terrain: TerrainType.Water,
      movementType: MovementType.Jump,
      expected: PSRTrigger.EnteringWater,
      capability: { walkMP: 4, runMP: 6, jumpMP: 4 },
    },
  ])('queues terrain movement PSRs for $name', (scenario) => {
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, scenario.terrain);

    const { next, events } = runScriptedMove(
      grid,
      target,
      {},
      {
        movementType: scenario.movementType,
        capability: scenario.capability,
      },
    );
    const payloads = psrPayloads(events);

    expect(next.units['player-1'].position).toEqual(target);
    expect(next.units['player-1'].pendingPSRs).toContainEqual(
      expect.objectContaining({ reasonCode: scenario.expected }),
    );
    expect(payloads).toContainEqual(
      expect.objectContaining({
        unitId: 'player-1',
        reasonCode: scenario.expected,
        triggerSource: expect.stringMatching(/^movement-step:/),
      }),
    );
    expect(RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[scenario.expected]).toMatchObject({
      level: 'integrated',
    });
    expect(TERRAIN_TYPE_PSR_COMBAT_SUPPORT[scenario.terrain]).toMatchObject({
      level: 'integrated',
    });
  });

  it('marks BattleMechs stuck immediately when they jump into swamp', () => {
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Swamp);

    const { next, events } = runScriptedMove(
      grid,
      target,
      {
        unitType: UnitType.BATTLEMECH,
      },
      {
        movementType: MovementType.Jump,
        capability: { walkMP: 4, runMP: 6, jumpMP: 4 },
      },
    );

    expect(next.units['player-1']).toMatchObject({
      position: target,
      isStuck: true,
      pendingPSRs: [],
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: GameEventType.UnitStuck,
        payload: expect.objectContaining({
          unitId: 'player-1',
          reasonCode: PSRTrigger.SwampBogDown,
        }),
      }),
    );
    expect(
      events.some((event) => event.type === GameEventType.PSRTriggered),
    ).toBe(false);
  });

  it('applies represented minefield marker damage and PSR evidence on BattleMech entry', () => {
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);

    const { next, events } = runScriptedMove(grid, target);
    const damagePayloads = events
      .filter((event) => event.type === GameEventType.DamageApplied)
      .map((event) => event.payload as IDamageAppliedPayload);
    const payloads = psrPayloads(events);

    expect(next.units['player-1']).toMatchObject({
      position: target,
      damageThisPhase: 20,
      armor: {
        left_leg: 11,
        right_leg: 11,
      },
    });
    expect(next.units['player-1'].pendingPSRs).toContainEqual(
      expect.objectContaining({
        reasonCode: PSRTrigger.PhaseDamage20Plus,
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: GameEventType.MovementDeclared,
        payload: expect.objectContaining({
          unitId: 'player-1',
          to: target,
          mpUsed: 1,
        }),
      }),
    );
    expect(damagePayloads).toEqual([
      expect.objectContaining({
        unitId: 'player-1',
        location: 'left_leg',
        damage: 10,
        armorRemaining: 11,
        structureRemaining: 14,
      }),
      expect.objectContaining({
        unitId: 'player-1',
        location: 'right_leg',
        damage: 10,
        armorRemaining: 11,
        structureRemaining: 14,
      }),
    ]);
    expect(payloads).toContainEqual(
      expect.objectContaining({
        unitId: 'player-1',
        reasonCode: PSRTrigger.PhaseDamage20Plus,
        triggerSource: PSRTrigger.PhaseDamage20Plus,
      }),
    );
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('represented TerrainType.Mines'),
    });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines.gap).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-variant-side-paths'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Split-accounting row'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-non-conventional-type-semantics'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Split-accounting row'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-emp-effects'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('EmpMinefieldEffectApplied'),
    });
  });

  it('applies encoded represented minefield damage level without promoting minefield variants', () => {
    const target = { q: 1, r: 0 };
    const grid = setTerrainFeatures(createMinimalGrid(3), target, [
      { type: TerrainType.Mines, level: 6 },
    ]);

    const { next, events } = runScriptedMove(grid, target);
    const damagePayloads = events
      .filter((event) => event.type === GameEventType.DamageApplied)
      .map((event) => event.payload as IDamageAppliedPayload);

    expect(next.units['player-1']).toMatchObject({
      position: target,
      damageThisPhase: 12,
      armor: {
        left_leg: 15,
        right_leg: 15,
      },
      pendingPSRs: [],
    });
    expect(damagePayloads).toEqual([
      expect.objectContaining({
        unitId: 'player-1',
        location: 'left_leg',
        damage: 6,
        armorRemaining: 15,
        structureRemaining: 14,
      }),
      expect.objectContaining({
        unitId: 'player-1',
        location: 'right_leg',
        damage: 6,
        armorRemaining: 15,
        structureRemaining: 14,
      }),
    ]);
    expect(
      events.some((event) => event.type === GameEventType.PSRTriggered),
    ).toBe(false);
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('encoded feature-level'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-encoded-damage-levels'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('encoded level 6'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-encoded-damage-levels'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-vibrabomb-effects'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('vibrabomb'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-vibrabomb-effects'
      ].gap,
    ).toBeUndefined();
  });

  it('applies represented battle-wide minefield state damage from coordinate entries', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
    const unit = createMinimalUnitState('player-1', GameSide.Player, source);
    const state: IGameState = {
      gameId: 'runner-minefield-state-entry-damage',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      minefields: {
        [coordToKey(target)]: {
          type: 'conventional',
          damagePerLeg: 7,
          source: 'scenario',
        },
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const next = applyMovementMinefieldEffects({
      currentState: state,
      events,
      gameId: state.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: source,
          to: target,
          terrainEntered: TerrainType.Clear,
        },
      ],
    });
    const damagePayloads = events
      .filter((event) => event.type === GameEventType.DamageApplied)
      .map((event) => event.payload as IDamageAppliedPayload);

    expect(next.units['player-1']).toMatchObject({
      damageThisPhase: 14,
      armor: {
        left_leg: 14,
        right_leg: 14,
      },
      pendingPSRs: [],
    });
    expect(damagePayloads).toEqual([
      expect.objectContaining({
        unitId: 'player-1',
        location: 'left_leg',
        damage: 7,
        armorRemaining: 14,
        structureRemaining: 14,
      }),
      expect.objectContaining({
        unitId: 'player-1',
        location: 'right_leg',
        damage: 7,
        armorRemaining: 14,
        structureRemaining: 14,
      }),
    ]);
    expect(next.minefields?.[coordToKey(target)]).toEqual({
      type: 'conventional',
      damagePerLeg: 7,
      detonated: true,
      source: 'scenario',
    });
    expect(
      events.find((event) => event.type === GameEventType.MinefieldChanged),
    ).toMatchObject({
      actorId: 'player-1',
      payload: {
        operation: 'detonate',
        hex: target,
        minefield: {
          type: 'conventional',
          damagePerLeg: 7,
          detonated: true,
          source: 'scenario',
        },
        reason: 'movement_detonation',
        sourceUnitId: 'player-1',
      },
    });
    expect(
      events.some((event) => event.type === GameEventType.PSRTriggered),
    ).toBe(false);
  });

  it('uses represented minefield density for detonation target thresholds', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);

    const runEntry = (
      minefield: NonNullable<IGameState['minefields']>[string],
      d6Roller: () => number,
    ) => {
      const unit = createMinimalUnitState('player-1', GameSide.Player, source);
      const state: IGameState = {
        gameId: 'runner-minefield-density-trigger-target',
        status: GameStatus.Active,
        turn: 1,
        phase: GamePhase.Movement,
        activationIndex: 0,
        units: {
          'player-1': unit,
        },
        minefields: {
          [coordToKey(target)]: minefield,
        },
        turnEvents: [],
      };
      const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

      return {
        next: applyMovementMinefieldEffects({
          currentState: state,
          events,
          gameId: state.gameId,
          grid,
          unitId: 'player-1',
          steps: [
            {
              kind: 'forward',
              index: 0,
              from: source,
              to: target,
              terrainEntered: TerrainType.Clear,
            },
          ],
          d6Roller,
        }),
        events,
      };
    };

    const baseline = runEntry(
      { type: 'conventional', damagePerLeg: 5, source: 'scenario' },
      () => 4,
    );
    const density20 = runEntry(
      {
        type: 'conventional',
        damagePerLeg: 5,
        density: 20,
        source: 'scenario',
      },
      () => 4,
    );
    const density25Rolls = [3, 4];
    const density25 = runEntry(
      {
        type: 'conventional',
        damagePerLeg: 5,
        density: 25,
        source: 'scenario',
      },
      () => density25Rolls.shift() ?? 1,
    );

    expect(baseline.next.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      armor: {
        left_leg: 21,
        right_leg: 21,
      },
    });
    expect(baseline.events).toEqual([]);

    expect(density20.next.units['player-1']).toMatchObject({
      damageThisPhase: 10,
      armor: {
        left_leg: 16,
        right_leg: 16,
      },
    });
    expect(
      density20.events.filter(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toHaveLength(2);
    expect(density20.next.minefields?.[coordToKey(target)]).toEqual({
      type: 'conventional',
      damagePerLeg: 5,
      density: 15,
      source: 'event',
      detonated: false,
    });
    expect(
      density20.events.filter(
        (event) => event.type === GameEventType.MinefieldChanged,
      ),
    ).toHaveLength(1);

    expect(density25.next.units['player-1']).toMatchObject({
      damageThisPhase: 10,
      armor: {
        left_leg: 16,
        right_leg: 16,
      },
    });
    expect(
      density25.events.filter(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toHaveLength(2);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-density-trigger-target'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('density 20'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls']
        .gap,
    ).not.toEqual(expect.stringContaining('density trigger target'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-density-reduction'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'reduces represented conventional and inferno density',
      ),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls']
        .gap,
    ).not.toEqual(expect.stringContaining('density reduction'));
  });

  it('applies represented EMP minefield shutdown without conventional mine damage', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
    const unit = createMinimalUnitState('player-1', GameSide.Player, source);
    const empMinefield: IRepresentedMinefieldState = {
      type: 'emp',
      damagePerLeg: 10,
      density: 20,
      setting: 50,
      source: 'scenario',
    };
    const state: IGameState = {
      gameId: 'runner-minefield-emp-fail-closed',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      minefields: {
        [coordToKey(target)]: empMinefield,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const next = applyMovementMinefieldEffects({
      currentState: state,
      events,
      gameId: state.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: source,
          to: target,
          terrainEntered: TerrainType.Clear,
        },
      ],
      d6Roller: scriptedD6Roller([6, 6, 5, 4, 4, 6, 6]),
    });

    expect(next.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      armor: unit.armor,
      pendingPSRs: [],
      shutdown: true,
      empShutdownTurns: 4,
    });
    expect(
      events.find(
        (event) => event.type === GameEventType.EmpMinefieldEffectApplied,
      )?.payload,
    ).toMatchObject({
      unitId: 'player-1',
      hex: target,
      roll: 9,
      modifier: 0,
      modifiedRoll: 9,
      effect: 'shutdown',
      durationTurns: 4,
      source: 'minefield',
    });
    expect(
      events.find((event) => event.type === GameEventType.MinefieldChanged)
        ?.payload,
    ).toMatchObject({
      operation: 'set',
      hex: target,
      minefield: expect.objectContaining({
        type: 'emp',
        density: 15,
        source: 'event',
      }),
      reason: 'movement_detonation',
    });
    const replayed = events.reduce(
      (replayedState, event) => applyEvent(replayedState, event),
      state,
    );
    expect(replayed.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      shutdown: true,
      empShutdownTurns: 4,
    });
    expect(replayed.minefields?.[coordToKey(target)]).toMatchObject({
      type: 'emp',
      density: 15,
      source: 'event',
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-non-conventional-type-guard'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('no fallback to conventional damage'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-emp-effects'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('EmpMinefieldEffectApplied'),
    });
  });

  it.each([
    {
      label: 'no effect',
      d6: [6, 6, 3, 3],
      hasDroneOS: false,
      expectedPayload: {
        roll: 6,
        modifier: 0,
        modifiedRoll: 6,
        effect: 'none',
      },
      expectedUnit: { shutdown: false },
    },
    {
      label: 'interference',
      d6: [6, 6, 3, 4, 2],
      hasDroneOS: false,
      expectedPayload: {
        roll: 7,
        modifier: 0,
        modifiedRoll: 7,
        effect: 'interference',
        durationTurns: 2,
      },
      expectedUnit: { empInterferenceTurns: 2 },
    },
    {
      label: 'drone-modified shutdown',
      d6: [6, 6, 3, 4, 3],
      hasDroneOS: true,
      expectedPayload: {
        roll: 7,
        modifier: 2,
        modifiedRoll: 9,
        effect: 'shutdown',
        durationTurns: 3,
      },
      expectedUnit: { shutdown: true, empShutdownTurns: 3 },
    },
  ])(
    'maps represented BattleMech EMP minefield roll thresholds for $label',
    ({ d6, expectedPayload, expectedUnit, hasDroneOS }) => {
      const source = { q: 0, r: 0 };
      const target = { q: 1, r: 0 };
      const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
      const unit = {
        ...createMinimalUnitState('player-1', GameSide.Player, source),
        hasDroneOS,
      };
      const state: IGameState = {
        gameId: `runner-minefield-emp-${expectedPayload.effect}`,
        status: GameStatus.Active,
        turn: 1,
        phase: GamePhase.Movement,
        activationIndex: 0,
        units: {
          'player-1': unit,
        },
        minefields: {
          [coordToKey(target)]: {
            type: 'emp',
            damagePerLeg: 0,
            source: 'scenario',
          },
        },
        turnEvents: [],
      };
      const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

      const next = applyMovementMinefieldEffects({
        currentState: state,
        events,
        gameId: state.gameId,
        grid,
        unitId: 'player-1',
        steps: [
          {
            kind: 'forward',
            index: 0,
            from: source,
            to: target,
            terrainEntered: TerrainType.Clear,
          },
        ],
        d6Roller: scriptedD6Roller(d6),
      });

      expect(
        events.find(
          (event) => event.type === GameEventType.EmpMinefieldEffectApplied,
        )?.payload,
      ).toMatchObject(expectedPayload);
      expect(next.units['player-1']).toMatchObject({
        damageThisPhase: 0,
        armor: unit.armor,
        pendingPSRs: [],
        ...expectedUnit,
      });
      expect(
        events.find((event) => event.type === GameEventType.MinefieldChanged)
          ?.payload,
      ).toMatchObject({
        operation: 'detonate',
        reason: 'movement_detonation',
      });
    },
  );

  it('triggers represented vibrabomb damage on same-hex BattleMech movement', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
    const unit = {
      ...createMinimalUnitState('player-1', GameSide.Player, source),
      tonnage: 60,
    };
    const state: IGameState = {
      gameId: 'runner-minefield-vibrabomb-same-hex',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      minefields: {
        [coordToKey(target)]: {
          type: 'vibrabomb',
          damagePerLeg: 0,
          density: 10,
          setting: 50,
          source: 'scenario',
        },
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];
    const rolls = [1, 4];

    const next = applyMovementMinefieldEffects({
      currentState: state,
      events,
      gameId: state.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: source,
          to: target,
          terrainEntered: TerrainType.Clear,
        },
      ],
      d6Roller: () => rolls.shift() ?? 1,
    });
    const damagePayloads = events
      .filter((event) => event.type === GameEventType.DamageApplied)
      .map((event) => event.payload as IDamageAppliedPayload);

    expect(next.units['player-1']).toMatchObject({
      damageThisPhase: 10,
      armor: {
        left_leg: 16,
        right_leg: 16,
      },
      pendingPSRs: [],
    });
    expect(damagePayloads).toEqual([
      expect.objectContaining({
        unitId: 'player-1',
        location: 'right_leg',
        damage: 5,
        armorRemaining: 16,
      }),
      expect.objectContaining({
        unitId: 'player-1',
        location: 'left_leg',
        damage: 5,
        armorRemaining: 16,
      }),
    ]);
    expect(next.minefields?.[coordToKey(target)]).toEqual({
      type: 'vibrabomb',
      damagePerLeg: 0,
      density: 5,
      setting: 50,
      detonated: false,
      source: 'event',
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: GameEventType.MinefieldChanged,
        payload: expect.objectContaining({
          operation: 'set',
          hex: target,
          reason: 'movement_detonation',
          sourceUnitId: 'player-1',
          minefield: expect.objectContaining({
            type: 'vibrabomb',
            density: 5,
            setting: 50,
          }),
        }),
      }),
    );
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-vibrabomb-effects'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('vibrabomb'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-vibrabomb-effects'
      ].gap,
    ).toBeUndefined();
  });

  it('triggers represented vibrabomb proximity without damaging the moving unit outside the mined hex', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const mineHex = { q: 2, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
    const unit = {
      ...createMinimalUnitState('player-1', GameSide.Player, source),
      tonnage: 60,
    };
    const state: IGameState = {
      gameId: 'runner-minefield-vibrabomb-proximity',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      minefields: {
        [coordToKey(mineHex)]: {
          type: 'vibrabomb',
          damagePerLeg: 0,
          density: 5,
          setting: 50,
          source: 'scenario',
        },
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const next = applyMovementMinefieldEffects({
      currentState: state,
      events,
      gameId: state.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: source,
          to: target,
          terrainEntered: TerrainType.Clear,
        },
      ],
    });

    expect(next.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      armor: unit.armor,
    });
    expect(
      events.filter((event) => event.type === GameEventType.DamageApplied),
    ).toEqual([]);
    expect(next.minefields?.[coordToKey(mineHex)]).toBeUndefined();
    expect(events).toContainEqual(
      expect.objectContaining({
        type: GameEventType.MinefieldChanged,
        payload: expect.objectContaining({
          operation: 'remove',
          hex: mineHex,
          reason: 'movement_detonation',
          sourceUnitId: 'player-1',
        }),
      }),
    );
  });

  it('suppresses represented active coordinate minefield entry for ground BattleMech movement', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
    const unit = createMinimalUnitState('player-1', GameSide.Player, source);
    const activeMinefield: IRepresentedMinefieldState = {
      type: 'active',
      damagePerLeg: 10,
      density: 20,
      source: 'scenario',
    };
    const state: IGameState = {
      gameId: 'runner-minefield-active-ground-suppression',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      minefields: {
        [coordToKey(target)]: activeMinefield,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const next = applyMovementMinefieldEffects({
      currentState: state,
      events,
      gameId: state.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: source,
          to: target,
          terrainEntered: TerrainType.Clear,
        },
      ],
      d6Roller: () => 6,
    });

    expect(next.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      armor: unit.armor,
      pendingPSRs: [],
    });
    expect(next.minefields?.[coordToKey(target)]).toEqual(activeMinefield);
    expect(events).toEqual([]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-active-ground-suppression'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('active minefield'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-active-non-ground-triggers'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('jump entry'),
    });
  });

  it('triggers represented active coordinate minefield damage for BattleMech jump entry', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
    const unit = createMinimalUnitState('player-1', GameSide.Player, source);
    const activeMinefield: IRepresentedMinefieldState = {
      type: 'active',
      damagePerLeg: 8,
      density: 20,
      source: 'scenario',
    };
    const state: IGameState = {
      gameId: 'runner-minefield-active-non-ground-trigger',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      minefields: {
        [coordToKey(target)]: activeMinefield,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const next = applyMovementMinefieldEffects({
      currentState: state,
      events,
      gameId: state.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'jump',
          index: 0,
          from: source,
          to: target,
          terrainEntered: TerrainType.Clear,
        },
      ],
      d6Roller: () => 6,
    });
    const damagePayloads = events
      .filter((event) => event.type === GameEventType.DamageApplied)
      .map((event) => event.payload as IDamageAppliedPayload);

    expect(next.units['player-1']).toMatchObject({
      damageThisPhase: 16,
      armor: {
        left_leg: 13,
        right_leg: 13,
      },
      pendingPSRs: [],
    });
    expect(damagePayloads).toEqual([
      expect.objectContaining({
        unitId: 'player-1',
        location: 'left_leg',
        damage: 8,
      }),
      expect.objectContaining({
        unitId: 'player-1',
        location: 'right_leg',
        damage: 8,
      }),
    ]);
    expect(next.minefields?.[coordToKey(target)]).toEqual({
      type: 'active',
      damagePerLeg: 8,
      density: 15,
      detonated: false,
      source: 'event',
    });
    expect(
      events.find((event) => event.type === GameEventType.MinefieldChanged),
    ).toMatchObject({
      actorId: 'player-1',
      payload: {
        operation: 'set',
        hex: target,
        minefield: {
          type: 'active',
          damagePerLeg: 8,
          density: 15,
          detonated: false,
          source: 'event',
        },
        reason: 'movement_detonation',
        sourceUnitId: 'player-1',
      },
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-active-non-ground-triggers'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('jump entry'),
    });
  });

  it('queues represented inferno coordinate minefield density as external heat without leg damage', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
    const unit = createMinimalUnitState('player-1', GameSide.Player, source);
    const state: IGameState = {
      gameId: 'runner-minefield-inferno-entry-heat',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      minefields: {
        [coordToKey(target)]: {
          type: 'inferno',
          damagePerLeg: 10,
          density: 10,
          source: 'scenario',
        },
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const next = applyMovementMinefieldEffects({
      currentState: state,
      events,
      gameId: state.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: source,
          to: target,
          terrainEntered: TerrainType.Clear,
        },
      ],
      d6Roller: () => 6,
    });

    expect(next.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      armor: unit.armor,
      pendingExternalHeat: 10,
      infernoBurning: true,
    });
    expect(
      events.filter((event) => event.type === GameEventType.DamageApplied),
    ).toEqual([]);
    expect(
      events.filter((event) => event.type === GameEventType.PSRTriggered),
    ).toEqual([]);
    expect(
      events.find((event) => event.type === GameEventType.MinefieldChanged),
    ).toMatchObject({
      actorId: 'player-1',
      payload: {
        operation: 'set',
        hex: target,
        reason: 'movement_detonation',
        sourceUnitId: 'player-1',
        minefield: {
          type: 'inferno',
          damagePerLeg: 10,
          density: 5,
          detonated: false,
          source: 'event',
        },
      },
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-inferno-entry-heat'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('pendingExternalHeat'),
    });
  });

  it('does not apply represented coordinate minefield damage after explicit detonation state', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
    const unit = createMinimalUnitState('player-1', GameSide.Player, source);
    const state: IGameState = {
      gameId: 'runner-minefield-state-detonated-entry-suppression',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      minefields: {
        [coordToKey(target)]: {
          type: 'conventional',
          damagePerLeg: 10,
          detonated: true,
          source: 'scenario',
        },
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const next = applyMovementMinefieldEffects({
      currentState: state,
      events,
      gameId: state.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: source,
          to: target,
        },
      ],
    });

    expect(next.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      armor: unit.armor,
    });
    expect(events).toEqual([]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-conventional-detonated-state'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('already-detonated suppression'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-conventional-detonated-state'
      ].gap,
    ).toBeUndefined();
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-variant-side-paths'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented conventional/detonated coordinate state',
      ),
    });
  });

  it('consumes event-sourced coordinate minefield lifecycle state during movement', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
    const unit = createMinimalUnitState('player-1', GameSide.Player, source);
    const baseState: IGameState = {
      gameId: 'runner-minefield-event-lifecycle',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      turnEvents: [],
    };
    const stateWithMinefield = applyEvent(baseState, {
      id: 'minefield-add',
      gameId: baseState.gameId,
      sequence: 1,
      timestamp: '2026-06-14T00:00:00Z',
      type: GameEventType.MinefieldChanged,
      turn: 1,
      phase: GamePhase.Movement,
      payload: {
        operation: 'add',
        hex: target,
        minefield: { type: 'conventional', damagePerLeg: 4 },
      },
    });
    const damageEvents: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const damaged = applyMovementMinefieldEffects({
      currentState: stateWithMinefield,
      events: damageEvents,
      gameId: baseState.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: source,
          to: target,
          terrainEntered: TerrainType.Clear,
        },
      ],
    });
    const stateWithDetonatedMinefield = applyEvent(stateWithMinefield, {
      id: 'minefield-detonate',
      gameId: baseState.gameId,
      sequence: 2,
      timestamp: '2026-06-14T00:00:01Z',
      type: GameEventType.MinefieldChanged,
      turn: 1,
      phase: GamePhase.Movement,
      payload: {
        operation: 'detonate',
        hex: target,
      },
    });
    const suppressedEvents: Parameters<typeof runMovementPhase>[0]['events'] =
      [];

    const suppressed = applyMovementMinefieldEffects({
      currentState: stateWithDetonatedMinefield,
      events: suppressedEvents,
      gameId: baseState.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: source,
          to: target,
          terrainEntered: TerrainType.Clear,
        },
      ],
    });

    expect(damaged.units['player-1']).toMatchObject({
      damageThisPhase: 8,
      armor: {
        left_leg: 17,
        right_leg: 17,
      },
    });
    expect(
      damageEvents.filter(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toHaveLength(2);
    expect(
      stateWithDetonatedMinefield.minefields?.[coordToKey(target)],
    ).toEqual({
      type: 'conventional',
      damagePerLeg: 4,
      detonated: true,
      source: 'event',
    });
    expect(suppressed.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      armor: unit.armor,
    });
    expect(suppressedEvents).toEqual([]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-coordinate-state-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('event-sourced add'),
    });
  });

  it('manually detonates represented conventional coordinate minefields without damage side effects', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
    const unit = createMinimalUnitState('player-1', GameSide.Player, source);
    const baseState: IGameState = {
      gameId: 'runner-minefield-manual-conventional-detonation',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      minefields: {
        [coordToKey(target)]: {
          type: 'conventional',
          damagePerLeg: 4,
          source: 'scenario',
        },
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const detonated = applyRunnerMinefieldManualDetonation({
      state: baseState,
      events,
      gameId: baseState.gameId,
      hex: target,
      unitId: 'player-1',
    });

    expect(events).toEqual([
      expect.objectContaining({
        type: GameEventType.MinefieldChanged,
        phase: GamePhase.Movement,
        actorId: 'player-1',
        payload: expect.objectContaining({
          operation: 'detonate',
          hex: target,
          reason: 'manual_adjustment',
          sourceUnitId: 'player-1',
          minefield: {
            type: 'conventional',
            damagePerLeg: 4,
            detonated: true,
            source: 'scenario',
          },
        }),
      }),
    ]);
    expect(
      events.filter((event) => event.type === GameEventType.DamageApplied),
    ).toEqual([]);
    expect(
      events.filter((event) => event.type === GameEventType.PSRTriggered),
    ).toEqual([]);
    expect(detonated.minefields?.[coordToKey(target)]).toEqual({
      type: 'conventional',
      damagePerLeg: 4,
      detonated: true,
      source: 'scenario',
    });
    expect(detonated.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      armor: unit.armor,
    });

    const movementEvents: Parameters<typeof runMovementPhase>[0]['events'] = [];
    const afterEntry = applyMovementMinefieldEffects({
      currentState: detonated,
      events: movementEvents,
      gameId: baseState.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: source,
          to: target,
          terrainEntered: TerrainType.Clear,
        },
      ],
    });

    expect(afterEntry.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      armor: unit.armor,
    });
    expect(movementEvents).toEqual([]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-manual-conventional-detonation'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('manual_adjustment'),
    });
  });

  it('does not manually detonate non-conventional coordinate minefield variants as represented conventional mines', () => {
    const target = { q: 1, r: 0 };
    const nonConventionalMinefield: IRepresentedMinefieldState = {
      type: 'command-detonated',
      damagePerLeg: 4,
      source: 'scenario',
    };
    const baseState: IGameState = {
      gameId: 'runner-minefield-manual-non-conventional-guard',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': createMinimalUnitState('player-1', GameSide.Player, {
          q: 0,
          r: 0,
        }),
      },
      minefields: {
        [coordToKey(target)]: nonConventionalMinefield,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const next = applyRunnerMinefieldManualDetonation({
      state: baseState,
      events,
      gameId: baseState.gameId,
      hex: target,
      unitId: 'player-1',
    });

    expect(next).toBe(baseState);
    expect(events).toEqual([]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('GO_PRONE movement'),
    });
  });

  it('manually detonates represented command-detonated coordinate minefields without damage side effects', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
    const unit = createMinimalUnitState('player-1', GameSide.Player, source);
    const baseState: IGameState = {
      gameId: 'runner-minefield-command-detonation',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      minefields: {
        [coordToKey(target)]: {
          type: 'command-detonated',
          damagePerLeg: 4,
          source: 'scenario',
        },
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const detonated = applyRunnerMinefieldCommandDetonation({
      state: baseState,
      events,
      gameId: baseState.gameId,
      hex: target,
      unitId: 'player-1',
    });

    expect(events).toEqual([
      expect.objectContaining({
        type: GameEventType.MinefieldChanged,
        phase: GamePhase.Movement,
        actorId: 'player-1',
        payload: expect.objectContaining({
          operation: 'detonate',
          hex: target,
          reason: 'manual_adjustment',
          sourceUnitId: 'player-1',
          minefield: {
            type: 'command-detonated',
            damagePerLeg: 4,
            detonated: true,
            source: 'scenario',
          },
        }),
      }),
    ]);
    expect(
      events.filter((event) => event.type === GameEventType.DamageApplied),
    ).toEqual([]);
    expect(
      events.filter((event) => event.type === GameEventType.PSRTriggered),
    ).toEqual([]);
    expect(detonated.minefields?.[coordToKey(target)]).toEqual({
      type: 'command-detonated',
      damagePerLeg: 4,
      detonated: true,
      source: 'scenario',
    });
    expect(detonated.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      armor: unit.armor,
    });

    const movementEvents: Parameters<typeof runMovementPhase>[0]['events'] = [];
    const afterEntry = applyMovementMinefieldEffects({
      currentState: detonated,
      events: movementEvents,
      gameId: baseState.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: source,
          to: target,
          terrainEntered: TerrainType.Clear,
        },
      ],
    });

    expect(afterEntry.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      armor: unit.armor,
    });
    expect(movementEvents).toEqual([]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-command-detonation'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('command-detonated'),
    });
  });

  it('does not manually detonate EMP coordinate minefields as represented command mines', () => {
    const target = { q: 1, r: 0 };
    const empMinefield: IRepresentedMinefieldState = {
      type: 'emp',
      damagePerLeg: 0,
      source: 'scenario',
    };
    const baseState: IGameState = {
      gameId: 'runner-minefield-command-detonation-emp-guard',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': createMinimalUnitState('player-1', GameSide.Player, {
          q: 0,
          r: 0,
        }),
      },
      minefields: {
        [coordToKey(target)]: empMinefield,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const next = applyRunnerMinefieldCommandDetonation({
      state: baseState,
      events,
      gameId: baseState.gameId,
      hex: target,
      unitId: 'player-1',
    });

    expect(next).toBe(baseState);
    expect(events).toEqual([]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-emp-effects'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('movement entry'),
    });
  });

  it('event-sources represented conventional minefield clearing and reset without damage side effects', () => {
    const target = { q: 1, r: 0 };
    const secondTarget = { q: 2, r: 0 };
    const key = coordToKey(target);
    const secondKey = coordToKey(secondTarget);
    const unit = createMinimalUnitState('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    });
    const baseState: IGameState = {
      gameId: 'runner-minefield-clearing-sweeper-reset',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      minefields: {
        [key]: {
          type: 'conventional',
          damagePerLeg: 4,
          density: 10,
          source: 'scenario',
        },
        [secondKey]: {
          type: 'conventional',
          damagePerLeg: 6,
          source: 'scenario',
        },
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const reduced = applyRunnerMinefieldClearing({
      state: baseState,
      events,
      gameId: baseState.gameId,
      hex: target,
      unitId: 'player-1',
      reason: 'mine_sweeper',
    });
    const removed = applyRunnerMinefieldClearing({
      state: reduced,
      events,
      gameId: baseState.gameId,
      hex: target,
      unitId: 'player-1',
    });
    const collateralMinefield = baseState.minefields?.[secondKey];
    if (!collateralMinefield) {
      throw new Error('Expected authored collateral minefield');
    }
    const collateralDetonated: IGameState = {
      ...removed,
      minefields: {
        ...removed.minefields,
        [secondKey]: {
          ...collateralMinefield,
          detonated: true,
          source: 'event',
        },
      },
    };
    const reset = applyRunnerMinefieldReset({
      state: collateralDetonated,
      events,
      gameId: baseState.gameId,
      unitId: 'player-1',
      minefields: baseState.minefields ?? {},
    });

    expect(events).toEqual([
      expect.objectContaining({
        type: GameEventType.MinefieldChanged,
        actorId: 'player-1',
        payload: expect.objectContaining({
          operation: 'set',
          hex: target,
          reason: 'mine_sweeper',
          sourceUnitId: 'player-1',
          minefield: {
            type: 'conventional',
            damagePerLeg: 4,
            density: 5,
            detonated: false,
            source: 'event',
          },
        }),
      }),
      expect.objectContaining({
        type: GameEventType.MinefieldChanged,
        actorId: 'player-1',
        payload: expect.objectContaining({
          operation: 'remove',
          hex: target,
          reason: 'clearing',
          sourceUnitId: 'player-1',
        }),
      }),
      expect.objectContaining({
        type: GameEventType.MinefieldChanged,
        actorId: 'player-1',
        payload: expect.objectContaining({
          operation: 'reset',
          reason: 'collateral_reset',
          sourceUnitId: 'player-1',
          minefields: baseState.minefields,
        }),
      }),
    ]);
    expect(reduced.minefields?.[key]).toEqual({
      type: 'conventional',
      damagePerLeg: 4,
      density: 5,
      detonated: false,
      source: 'event',
    });
    expect(removed.minefields).toEqual({
      [secondKey]: {
        type: 'conventional',
        damagePerLeg: 6,
        source: 'scenario',
      },
    });
    expect(collateralDetonated.minefields?.[secondKey]).toEqual({
      type: 'conventional',
      damagePerLeg: 6,
      detonated: true,
      source: 'event',
    });
    expect(reset.minefields).toEqual(baseState.minefields);
    expect(reset.units['player-1']).toMatchObject({
      damageThisPhase: 0,
      armor: unit.armor,
      pendingPSRs: [],
    });
    expect(
      events.some(
        (event) =>
          event.type === GameEventType.DamageApplied ||
          event.type === GameEventType.PSRTriggered,
      ),
    ).toBe(false);

    const movementEvents: Parameters<typeof runMovementPhase>[0]['events'] = [];
    const afterResetEntry = applyMovementMinefieldEffects({
      currentState: reset,
      events: movementEvents,
      gameId: baseState.gameId,
      grid: createMinimalGrid(3),
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: { q: 0, r: 0 },
          to: secondTarget,
          terrainEntered: TerrainType.Clear,
        },
      ],
    });

    expect(afterResetEntry.units['player-1']).toMatchObject({
      damageThisPhase: 12,
      armor: {
        left_leg: 15,
        right_leg: 15,
      },
    });
    expect(
      movementEvents.filter(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toHaveLength(2);
    expect(afterResetEntry.minefields?.[secondKey]).toEqual({
      type: 'conventional',
      damagePerLeg: 6,
      detonated: true,
      source: 'scenario',
    });
  });

  it('does not clear non-conventional coordinate minefield variants as represented conventional mines', () => {
    const target = { q: 1, r: 0 };
    const baseState: IGameState = {
      gameId: 'runner-minefield-clearing-non-conventional-guard',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': createMinimalUnitState('player-1', GameSide.Player, {
          q: 0,
          r: 0,
        }),
      },
      minefields: {
        [coordToKey(target)]: {
          type: 'inferno',
          damagePerLeg: 4,
          density: 20,
          source: 'scenario',
        },
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const next = applyRunnerMinefieldClearing({
      state: baseState,
      events,
      gameId: baseState.gameId,
      hex: target,
      unitId: 'player-1',
      reason: 'mine_sweeper',
    });

    expect(next).toBe(baseState);
    expect(events).toEqual([]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'inferno entries without positive density',
      ),
    });
  });

  it('event-sources hidden conventional minefield detection and movement reveal', () => {
    const target = { q: 1, r: 0 };
    const hiddenMinefield: IRepresentedMinefieldState = {
      type: 'conventional',
      damagePerLeg: 4,
      hidden: true,
      source: 'scenario',
    };
    const baseState: IGameState = {
      gameId: 'runner-hidden-minefield-detection-reveal',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': createMinimalUnitState('player-1', GameSide.Player, {
          q: 0,
          r: 0,
        }),
      },
      minefields: {
        [coordToKey(target)]: hiddenMinefield,
      },
      turnEvents: [],
    };
    const detectionEvents: Parameters<typeof runMovementPhase>[0]['events'] =
      [];

    const detected = applyRunnerMinefieldDetection({
      state: baseState,
      events: detectionEvents,
      gameId: baseState.gameId,
      hex: target,
      unitId: 'player-1',
    });
    const detectionPayload = detectionEvents[0]
      ?.payload as IMinefieldChangedPayload;

    expect(detectionPayload).toMatchObject({
      operation: 'detect',
      hex: target,
      detectingSide: GameSide.Player,
      reason: 'detection',
      sourceUnitId: 'player-1',
    });
    expect(detected.minefields?.[coordToKey(target)]).toMatchObject({
      hidden: true,
      detectedBySides: [GameSide.Player],
    });
    expect(detected.minefields?.[coordToKey(target)]?.revealed).toBeUndefined();
    expect(
      detectionEvents.some(
        (event) =>
          event.type === GameEventType.DamageApplied ||
          event.type === GameEventType.PSRTriggered,
      ),
    ).toBe(false);

    const movementEvents: Parameters<typeof runMovementPhase>[0]['events'] = [];
    const afterEntry = applyMovementMinefieldEffects({
      currentState: detected,
      events: movementEvents,
      gameId: detected.gameId,
      grid: createMinimalGrid(3),
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: { q: 0, r: 0 },
          to: target,
          terrainEntered: TerrainType.Clear,
        },
      ],
    });
    const revealPayload = movementEvents.find(
      (event) => event.type === GameEventType.MinefieldChanged,
    )?.payload as IMinefieldChangedPayload | undefined;

    expect(afterEntry.units['player-1']).toMatchObject({
      damageThisPhase: 8,
      armor: {
        left_leg: 17,
        right_leg: 17,
      },
    });
    expect(revealPayload).toMatchObject({
      operation: 'detonate',
      hex: target,
      reason: 'movement_detonation',
      sourceUnitId: 'player-1',
      minefield: expect.objectContaining({
        hidden: false,
        revealed: true,
        detectedBySides: [GameSide.Player],
        detonated: true,
      }),
    });
    expect(afterEntry.minefields?.[coordToKey(target)]).toMatchObject({
      hidden: false,
      revealed: true,
      detectedBySides: [GameSide.Player],
      detonated: true,
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-hidden-reveal-detection'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('hidden conventional coordinate'),
    });
  });

  it('applies Eagle Eyes relief to represented minefield detonation rolls', () => {
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);

    const withoutEagleEyes = runScriptedMove(
      grid,
      target,
      {},
      { random: fixedRandom(0.75) },
    );
    const withEagleEyes = runScriptedMove(
      grid,
      target,
      { abilities: ['eagle_eyes'] },
      { random: fixedRandom(0.75) },
    );

    expect(withoutEagleEyes.next.units['player-1']).toMatchObject({
      position: target,
      damageThisPhase: 20,
      armor: {
        left_leg: 11,
        right_leg: 11,
      },
    });
    expect(
      withoutEagleEyes.events.filter(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toHaveLength(2);

    expect(withEagleEyes.next.units['player-1']).toMatchObject({
      position: target,
      damageThisPhase: 0,
      armor: {
        left_leg: 21,
        right_leg: 21,
      },
      pendingPSRs: [],
    });
    expect(
      withEagleEyes.events.some(
        (event) =>
          event.type === GameEventType.DamageApplied ||
          event.type === GameEventType.PSRTriggered,
      ),
    ).toBe(false);
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('detonation target-number relief'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-hidden-reveal-detection'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('hidden conventional coordinate'),
    });
  });

  it('applies represented minefield damage when a BattleMech laterally enters a mined hex', () => {
    const target = { q: 1, r: -1 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);

    const { next, events } = runScriptedMove(
      grid,
      target,
      {
        abilities: ['maneuvering_ace'],
        facing: Facing.North,
        secondaryFacing: Facing.North,
      },
      {
        facing: Facing.North,
        capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
      },
    );
    const movementPayload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;
    const damagePayloads = events
      .filter((event) => event.type === GameEventType.DamageApplied)
      .map((event) => event.payload as IDamageAppliedPayload);

    expect(movementPayload?.steps).toEqual([
      expect.objectContaining({
        kind: 'lateral',
        to: target,
        terrainEntered: TerrainType.Mines,
      }),
    ]);
    expect(next.units['player-1']).toMatchObject({
      position: target,
      damageThisPhase: 20,
      armor: {
        left_leg: 11,
        right_leg: 11,
      },
    });
    expect(damagePayloads).toEqual([
      expect.objectContaining({
        unitId: 'player-1',
        location: 'left_leg',
        damage: 10,
      }),
      expect.objectContaining({
        unitId: 'player-1',
        location: 'right_leg',
        damage: 10,
      }),
    ]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('GO_PRONE movement'),
    });
  });

  it('applies represented minefield damage when a BattleMech jumps into a mined hex', () => {
    const target = { q: 2, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);

    const { next, events } = runScriptedMove(
      grid,
      target,
      {},
      {
        movementType: MovementType.Jump,
        capability: { walkMP: 4, runMP: 6, jumpMP: 4 },
      },
    );
    const movementPayload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;
    const damagePayloads = events
      .filter((event) => event.type === GameEventType.DamageApplied)
      .map((event) => event.payload as IDamageAppliedPayload);

    expect(movementPayload?.steps).toEqual([
      expect.objectContaining({
        kind: 'jump',
        to: target,
        terrainEntered: TerrainType.Mines,
      }),
    ]);
    expect(next.units['player-1']).toMatchObject({
      position: target,
      damageThisPhase: 20,
      armor: {
        left_leg: 11,
        right_leg: 11,
      },
    });
    expect(damagePayloads).toEqual([
      expect.objectContaining({
        unitId: 'player-1',
        location: 'left_leg',
        damage: 10,
      }),
      expect.objectContaining({
        unitId: 'player-1',
        location: 'right_leg',
        damage: 10,
      }),
    ]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('GO_PRONE movement'),
    });
  });

  it('does not invent represented minefield damage for explicit non-Mek units', () => {
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);

    const { next, events } = runScriptedMove(
      grid,
      target,
      {
        unitType: UnitType.VEHICLE,
      },
      { movementType: MovementType.Walk },
    );

    expect(next.units['player-1']).toMatchObject({
      position: target,
      pendingPSRs: [],
      damageThisPhase: 0,
    });
    expect(
      events.some(
        (event) =>
          event.type === GameEventType.PSRTriggered ||
          event.type === GameEventType.UnitStuck ||
          event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('non-Mek units'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-non-battlemech-sea-variants'
      ],
    ).toMatchObject({
      level: 'out-of-scope',
      gap: expect.stringContaining('outside this BattleMech suite'),
    });
  });

  it('does not apply represented minefield damage to same-hex non-entry steps', () => {
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);
    const unit = createMinimalUnitState('player-1', GameSide.Player, target);
    const state = {
      gameId: 'runner-minefield-same-hex-entry-guard',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const next = applyMovementMinefieldEffects({
      currentState: state,
      events,
      gameId: state.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: target,
          to: target,
          terrainEntered: TerrainType.Mines,
        },
      ],
    });

    expect(next.units['player-1']).toMatchObject({
      position: target,
      damageThisPhase: 0,
      armor: unit.armor,
    });
    expect(events).toEqual([]);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('GO_PRONE movement'),
    });
  });

  it('does not double-apply represented minefield damage for repeated entries into the same coordinate', () => {
    const source = { q: 0, r: 0 };
    const target = { q: 1, r: 0 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);
    const unit = createMinimalUnitState('player-1', GameSide.Player, source);
    const state = {
      gameId: 'runner-minefield-duplicate-coordinate-entry-guard',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    const next = applyMovementMinefieldEffects({
      currentState: state,
      events,
      gameId: state.gameId,
      grid,
      unitId: 'player-1',
      steps: [
        {
          kind: 'forward',
          index: 0,
          from: source,
          to: target,
          terrainEntered: TerrainType.Mines,
        },
        {
          kind: 'lateral',
          index: 1,
          from: source,
          to: target,
          terrainEntered: TerrainType.Mines,
        },
      ],
    });

    expect(next.units['player-1']).toMatchObject({
      damageThisPhase: 20,
      armor: {
        left_leg: 11,
        right_leg: 11,
      },
    });
    expect(
      events.filter((event) => event.type === GameEventType.DamageApplied),
    ).toHaveLength(2);
    expect(
      events.filter((event) => event.type === GameEventType.PSRTriggered),
    ).toHaveLength(1);
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-hidden-reveal-detection'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('hidden conventional coordinate'),
    });
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
        'minefield-represented-entry-side-paths'
      ].evidence,
    ).toEqual(
      expect.stringContaining(
        'per-declaration duplicate-coordinate suppression',
      ),
    );
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-hidden-reveal-detection']
        .evidence,
    ).toEqual(expect.stringContaining('detectedBySides'));
    expect(
      TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-hidden-reveal-detection']
        .gap,
    ).toBeUndefined();
  });

  it('queues depth-aware entering-water PSRs from complex terrain features', () => {
    const target = { q: 1, r: 0 };
    const grid = setTerrainFeatures(createMinimalGrid(3), target, [
      { type: TerrainType.Water, level: 2 },
    ]);

    const { next, events } = runScriptedMove(
      grid,
      target,
      {
        abilities: ['tm_frogman'],
        unitType: UnitType.BATTLEMECH,
      },
      { movementType: MovementType.Walk },
    );
    const payloads = psrPayloads(events);

    expect(next.units['player-1'].position).toEqual(target);
    expect(next.units['player-1'].pendingPSRs).toContainEqual(
      expect.objectContaining({
        reasonCode: PSRTrigger.EnteringWater,
        terrainLevel: 2,
        additionalModifier: 0,
      }),
    );
    expect(payloads).toContainEqual(
      expect.objectContaining({
        unitId: 'player-1',
        reasonCode: PSRTrigger.EnteringWater,
        additionalModifier: 0,
        triggerSource: expect.stringMatching(/^movement-step:/),
      }),
    );
    expect(SPA_COMBAT_SUPPORT.tm_frogman).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('water-entry PSR'),
    });
  });

  it('queues building-collapse PSRs when explicit unit load exceeds building CF', () => {
    const target = { q: 1, r: 0 };
    const grid = setTerrainFeatures(createMinimalGrid(3), target, [
      { type: TerrainType.Building, level: 2, constructionFactor: 40 },
    ]);

    const { next, events } = runScriptedMove(
      grid,
      target,
      {
        tonnage: 55,
        unitType: UnitType.BATTLEMECH,
      },
      { movementType: MovementType.Walk },
    );
    const payloads = psrPayloads(events);

    expect(next.units['player-1'].position).toEqual(target);
    expect(next.units['player-1'].pendingPSRs).toContainEqual(
      expect.objectContaining({
        reasonCode: PSRTrigger.BuildingCollapse,
        additionalModifier: 0,
      }),
    );
    expect(payloads).toContainEqual(
      expect.objectContaining({
        unitId: 'player-1',
        reasonCode: PSRTrigger.BuildingCollapse,
        triggerSource: expect.stringMatching(/^movement-step:/),
      }),
    );
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.BuildingCollapse],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('constructionFactor'),
    });
    expect(TERRAIN_TYPE_PSR_COMBAT_SUPPORT[TerrainType.Building]).toMatchObject(
      {
        level: 'integrated',
        evidence: expect.stringContaining('constructionFactor'),
      },
    );
  });

  it('does not invent building-collapse PSRs without explicit load metadata', () => {
    const target = { q: 1, r: 0 };
    const grid = setTerrainFeatures(createMinimalGrid(3), target, [
      { type: TerrainType.Building, level: 2, constructionFactor: 40 },
    ]);

    const { next, events } = runScriptedMove(
      grid,
      target,
      {
        unitType: UnitType.BATTLEMECH,
      },
      { movementType: MovementType.Walk },
    );

    expect(next.units['player-1'].position).toEqual(target);
    expect(next.units['player-1'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({
        reasonCode: PSRTrigger.BuildingCollapse,
      }),
    );
    expect(psrPayloads(events)).not.toContainEqual(
      expect.objectContaining({
        reasonCode: PSRTrigger.BuildingCollapse,
      }),
    );
  });

  it('queues water-exit PSRs when a unit leaves water terrain', () => {
    const target = { q: 1, r: 0 };
    const grid = setTerrain(
      createMinimalGrid(3),
      { q: 0, r: 0 },
      TerrainType.Water,
    );

    const { next, events } = runScriptedMove(grid, target);
    const payloads = psrPayloads(events);

    expect(next.units['player-1'].position).toEqual(target);
    expect(next.units['player-1'].pendingPSRs).toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.ExitingWater }),
    );
    expect(payloads).toContainEqual(
      expect.objectContaining({
        reasonCode: PSRTrigger.ExitingWater,
        triggerSource: expect.stringMatching(/^movement-step:/),
      }),
    );
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.ExitingWater],
    ).toMatchObject({
      level: 'integrated',
    });
  });

  it('queues skid PSRs when a running unit changes facing on pavement', () => {
    const target = { q: 0, r: -1 };
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Pavement);

    const { next, events } = runScriptedMove(
      grid,
      target,
      {},
      {
        movementType: MovementType.Run,
        facing: Facing.Northeast,
      },
    );
    const payloads = psrPayloads(events);

    expect(next.units['player-1'].position).toEqual(target);
    expect(next.units['player-1'].pendingPSRs).toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.Skidding }),
    );
    expect(payloads).toContainEqual(
      expect.objectContaining({
        additionalModifier: -1,
        unitId: 'player-1',
        reasonCode: PSRTrigger.Skidding,
        triggerSource: expect.stringMatching(/^movement-step:/),
      }),
    );
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.Skidding],
    ).toMatchObject({
      level: 'integrated',
    });
  });

  it('queues damaged-movement PSRs when a damaged unit runs', () => {
    const target = { q: 1, r: 0 };
    const componentDamage = {
      ...DEFAULT_COMPONENT_DAMAGE,
      gyroHits: 1,
      actuators: { [ActuatorType.HIP]: true },
    };

    const { next, events } = runScriptedMove(
      createMinimalGrid(3),
      target,
      { componentDamage },
      { movementType: MovementType.Run },
    );
    const payloads = psrPayloads(events);

    expect(next.units['player-1'].position).toEqual(target);
    expect(next.units['player-1'].pendingPSRs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reasonCode: PSRTrigger.RunningDamagedHip }),
        expect.objectContaining({ reasonCode: PSRTrigger.RunningDamagedGyro }),
      ]),
    );
    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reasonCode: PSRTrigger.RunningDamagedHip,
          triggerSource: expect.stringMatching(/^movement-step:/),
        }),
        expect.objectContaining({
          reasonCode: PSRTrigger.RunningDamagedGyro,
          triggerSource: expect.stringMatching(/^movement-step:/),
        }),
      ]),
    );
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.RunningDamagedHip],
    ).toMatchObject({ level: 'integrated' });
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.RunningDamagedGyro],
    ).toMatchObject({ level: 'integrated' });
  });

  it('commits scripted voluntary go-prone as a same-hex movement step', () => {
    const unit = createMinimalUnitState('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    });
    const state = {
      gameId: 'runner-go-prone-validation',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];
    const violations: Parameters<typeof runMovementPhase>[0]['violations'] = [];

    const next = runMovementPhase({
      state,
      botPlayer: new ScriptedGoPronePlayer('player-1'),
      grid: createMinimalGrid(3),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: state.gameId,
    });
    const payload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 0, r: 0 },
      movementType: MovementType.Stationary,
      mpUsed: 1,
      heatGenerated: 0,
      hexesMoved: 0,
      straightHexes: 0,
      turningMpCost: 1,
      netDisplacement: 0,
      steps: [
        expect.objectContaining({
          kind: 'goProne',
          at: { q: 0, r: 0 },
          mpCost: 1,
        }),
      ],
    });
    expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
    expect(next.units['player-1'].prone).toBe(true);
    expect(MOVEMENT_RULE_COMBAT_SUPPORT.prone).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('runner AI'),
    });
  });

  it('detaches swarming infantry when a BattleMech commits voluntary go-prone', () => {
    const host = createMinimalUnitState('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    });
    const swarmer = {
      ...createMinimalUnitState('opponent-1', GameSide.Opponent, {
        q: 0,
        r: 0,
      }),
      unitType: UnitType.INFANTRY,
      isSwarming: true,
      combatState: {
        kind: 'squad',
        state: {
          unitId: 'opponent-1',
          squadSize: 0,
          troopers: [],
          swarmingUnitId: 'player-1',
          legAttackCommitted: false,
          mimeticActiveThisTurn: true,
          stealthKind: 'mimetic',
          hasMagneticClamp: true,
          hasVibroClaws: false,
          vibroClawCount: 0,
          destroyed: false,
        },
      },
    } as const;
    const state = {
      gameId: 'runner-go-prone-swarmer-dislodge',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': host,
        'opponent-1': swarmer,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];
    const violations: Parameters<typeof runMovementPhase>[0]['violations'] = [];

    const next = runMovementPhase({
      state,
      botPlayer: new ScriptedGoPronePlayer('player-1'),
      grid: createMinimalGrid(3),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: state.gameId,
    });
    const movementPayload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;
    const dismountPayload = events.find(
      (event) => event.type === GameEventType.SwarmDismounted,
    )?.payload as ISwarmDismountedPayload | undefined;

    expect(movementPayload).toMatchObject({
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 0, r: 0 },
      movementType: MovementType.Stationary,
      steps: [expect.objectContaining({ kind: 'goProne' })],
    });
    expect(dismountPayload).toEqual({
      unitId: 'opponent-1',
      targetUnitId: 'player-1',
      cause: 'go_prone_dislodgement',
      dismountDamage: 0,
    });
    expect(next.units['player-1'].prone).toBe(true);
    expect(next.units['opponent-1'].isSwarming).toBe(false);
    expect(
      next.units['opponent-1'].combatState?.kind === 'squad'
        ? next.units['opponent-1'].combatState.state.swarmingUnitId
        : undefined,
    ).toBeUndefined();
    expect(
      next.units['opponent-1'].combatState?.kind === 'squad'
        ? next.units['opponent-1'].combatState.state.mimeticActiveThisTurn
        : undefined,
    ).toBe(true);
  });

  it('commits hull-down go-prone at zero MP and clears hull-down posture', () => {
    const unit = {
      ...createMinimalUnitState('player-1', GameSide.Player, { q: 0, r: 0 }),
      hullDown: true,
      infernoBurning: true,
    };
    const state = {
      gameId: 'runner-hull-down-go-prone-validation',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];
    const violations: Parameters<typeof runMovementPhase>[0]['violations'] = [];

    const next = runMovementPhase({
      state,
      botPlayer: new ScriptedGoPronePlayer('player-1'),
      grid: createMinimalGrid(3),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: state.gameId,
    });
    const payload = events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload as IMovementDeclaredPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'player-1',
      mpUsed: 0,
      turningMpCost: 0,
      steps: [
        expect.objectContaining({
          kind: 'goProne',
          mpCost: 0,
        }),
      ],
    });
    expect(next.units['player-1'].prone).toBe(true);
    expect(next.units['player-1'].hullDown).toBe(false);
    expect(next.units['player-1'].infernoBurning).toBe(false);
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-hull-down-zero-mp-transition'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('zero-MP same-hex GO_PRONE'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('getGoProneMpCost'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('applyMovementEvent'),
        }),
      ]),
    });
    expect(MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('infernoBurning state'),
    });
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].gap,
    ).toBeUndefined();
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].evidence,
    ).toContain('go-prone-enemy-occupied-start-follow-up-block');
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].sourceRefs,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('infernoBurning'),
        }),
      ]),
    );
  });

  it('blocks runner follow-up movement from another-unit occupied start hex without blocking go-prone', () => {
    const grid = setOccupant(createMinimalGrid(3), { q: 0, r: 0 }, 'enemy-1');
    const movement = runScriptedMove(grid, { q: 1, r: 0 });
    const unit = createMinimalUnitState('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    });
    const state = {
      gameId: 'runner-enemy-occupied-start-go-prone',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];
    const violations: Parameters<typeof runMovementPhase>[0]['violations'] = [];

    const prone = runMovementPhase({
      state,
      botPlayer: new ScriptedGoPronePlayer('player-1'),
      grid,
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: state.gameId,
    });

    expectSingleMovementInvalid(movement.events, 'InvalidDestination');
    expect(movement.events[0]?.payload).toMatchObject({
      details:
        'Unit cannot make follow-up movement from a start hex occupied by another unit',
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: GameEventType.MovementDeclared,
        payload: expect.objectContaining({
          unitId: 'player-1',
          steps: [expect.objectContaining({ kind: 'goProne' })],
        }),
      }),
    );
    expect(prone.units['player-1'].prone).toBe(true);
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT[
        'go-prone-enemy-occupied-start-follow-up-block'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'same-hex GO_PRONE posture remains legal',
      ),
    });
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT[
        'go-prone-enemy-occupied-start-follow-up-block'
      ].gap,
    ).toBeUndefined();
    expect(MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'go-prone-enemy-occupied-start-follow-up-block',
      ),
    });
    expect(
      MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].gap,
    ).toBeUndefined();
  });

  it('rejects scripted go-prone for explicit non-Mek units', () => {
    const unit = {
      ...createMinimalUnitState('player-1', GameSide.Player, { q: 0, r: 0 }),
      unitType: UnitType.VEHICLE,
    };
    const state = {
      gameId: 'runner-non-mek-go-prone-validation',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];
    const violations: Parameters<typeof runMovementPhase>[0]['violations'] = [];

    const next = runMovementPhase({
      state,
      botPlayer: new ScriptedGoPronePlayer('player-1'),
      grid: createMinimalGrid(3),
      invariantRunner: new InvariantRunner(),
      violations,
      events,
      gameId: state.gameId,
    });

    expect(
      events.some((event) => event.type === GameEventType.MovementDeclared),
    ).toBe(false);
    expect(next.units['player-1'].prone).toBe(false);
  });

  it('resolves a successful stand-up PSR before committing prone movement', () => {
    const target = { q: 1, r: 0 };

    const { next, events } = runScriptedMove(
      createMinimalGrid(3),
      target,
      {
        prone: true,
        piloting: 5,
        pilotWounds: 1,
      },
      { random: fixedRandom(0.99) },
    );
    const triggered = events.find(
      (event) => event.type === GameEventType.PSRTriggered,
    )?.payload as IPSRTriggeredPayload | undefined;
    const resolved = events.find(
      (event) => event.type === GameEventType.PSRResolved,
    )?.payload as IPSRResolvedPayload | undefined;
    const stood = events.find((event) => event.type === GameEventType.UnitStood)
      ?.payload as IUnitStoodPayload | undefined;

    expect(
      events.some((event) => event.type === GameEventType.MovementDeclared),
    ).toBe(false);
    expect(triggered).toMatchObject({
      unitId: 'player-1',
      reasonCode: PSRTrigger.StandingUp,
      basePilotingSkill: 5,
    });
    expect(resolved).toMatchObject({
      unitId: 'player-1',
      reasonCode: PSRTrigger.StandingUp,
      targetNumber: 6,
      passed: true,
    });
    expect(stood).toMatchObject({
      unitId: 'player-1',
      roll: 12,
      targetNumber: 6,
    });
    expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
    expect(next.units['player-1'].prone).toBe(false);
    expect(next.units['player-1'].pendingPSRs ?? []).toEqual([]);
    expect(COMBAT_COMMAND_ACTION_SUPPORT['movement.stand']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('InteractiveSession.attemptStandUp'),
    });
    expect(MOVEMENT_RULE_COMBAT_SUPPORT.stand).toMatchObject({
      level: 'integrated',
    });
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.StandingUp],
    ).toMatchObject({
      level: 'integrated',
    });
  });

  it('applies Animal Mimicry to runner quad Mek stand-up PSRs', () => {
    const { events } = runScriptedMove(
      createMinimalGrid(3),
      { q: 1, r: 0 },
      {
        abilities: ['animal_mimic'],
        isQuad: true,
        piloting: 5,
        prone: true,
      },
      { random: fixedRandom(0.5) },
    );
    const resolved = events.find(
      (event) => event.type === GameEventType.PSRResolved,
    )?.payload as IPSRResolvedPayload | undefined;

    expect(resolved).toMatchObject({
      unitId: 'player-1',
      reasonCode: PSRTrigger.StandingUp,
      targetNumber: 4,
      modifiers: -1,
      roll: 8,
      passed: true,
    });
    expect(SPA_COMBAT_SUPPORT['animal-mimicry']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Animal Mimicry'),
    });
  });

  it.each<readonly [string, number, number, string, string]>([
    ['vdni', 4, -1, 'vdni-piloting-target-number-application', 'vdni'],
    [
      'bvdni',
      5,
      0,
      'vdni-piloting-target-number-application',
      'leaving bvdni out',
    ],
    [
      'proto_dni',
      2,
      -3,
      'proto-dni-piloting-target-number-application',
      'proto_dni',
    ],
  ])(
    'applies source-backed %s piloting target-number behavior to stand-up PSRs',
    (abilityId, targetNumber, modifiers, supportRef, evidenceText) => {
      const { events } = runScriptedMove(
        createMinimalGrid(3),
        { q: 1, r: 0 },
        {
          abilities: [abilityId],
          piloting: 5,
          prone: true,
          unitType: UnitType.BATTLEMECH,
        },
        { random: fixedRandom(0.5) },
      );
      const resolved = events.find(
        (event) => event.type === GameEventType.PSRResolved,
      )?.payload as IPSRResolvedPayload | undefined;

      expect(resolved).toMatchObject({
        unitId: 'player-1',
        reasonCode: PSRTrigger.StandingUp,
        targetNumber,
        modifiers,
        roll: 8,
        passed: true,
      });
      expect(
        PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
          supportRef as keyof typeof PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT
        ],
      ).toMatchObject({
        level: 'integrated',
        evidence: expect.stringContaining(evidenceText),
      });
    },
  );

  it('suppresses VDNI piloting target-number relief when neural interface is disconnected', () => {
    const { events } = runScriptedMove(
      createMinimalGrid(3),
      { q: 1, r: 0 },
      {
        abilities: ['vdni'],
        neuralInterfaceActive: false,
        piloting: 5,
        prone: true,
        unitType: UnitType.BATTLEMECH,
      },
      { random: fixedRandom(0.5) },
    );
    const resolved = events.find(
      (event) => event.type === GameEventType.PSRResolved,
    )?.payload as IPSRResolvedPayload | undefined;

    expect(resolved).toMatchObject({
      unitId: 'player-1',
      reasonCode: PSRTrigger.StandingUp,
      targetNumber: 5,
      modifiers: 0,
      roll: 8,
      passed: true,
    });
  });

  it('applies No Arms to runner stand-up PSRs', () => {
    const { events } = runScriptedMove(
      createMinimalGrid(3),
      { q: 1, r: 0 },
      {
        piloting: 5,
        prone: true,
        unitQuirks: ['no_arms'],
      },
      { random: fixedRandom(0.99) },
    );
    const resolved = events.find(
      (event) => event.type === GameEventType.PSRResolved,
    )?.payload as IPSRResolvedPayload | undefined;

    expect(resolved).toMatchObject({
      unitId: 'player-1',
      reasonCode: PSRTrigger.StandingUp,
      targetNumber: 7,
      modifiers: 2,
      roll: 12,
      passed: true,
    });
    expect(QUIRK_COMBAT_SUPPORT.no_arms).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('stand-up paths'),
    });
  });

  it('keeps a unit prone when the stand-up PSR fails without fall damage', () => {
    const { next, events } = runScriptedMove(
      createMinimalGrid(3),
      { q: 1, r: 0 },
      {
        prone: true,
        piloting: 5,
      },
      { random: fixedRandom(0) },
    );
    const resolved = events.find(
      (event) => event.type === GameEventType.PSRResolved,
    )?.payload as IPSRResolvedPayload | undefined;

    expect(resolved).toMatchObject({
      unitId: 'player-1',
      reasonCode: PSRTrigger.StandingUp,
      targetNumber: 5,
      roll: 2,
      passed: false,
    });
    expect(events.some((event) => event.type === GameEventType.UnitStood)).toBe(
      false,
    );
    expect(events.some((event) => event.type === GameEventType.UnitFell)).toBe(
      false,
    );
    expect(events.some((event) => event.type === GameEventType.PilotHit)).toBe(
      false,
    );
    expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
    expect(next.units['player-1'].prone).toBe(true);
    expect(next.units['player-1'].pendingPSRs ?? []).toEqual([]);
  });
});
