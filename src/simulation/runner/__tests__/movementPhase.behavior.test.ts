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
  type IMovementDeclaredPayload,
  type IPSRResolvedPayload,
  type IPSRTriggeredPayload,
  type IUnitStoodPayload,
} from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { UnitType } from '@/types/unit';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { COMBAT_COMMAND_ACTION_SUPPORT } from '../CombatActionSupport';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { RUNNER_PSR_TRIGGER_COMBAT_SUPPORT } from '../CombatLifecycleSupport';
import {
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import { TERRAIN_TYPE_PSR_COMBAT_SUPPORT } from '../CombatTerrainEnvironmentSupport';
import { runMovementPhase } from '../phases/movement';
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

function runScriptedMove(
  grid: IHexGrid,
  target: IHexCoordinate,
  unitOverrides: Partial<ReturnType<typeof createMinimalUnitState>> = {},
  options: {
    readonly movementType?: MovementType;
    readonly facing?: Facing;
    readonly capability?: IMovementCapability;
    readonly environmentalConditions?: IEnvironmentalConditions;
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

describe('runMovementPhase movement validation parity', () => {
  it('rejects invalid ground movement before committing the bot payload', () => {
    const target = { q: 1, r: 0 };
    const grid = setElevation(createMinimalGrid(3), target, 3);

    const { next, events } = runScriptedMove(grid, target);

    expect(events).toEqual([]);
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

    expect(events).toEqual([]);
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
        }),
        expect.objectContaining({
          fixedTargetNumber: 3,
          reasonCode: PSRTrigger.SuperchargerFailure,
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
    expect(windyMove.events).toEqual([]);
    expect(windyMove.next.units['player-1'].position).toEqual({ q: 0, r: 0 });
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.wind).toMatchObject({
      level: 'integrated',
    });
  });

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

    expect(events).toEqual([]);
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
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['masc-side-paths'],
    ).toMatchObject({
      level: 'helper-only',
      gap: expect.stringContaining('Alternate MASC option tables'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({ kind: 'megamek-source' }),
      ]),
    });
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

    expect(events).toEqual([]);
    expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
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
        }),
        expect.objectContaining({
          fixedTargetNumber: 3,
          reasonCode: PSRTrigger.SuperchargerFailure,
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
      MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['supercharger-side-paths'],
    ).toMatchObject({
      level: 'helper-only',
      gap: expect.stringContaining('IndustrialMek/support-unit'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({ kind: 'megamek-source' }),
      ]),
    });
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

    expect(events).toEqual([]);
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

    expect(blocked.events).toEqual([]);
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

    expect(events).toEqual([]);
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

  it('commits hull-down go-prone at zero MP and clears hull-down posture', () => {
    const unit = {
      ...createMinimalUnitState('player-1', GameSide.Player, { q: 0, r: 0 }),
      hullDown: true,
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
