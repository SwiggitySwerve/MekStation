/**
 * Wave 4 C1 PR2, site 1: the `ejectInteractiveSessionUnit` guard.
 *
 * The guard reads "still in play" through `getUnitOperability(...).onField`.
 * Over the whole lifecycle flag domain it must append a `UnitEjected` event
 * exactly when the frozen pre-delegation formula
 * (`!(destroyed || hasRetreated || hasEjected)`) says the unit is in play.
 * Only the guard is under test: event persistence and finalization are mocked.
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  type IGameSession,
} from '@/types/gameplay';
import {
  FLAG_DOMAIN,
  beforeLeftPlay,
  flagLabel,
  unitWith,
} from '@/utils/gameplay/__tests__/unitFlagDomain.test-helpers';

import type { IInteractiveSessionRuntimeContext } from '../InteractiveSession.runtime';

import { ejectInteractiveSessionUnit } from '../InteractiveSession.commands';
import { appendAndPersistInteractiveSessionEvent } from '../InteractiveSession.sessionEvents';

jest.mock('../InteractiveSession.sessionEvents', () => ({
  ...jest.requireActual('../InteractiveSession.sessionEvents'),
  appendAndPersistInteractiveSessionEvent: jest.fn(),
}));
jest.mock('../InteractiveSession.lifecycle', () => ({
  ...jest.requireActual('../InteractiveSession.lifecycle'),
  tryFinalizeAndPublishInteractiveSession: jest.fn(),
}));

const appended = appendAndPersistInteractiveSessionEvent as jest.Mock;

function contextFor(
  units: IGameSession['currentState']['units'],
  status = GameStatus.Active,
): IInteractiveSessionRuntimeContext {
  const session = {
    id: 'g',
    events: [],
    currentState: {
      gameId: 'g',
      status,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units,
      turnEvents: [],
    },
  } as unknown as IGameSession;
  return { getSession: () => session } as IInteractiveSessionRuntimeContext;
}

beforeEach(() => {
  appended.mockClear();
});

describe('ejectInteractiveSessionUnit guard (C1 PR2 site 1)', () => {
  it('ejects exactly the units the frozen formula keeps in play', () => {
    let ejected = 0;
    for (const flags of FLAG_DOMAIN) {
      appended.mockClear();
      const unit = unitWith('u', GameSide.Player, flags);
      ejectInteractiveSessionUnit(contextFor({ u: unit }), 'u');

      const events = appended.mock.calls.map(([, event]) => event);
      const expected = beforeLeftPlay(flags) ? [] : [GameEventType.UnitEjected];
      expect({
        at: flagLabel(flags),
        types: events.map((event) => event.type),
      }).toEqual({ at: flagLabel(flags), types: expected });
      ejected += events.length;
    }
    // Both outcomes occur, so the comparison above is not vacuous.
    expect(ejected).toBeGreaterThan(0);
    expect(ejected).toBeLessThan(FLAG_DOMAIN.length);
  });

  it('keeps the guards around it: unknown unit and inactive session', () => {
    ejectInteractiveSessionUnit(contextFor({}), 'missing');
    ejectInteractiveSessionUnit(
      contextFor({ u: unitWith('u', GameSide.Player) }, GameStatus.Completed),
      'u',
    );
    expect(appended).not.toHaveBeenCalled();
  });
});
