import {
  GameEventType,
  GameSide,
  RangeBracket,
  type IAttackInvalidPayload,
  type IGameConfig,
  type IGameSession,
  type IGameUnit,
  type IWeaponAttack,
} from '@/types/gameplay';

import {
  advancePhase,
  createGameSession,
  declareAttack,
  rollInitiative,
  startGame,
} from '../gameSessionCore';

function buildConfig(): IGameConfig {
  return {
    mapRadius: 5,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
  } as IGameConfig;
}

function buildUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'attacker',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-1',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
    {
      id: 'target',
      name: 'Hunchback',
      side: GameSide.Opponent,
      unitRef: 'hbk-4g',
      pilotRef: 'pilot-2',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
}

function buildMediumLaserAttack(): readonly IWeaponAttack[] {
  return [
    {
      weaponId: 'medium-laser-1',
      weaponName: 'Medium Laser',
      damage: 5,
      heat: 3,
      minRange: 0,
      shortRange: 3,
      mediumRange: 6,
      longRange: 9,
    } as unknown as IWeaponAttack,
  ];
}

function setupWeaponAttackSession(): IGameSession {
  let session = createGameSession(buildConfig(), buildUnits());
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session);
  return advancePhase(session);
}

function invalidEventsSince(
  result: IGameSession,
  initialEventCount: number,
): readonly IAttackInvalidPayload[] {
  return result.events
    .slice(initialEventCount)
    .filter((event) => event.type === GameEventType.AttackInvalid)
    .map((event) => event.payload as IAttackInvalidPayload);
}

describe('declareAttack invalid target handling', () => {
  it.each([
    {
      name: 'missing target',
      targetId: 'missing-target',
      mutate: (session: IGameSession) => session,
      details: "Target 'missing-target' does not exist",
    },
    {
      name: 'destroyed target',
      targetId: 'target',
      mutate: (session: IGameSession): IGameSession => ({
        ...session,
        currentState: {
          ...session.currentState,
          units: {
            ...session.currentState.units,
            target: {
              ...session.currentState.units.target,
              destroyed: true,
            },
          },
        },
      }),
      details: "Target 'target' is destroyed",
    },
    {
      name: 'same-side target',
      targetId: 'target',
      mutate: (session: IGameSession): IGameSession => ({
        ...session,
        currentState: {
          ...session.currentState,
          units: {
            ...session.currentState.units,
            target: {
              ...session.currentState.units.target,
              side: GameSide.Player,
            },
          },
        },
      }),
      details: "Target 'target' is on the same side as attacker",
    },
    {
      name: 'retreated target',
      targetId: 'target',
      mutate: (session: IGameSession): IGameSession => ({
        ...session,
        currentState: {
          ...session.currentState,
          units: {
            ...session.currentState.units,
            target: {
              ...session.currentState.units.target,
              hasRetreated: true,
            },
          },
        },
      }),
      details: "Target 'target' has retreated",
    },
    {
      name: 'ejected target',
      targetId: 'target',
      mutate: (session: IGameSession): IGameSession => ({
        ...session,
        currentState: {
          ...session.currentState,
          units: {
            ...session.currentState.units,
            target: {
              ...session.currentState.units.target,
              hasEjected: true,
            },
          },
        },
      }),
      details: "Target 'target' has ejected",
    },
  ])(
    'emits AttackInvalid before declaration for $name',
    ({ details, mutate, targetId }) => {
      const session = mutate(setupWeaponAttackSession());
      const initialEventCount = session.events.length;

      const result = declareAttack(
        session,
        'attacker',
        targetId,
        buildMediumLaserAttack(),
        3,
        RangeBracket.Short,
      );

      expect(invalidEventsSince(result, initialEventCount)).toEqual([
        {
          attackerId: 'attacker',
          targetId,
          weaponId: 'medium-laser-1',
          reason: 'InvalidTarget',
          details,
        },
      ]);
      expect(
        result.events
          .slice(initialEventCount)
          .some((event) => event.type === GameEventType.AttackDeclared),
      ).toBe(false);
      expect(result.currentState.units.attacker.heat).toBe(
        session.currentState.units.attacker.heat,
      );
      expect(result.currentState.units.target?.damageThisPhase ?? 0).toBe(
        session.currentState.units.target?.damageThisPhase ?? 0,
      );
    },
  );

  it('emits AttackInvalid before declaration for an evading attacker', () => {
    const session = setupWeaponAttackSession();
    const evadingSession: IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        units: {
          ...session.currentState.units,
          attacker: {
            ...session.currentState.units.attacker,
            isEvading: true,
          },
        },
      },
    };
    const initialEventCount = evadingSession.events.length;

    const result = declareAttack(
      evadingSession,
      'attacker',
      'target',
      buildMediumLaserAttack(),
      3,
      RangeBracket.Short,
    );

    expect(invalidEventsSince(result, initialEventCount)).toEqual([
      {
        attackerId: 'attacker',
        targetId: 'target',
        weaponId: 'medium-laser-1',
        reason: 'AttackerEvading',
        details:
          "Attacker 'attacker' is evading and cannot fire ranged weapons",
      },
    ]);
    expect(
      result.events
        .slice(initialEventCount)
        .some((event) => event.type === GameEventType.AttackDeclared),
    ).toBe(false);
    expect(result.currentState.units.attacker.heat).toBe(
      evadingSession.currentState.units.attacker.heat,
    );
    expect(result.currentState.units.target.damageThisPhase ?? 0).toBe(
      evadingSession.currentState.units.target.damageThisPhase ?? 0,
    );
  });

  it('emits AttackInvalid before declaration for a sprinting attacker', () => {
    const session = setupWeaponAttackSession();
    const sprintingSession: IGameSession = {
      ...session,
      currentState: {
        ...session.currentState,
        units: {
          ...session.currentState.units,
          attacker: {
            ...session.currentState.units.attacker,
            sprintedThisTurn: true,
          },
        },
      },
    };
    const initialEventCount = sprintingSession.events.length;

    const result = declareAttack(
      sprintingSession,
      'attacker',
      'target',
      buildMediumLaserAttack(),
      3,
      RangeBracket.Short,
    );

    expect(invalidEventsSince(result, initialEventCount)).toEqual([
      {
        attackerId: 'attacker',
        targetId: 'target',
        weaponId: 'medium-laser-1',
        reason: 'AttackerSprinted',
        details: "Attacker 'attacker' sprinted and cannot fire ranged weapons",
      },
    ]);
    expect(
      result.events
        .slice(initialEventCount)
        .some((event) => event.type === GameEventType.AttackDeclared),
    ).toBe(false);
    expect(result.currentState.units.attacker.heat).toBe(
      sprintingSession.currentState.units.attacker.heat,
    );
    expect(result.currentState.units.target.damageThisPhase ?? 0).toBe(
      sprintingSession.currentState.units.target.damageThisPhase ?? 0,
    );
  });
});
