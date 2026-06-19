import {
  ArmorPipState,
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  IGameCreatedPayload,
  IGameEvent,
  IGameUnit,
  IMechToken,
  IUnitToken,
  TokenUnitType,
} from '@/types/gameplay';

export function makeUnit(
  overrides: Partial<IGameUnit> & Pick<IGameUnit, 'id' | 'name' | 'side'>,
): IGameUnit {
  return {
    unitRef: 'atlas-as7-d',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

export function makeEvent(
  overrides: Partial<IGameEvent> &
    Pick<IGameEvent, 'type' | 'payload' | 'sequence'>,
): IGameEvent {
  return {
    id: `evt-${overrides.sequence}`,
    gameId: 'test-game',
    timestamp: '2026-05-07T00:00:00.000Z',
    turn: 1,
    phase: GamePhase.Movement,
    side: GameSide.Player,
    ...overrides,
  };
}

export function makeStandardGameCreatedEvent(): IGameEvent {
  const payload: IGameCreatedPayload = {
    config: {
      mapRadius: 17,
      turnLimit: 0,
      victoryConditions: ['destruction'],
      optionalRules: [],
    },
    units: [
      makeUnit({ id: 'player-1', name: 'Atlas AS7-D', side: GameSide.Player }),
      makeUnit({
        id: 'opponent-2',
        name: 'Stalker STK-3F',
        side: GameSide.Opponent,
      }),
    ],
  };
  return makeEvent({
    sequence: 0,
    type: GameEventType.GameCreated,
    payload,
  });
}

export function requireMechToken(
  token: IUnitToken | undefined,
  unitId: string,
): IMechToken {
  expect(token?.unitType).toBe(TokenUnitType.Mech);

  if (token?.unitType !== TokenUnitType.Mech) {
    throw new Error(`Expected ${unitId} to be a Mech token`);
  }

  return token;
}

export function requireHumanoidArmorPipState(
  state: ArmorPipState | undefined,
): Extract<ArmorPipState, { readonly archetype: 'humanoid' }> {
  expect(state?.archetype).toBe('humanoid');

  if (state?.archetype !== 'humanoid') {
    throw new Error('Expected humanoid armor pip state');
  }

  return state;
}
