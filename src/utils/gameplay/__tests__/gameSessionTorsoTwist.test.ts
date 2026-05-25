import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  type IFacingChangedPayload,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  createGameSession,
  startGame,
  torsoTwist,
  validateTorsoTwist,
} from '../gameSession';

function makeConfig(): IGameConfig {
  return {
    mapRadius: 5,
    turnLimit: 30,
    victoryConditions: ['elimination'],
    optionalRules: [],
  };
}

function makeUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'player-1',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-a',
      gunnery: 4,
      piloting: 5,
      unitType: UnitType.BATTLEMECH,
    },
  ];
}

function makeWeaponAttackSession(
  unitOverrides: Partial<IGameSession['currentState']['units'][string]> = {},
): IGameSession {
  const session = startGame(
    createGameSession(makeConfig(), makeUnits()),
    GameSide.Player,
  );
  return {
    ...session,
    currentState: {
      ...session.currentState,
      status: GameStatus.Active,
      phase: GamePhase.WeaponAttack,
      units: {
        ...session.currentState.units,
        'player-1': {
          ...session.currentState.units['player-1'],
          facing: Facing.North,
          secondaryFacing: Facing.North,
          lockState: LockState.Pending,
          ...unitOverrides,
        },
      },
    },
  };
}

describe('torsoTwist', () => {
  it('emits FacingChanged with secondary facing without locking attack declaration', () => {
    const session = makeWeaponAttackSession();

    const next = torsoTwist(session, 'player-1', Facing.Northeast);

    const event = next.events.at(-1);
    expect(event?.type).toBe(GameEventType.FacingChanged);
    expect(event?.payload as IFacingChangedPayload).toMatchObject({
      unitId: 'player-1',
      secondaryFacing: Facing.Northeast,
      torsoTwist: 'left',
    });
    expect(next.currentState.units['player-1']).toMatchObject({
      facing: Facing.North,
      secondaryFacing: Facing.Northeast,
      lockState: LockState.Pending,
    });
    expect(next.currentState.activationIndex).toBe(
      session.currentState.activationIndex,
    );
  });

  it('rejects no-twist, prone, bracing, and already-twisted states', () => {
    const cases: Array<
      readonly [string, Partial<IGameSession['currentState']['units'][string]>]
    > = [
      ['no-twist quirk', { unitQuirks: ['no_twist'] }],
      ['prone unit', { prone: true }],
      ['bracing unit', { isBracing: true }],
      ['already twisted unit', { secondaryFacing: Facing.Northeast }],
    ];

    for (const [, overrides] of cases) {
      const session = makeWeaponAttackSession(overrides);
      expect(torsoTwist(session, 'player-1', Facing.Northeast)).toBe(session);
    }
  });

  it('allows two-hexside secondary facing only with ext_twist', () => {
    const normal = makeWeaponAttackSession();
    expect(validateTorsoTwist(normal, 'player-1', Facing.Southeast)).toEqual({
      ok: false,
      reason: 'invalid-facing',
    });

    const extended = makeWeaponAttackSession({ unitQuirks: ['ext_twist'] });
    const next = torsoTwist(extended, 'player-1', Facing.Southeast);
    expect(next.currentState.units['player-1'].secondaryFacing).toBe(
      Facing.Southeast,
    );
  });
});
