/**
 * A recovered session with no persisted seed still names its dice
 * (C-1c PR 0, Option A; the "reach test 2" of the proposal).
 *
 * `fromSessionAsync` used to hand the constructor `undefined` when the
 * persisted config carried no seed, so the End-phase PSR drain rolled
 * from `Math.random`. It now uses the legacy `0xc0ffee` constant the AI
 * stream already used.
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
  it('resolves the End-phase PSR from a named roller, not Math.random', async () => {
    (adaptUnit as jest.Mock).mockImplementation(
      async (unitRef: string, options: { side: GameSide }) =>
        adaptedStub(unitRef, options.side),
    );
    const host = makePsrFixtureHost();
    advanceHostToEndWithQueuedPsr(host);
    const snapshot = host.getSession();
    expect(snapshot.config.seed).toBeUndefined();
    const recovered = await InteractiveSession.fromSessionAsync(snapshot);

    const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    let thrown: unknown;
    try {
      recovered.advancePhase();
    } catch (error) {
      thrown = error;
    }
    const ambientReads = random.mock.calls.length;
    random.mockRestore();

    expect(thrown).toBeUndefined();
    expect(ambientReads).toBe(0);
    expect(
      recovered
        .getSession()
        .events.filter((event) => event.type === GameEventType.PSRResolved),
    ).toHaveLength(1);
  });
});
