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
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { COMBAT_COMMAND_ACTION_SUPPORT } from '../CombatActionSupport';
import { RUNNER_PSR_TRIGGER_COMBAT_SUPPORT } from '../CombatLifecycleSupport';
import {
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import { TERRAIN_TYPE_PSR_COMBAT_SUPPORT } from '../CombatTerrainEnvironmentSupport';
import { runMovementPhase } from '../phases/movement';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
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
  const unit = {
    ...createMinimalUnitState('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    }),
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
      options.facing,
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
    const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Water);

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
    });
    expect(next.units['player-1'].position).toEqual(target);
    expect(next.units['player-1'].hexesMovedThisTurn).toBe(2);
    expect(next.units['player-1'].heat).toBe(0);
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
