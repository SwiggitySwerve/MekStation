/**
 * A recovered session with no persisted seed (an old save) still loads and
 * finishes a turn (C-1c PR 0; Root ruling 2026-11-10).
 *
 * The End-phase PSR drain now throws when a session has no roller, so
 * `fromSessionAsync` hands a seedless save the explicitly named legacy
 * unseeded roller. It rolls as `main` did for these saves (the ambient
 * `Math.random` d6) - never a fixed seed, which would give every old save
 * the same dice on every load. OPEN (D-8): resume design (b) assigns a
 * fresh persisted seed at recovery instead.
 */

// The catalog adapter is mocked as in InteractiveSession.recovery.test.ts:
// recovery re-derives adapted units from `unitRef`, and this test is about
// dice, not the catalog.
jest.mock('../adapters/CompendiumAdapter', () => ({
  adaptUnit: jest.fn(),
}));

import { GameEventType, GameSide } from '@/types/gameplay';
import { Facing, LockState, MovementType } from '@/types/gameplay';

import type { IAdaptedUnit } from '../types';

import { adaptUnit } from '../adapters/CompendiumAdapter';
import { InteractiveSession } from '../InteractiveSession';
import {
  advanceHostToEndWithQueuedPsr,
  makePsrFixtureHost,
} from './InteractiveSession.psrEndFixture.test-helpers';

function adaptedStub(unitRef: string, side: GameSide): IAdaptedUnit {
  return {
    id: unitRef,
    side,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: { center_torso: 31 },
    structure: { center_torso: 21 },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

describe('InteractiveSession.fromSessionAsync without a persisted seed', () => {
  beforeEach(() => {
    (adaptUnit as jest.Mock).mockImplementation(
      async (unitRef: string, options: { side: GameSide }) =>
        adaptedStub(unitRef, options.side),
    );
  });

  it('loads an old save and finishes the turn, rolling the PSR as main did', async () => {
    const host = makePsrFixtureHost();
    advanceHostToEndWithQueuedPsr(host);
    const snapshot = host.getSession();
    expect(snapshot.config.seed).toBeUndefined();
    const recovered = await InteractiveSession.fromSessionAsync(snapshot);
    const turnBefore = recovered.getState().turn;

    const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    let thrown: unknown;
    try {
      recovered.advancePhase(); // End -> next turn: resolves the queued PSR
    } catch (error) {
      thrown = error;
    }
    const ambientReads = random.mock.calls.length;
    random.mockRestore();

    expect(thrown).toBeUndefined();
    // The legacy unseeded roller: the same ambient d6 main used.
    expect(ambientReads).toBeGreaterThan(0);
    expect(recovered.getState().turn).toBe(turnBefore + 1);
    expect(
      recovered
        .getSession()
        .events.filter((event) => event.type === GameEventType.PSRResolved),
    ).toHaveLength(1);
  });

  it('does not give two loads of the same old save fixed dice', async () => {
    const host = makePsrFixtureHost();
    advanceHostToEndWithQueuedPsr(host);
    const snapshot = host.getSession();

    const rollsFor = async (value: number): Promise<unknown> => {
      const recovered = await InteractiveSession.fromSessionAsync(snapshot);
      const random = jest.spyOn(Math, 'random').mockReturnValue(value);
      try {
        recovered.advancePhase();
      } finally {
        random.mockRestore();
      }
      const resolved = recovered
        .getSession()
        .events.filter((event) => event.type === GameEventType.PSRResolved);
      return resolved[0]?.payload;
    };

    // The dice follow the ambient source, so a fixed seed would make these equal.
    expect(await rollsFor(0.0)).not.toEqual(await rollsFor(0.99));
  });
});
