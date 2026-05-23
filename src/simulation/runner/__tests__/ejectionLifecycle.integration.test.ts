import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { buildUtilityCommands } from '@/components/gameplay/TacticalActionDock/commands/utilityCommands';
import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import { toServerIntent, ejectIntent } from '@/lib/multiplayer/gameIntentMap';
import { dispatchToEngine } from '@/lib/multiplayer/server/ServerMatchHostEngineDispatch';
import {
  Facing,
  GameEventType,
  GameSide,
  type IGameUnit,
} from '@/types/gameplay';

function battleMechUnit(
  id: string,
  chassis: string,
  variant: string,
  tonnage: number,
  equipment: readonly { readonly id: string; readonly location: string }[],
): IFullUnit {
  return {
    id,
    chassis,
    variant,
    tonnage,
    techBase: 'INNER_SPHERE',
    era: 'SUCCESSION_WARS',
    unitType: 'BATTLEMECH',
    engine: { type: 'FUSION', rating: tonnage * 4 },
    armor: {
      type: 'STANDARD',
      allocation: {
        LEFT_ARM: 10,
        RIGHT_ARM: 10,
        LEFT_TORSO: { front: 14, rear: 4 },
        RIGHT_TORSO: { front: 14, rear: 4 },
        CENTER_TORSO: { front: 20, rear: 6 },
        HEAD: 9,
        LEFT_LEG: 16,
        RIGHT_LEG: 16,
      },
    },
    structure: { type: 'STANDARD' },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 4, jump: 0 },
    equipment,
  } as unknown as IFullUnit;
}

function gameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  };
}

describe('representative BattleMech ejection lifecycle integration', () => {
  it('routes command intent through server dispatch into targetability and outcome removal', () => {
    const player = adaptUnitFromData(
      battleMechUnit('catalog-atlas', 'Atlas', 'AS7-D', 100, [
        { id: 'medium-laser', location: 'CENTER_TORSO' },
        { id: 'ac-20', location: 'RIGHT_TORSO' },
      ]),
      {
        side: GameSide.Player,
        position: { q: 0, r: 2 },
        facing: Facing.North,
      },
    );
    const opponent = adaptUnitFromData(
      battleMechUnit('catalog-hunchback', 'Hunchback', 'HBK-4G', 50, [
        { id: 'medium-laser', location: 'LEFT_ARM' },
        { id: 'ac-20', location: 'RIGHT_TORSO' },
      ]),
      {
        side: GameSide.Opponent,
        position: { q: 0, r: -2 },
        facing: Facing.South,
      },
    );
    const session = new GameEngine({
      seed: 42,
      turnLimit: 30,
      mapRadius: 5,
    }).createInteractiveSession(
      [player],
      [opponent],
      [
        gameUnit(player.id, GameSide.Player),
        gameUnit(opponent.id, GameSide.Opponent),
      ],
    );

    const before = session.getState().units[player.id];
    const ejectCommand = buildUtilityCommands().find(
      (command) => command.id === 'utility.eject',
    );

    expect(
      ejectCommand?.availability({
        activeUnitId: player.id,
        canAct: true,
      } as never).available,
    ).toBe(true);
    expect(ejectCommand?.commit({} as never)).toMatchObject({
      actionId: 'eject',
    });

    const wireIntent = toServerIntent(
      ejectIntent('player-peer', { unitId: player.id }),
    );
    expect(wireIntent).toEqual({ kind: 'Eject', unitId: player.id });

    dispatchToEngine(session, wireIntent!);

    const ejectionEvent = session
      .getSession()
      .events.find((event) => event.type === GameEventType.UnitEjected);
    const after = session.getState().units[player.id];

    expect(ejectionEvent?.payload).toMatchObject({
      unitId: player.id,
      reason: 'player_declared',
    });
    expect(after.hasEjected).toBe(true);
    expect(after.destroyed).toBe(false);
    expect(after.armor).toEqual(before.armor);
    expect(after.structure).toEqual(before.structure);
    expect(session.getAvailableActions(player.id)).toEqual({
      validMoves: [],
      validTargets: [],
    });
    expect(
      session
        .getAvailableActions(opponent.id)
        .validTargets.some((target) => target.unitId === player.id),
    ).toBe(false);

    const outcome = session.getResult();
    expect(outcome).toMatchObject({
      winner: 'opponent',
      reason: 'elimination',
      playerUnitsDestroyed: 0,
      playerUnitsSurviving: 0,
      opponentUnitsSurviving: 1,
    });
  });
});
