import type { IGameSession, IGameUnit, IUnitGameState } from '@/types/gameplay';

import { GameSide } from '@/types/gameplay';

import { useUnitInspectorProjection } from '../useUnitInspectorProjection';

function makeUnit(overrides: Partial<IGameUnit>): IGameUnit {
  return {
    id: 'player-1',
    name: 'Atlas AS7-D',
    side: GameSide.Player,
    unitRef: 'atlas-as7-d',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

function makeUnitState(
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id: 'player-1',
    armor: { CT: 20, LT: 10 },
    structure: { CT: 10, LT: 5 },
    destroyedLocations: [],
    pilotWounds: 0,
    pilotConscious: true,
    heat: 3,
    destroyed: false,
    movementThisTurn: null,
    hexesMovedThisTurn: 0,
    ...overrides,
  } as IUnitGameState;
}

function makeSession(): IGameSession {
  const player = makeUnit({ id: 'player-1', side: GameSide.Player });
  const opponent = makeUnit({
    id: 'opponent-1',
    name: 'Stalker STK-3F',
    side: GameSide.Opponent,
    unitRef: 'stalker-stk-3f',
    pilotRef: 'pilot-2',
  });

  return {
    id: 'session-1',
    createdAt: '2026-06-18T00:00:00.000Z',
    updatedAt: '2026-06-18T00:00:00.000Z',
    config: {
      mapRadius: 4,
      turnLimit: 0,
      victoryConditions: ['destruction'],
      optionalRules: [],
    },
    units: [player, opponent],
    events: [],
    sideOwners: {
      [GameSide.Player]: 'player-owner',
      [GameSide.Opponent]: 'opponent-owner',
    },
    currentState: {
      turn: 3,
      units: {
        'player-1': makeUnitState({ id: 'player-1' }),
        'opponent-1': makeUnitState({ id: 'opponent-1', heat: 9 }),
      },
    } as unknown as IGameSession['currentState'],
  };
}

describe('useUnitInspectorProjection', () => {
  it('returns full friendly detail for the viewer side', () => {
    const projection = useUnitInspectorProjection({
      unitId: 'player-1',
      session: makeSession(),
      viewerPlayerId: 'player-owner',
      viewerSide: GameSide.Player,
      opponentVisibilityScopes: {},
      supplemental: {
        pilotNames: { 'player-1': 'Morgan Kell' },
      },
    });

    expect(projection?.kind).toBe('friendly');
    expect(projection).toMatchObject({
      name: 'Atlas AS7-D',
      pilotName: 'Morgan Kell',
      heat: 3,
      totalArmorRemaining: 30,
    });
  });

  it('uses sideOwners for opponent tier lookup and redacts hidden contacts', () => {
    const projection = useUnitInspectorProjection({
      unitId: 'opponent-1',
      session: makeSession(),
      viewerPlayerId: 'player-owner',
      viewerSide: GameSide.Player,
      opponentVisibilityScopes: {
        'opponent-owner': 'hidden',
      },
    });

    expect(projection).toEqual({
      kind: 'redacted',
      unitId: 'opponent-1',
      contactLabel: 'Unknown Contact',
    });
  });
});
