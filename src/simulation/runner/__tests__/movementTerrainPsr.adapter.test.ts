import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  PSRTrigger,
  type IGameEvent,
  type IGameState,
  type IPSRTriggeredPayload,
  type IUnitStuckPayload,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  planMovementTerrainEffects,
  type TerrainBearingMovementStep,
} from '@/utils/gameplay/movement/terrainPsrTriggers';

import { commitValidatedMovement } from '../phases/movementCommit';
import { queueMovementTerrainPSRs } from '../phases/movementTerrainPsr';
import { createMinimalUnitState } from '../SimulationRunnerSupport';

const A = { q: 0, r: 0 };
const B = { q: 1, r: 0 };
const C = { q: 2, r: 0 };

function setup(terrain: Readonly<Record<string, string>>) {
  const grid = createHexGrid({ radius: 4 });
  for (const [key, tag] of Object.entries(terrain)) {
    const hex = grid.hexes.get(key);
    if (hex) grid.hexes.set(key, { ...hex, terrain: tag });
  }
  const unit = {
    ...createMinimalUnitState('m1', GameSide.Player, A),
    piloting: 4,
  };
  const state = {
    gameId: 'g',
    turn: 3,
    phase: GamePhase.Movement,
    units: { m1: unit },
  } as unknown as IGameState;
  return { grid, state };
}

describe('runner queueMovementTerrainPSRs adapter', () => {
  it('queues each planned PSR exactly once and emits one PSRTriggered per PSR in plan order', () => {
    const { grid, state } = setup({
      [coordToKey(B)]: JSON.stringify([
        { type: TerrainType.Water, level: 2 },
        { type: TerrainType.Rubble, level: 1 },
      ]),
      [coordToKey(C)]: 'swamp',
    });
    const steps: TerrainBearingMovementStep[] = [
      { kind: 'forward', index: 0, from: A, to: B },
      { kind: 'forward', index: 1, from: B, to: C },
    ];
    const planned = planMovementTerrainEffects({
      grid,
      unitId: 'm1',
      unit: state.units.m1,
      movementType: MovementType.Walk,
      steps,
    });
    const events: IGameEvent[] = [];

    const next = queueMovementTerrainPSRs({
      currentState: state,
      events,
      gameId: 'g',
      grid,
      unitId: 'm1',
      movementType: MovementType.Walk,
      steps,
    });

    const plannedPsrs = planned.flatMap((effect) =>
      effect.kind === 'psr' ? [effect.psr] : [],
    );
    expect(plannedPsrs.map((psr) => psr.reasonCode)).toEqual([
      PSRTrigger.EnteringWater,
      PSRTrigger.EnteringRubble,
      PSRTrigger.SwampBogDown,
    ]);
    expect(next.units.m1.pendingPSRs).toEqual(plannedPsrs);
    expect(events.map((event) => event.type)).toEqual(
      plannedPsrs.map(() => GameEventType.PSRTriggered),
    );
    expect(
      events.map((event) => {
        const payload = event.payload as IPSRTriggeredPayload;
        return [
          event.sequence,
          event.turn,
          event.phase,
          payload.reasonCode,
          payload.additionalModifier,
          payload.triggerSource,
          payload.basePilotingSkill,
        ];
      }),
    ).toEqual([
      [
        0,
        3,
        GamePhase.Movement,
        PSRTrigger.EnteringWater,
        0,
        'movement-step:0',
        4,
      ],
      [
        1,
        3,
        GamePhase.Movement,
        PSRTrigger.EnteringRubble,
        0,
        'movement-step:0',
        4,
      ],
      [
        2,
        3,
        GamePhase.Movement,
        PSRTrigger.SwampBogDown,
        0,
        'movement-step:1',
        4,
      ],
    ]);
  });

  it('sticks a BattleMech that jumps into a swamp without queueing a PSR', () => {
    const { grid, state } = setup({ [coordToKey(C)]: 'swamp' });
    const events: IGameEvent[] = [];

    const next = queueMovementTerrainPSRs({
      currentState: state,
      events,
      gameId: 'g',
      grid,
      unitId: 'm1',
      movementType: MovementType.Jump,
      steps: [{ kind: 'jump', index: 0, from: A, to: C }],
    });

    expect(next.units.m1.isStuck).toBe(true);
    expect(next.units.m1.pendingPSRs ?? []).toEqual([]);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(GameEventType.UnitStuck);
    expect(events[0].payload as IUnitStuckPayload).toEqual({
      unitId: 'm1',
      reason: 'Jumped into bog-down terrain',
      reasonCode: PSRTrigger.SwampBogDown,
    });
  });

  it('passes the motive mode through, so a swimming Mek entering water does not roll', () => {
    const water = JSON.stringify([{ type: TerrainType.Water, level: 2 }]);
    const { grid, state } = setup({ [coordToKey(B)]: water });
    const run = (movementMode?: 'biped_swim' | 'walk') => {
      const events: IGameEvent[] = [];
      const next = queueMovementTerrainPSRs({
        currentState: state,
        events,
        gameId: 'g',
        grid,
        unitId: 'm1',
        movementType: MovementType.Walk,
        ...(movementMode ? { movementMode } : {}),
        steps: [{ kind: 'forward', index: 0, from: A, to: B }],
      });
      return next.units.m1.pendingPSRs ?? [];
    };

    expect(run('biped_swim')).toEqual([]);
    expect(run('walk').map((psr) => psr.reasonCode)).toEqual([
      PSRTrigger.EnteringWater,
    ]);
  });

  it('commitValidatedMovement threads the validated motive mode into the terrain producer', () => {
    const water = JSON.stringify([{ type: TerrainType.Water, level: 1 }]);
    const { grid, state } = setup({ [coordToKey(B)]: water });
    const commit = (movementMode: 'biped_swim' | 'walk') => {
      const events: IGameEvent[] = [];
      const next = commitValidatedMovement({
        currentState: state,
        events,
        gameId: 'g',
        grid,
        unitId: 'm1',
        unit: state.units.m1,
        payload: {
          unitId: 'm1',
          from: A,
          to: B,
          facing: state.units.m1.facing as Facing,
          movementType: MovementType.Walk,
          mpUsed: 1,
          heatGenerated: 0,
        },
        validationCapability: { walkMP: 4, runMP: 6, jumpMP: 0, movementMode },
        mpCost: 2,
        heatGenerated: 0,
        d6Roller: () => 6,
      });
      return (next.units.m1.pendingPSRs ?? []).map((psr) => psr.reasonCode);
    };

    expect(commit('biped_swim')).not.toContain(PSRTrigger.EnteringWater);
    expect(commit('walk')).toContain(PSRTrigger.EnteringWater);
  });
});
