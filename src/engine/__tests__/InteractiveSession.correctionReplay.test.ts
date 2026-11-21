/** @spec openspec/specs/gm-combat-interventions/spec.md */
jest.mock('../adapters/CompendiumAdapter', () => ({ adaptUnit: jest.fn() }));

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GamePhase,
  GameSide,
  GameStatus,
  type IGameUnit,
} from '@/types/gameplay';
import { deriveState } from '@/utils/gameplay/gameState';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

function makeSession(d6Roller?: D6Roller): InteractiveSession {
  const units: IGameUnit[] = [GameSide.Player, GameSide.Opponent].map(
    (side) => ({
      id: side,
      name: side,
      side,
      unitRef: side,
      pilotRef: side,
      gunnery: 4,
      piloting: 5,
    }),
  );
  return new InteractiveSession(
    7,
    30,
    new SeededRandom(99),
    createMinimalGrid(7),
    [],
    [],
    units,
    {},
    d6Roller,
  );
}

async function correctHeat(session: InteractiveSession): Promise<void> {
  await session.applyGmCorrection(
    [{ family: 'heat-ammo', unitId: GameSide.Player, after: { heat: 17 } }],
    {
      expectedHeadEventId: session.getSession().events.at(-1)!.id,
      storage: { appendEvent: async () => undefined },
    },
  );
}

describe('GM correction event durability', () => {
  it('retains heat 17 through initiative → movement, before ordinary cooling', async () => {
    const session = makeSession();
    expect(session.getState().units[GameSide.Player].heat).toBe(0);
    expect(session.getState().phase).toBe(GamePhase.Initiative);
    await correctHeat(session);
    expect(session.getState().units[GameSide.Player].heat).toBe(17);
    expect(session.getState().status).toBe(GameStatus.Active);

    session.advancePhase();

    expect(session.getState().phase).toBe(GamePhase.Movement);
    expect(session.getState().status).toBe(GameStatus.Active);
    expect(session.getState().units[GameSide.Player].heat).toBe(17);
  });

  it('records the correction at its own event boundary and survives JSON replay', async () => {
    const session = makeSession();
    const before = session.getSession().events;
    await correctHeat(session);
    const corrected = session.getSession();

    expect(corrected.events).toHaveLength(before.length + 1);
    expect(corrected.events.slice(0, before.length)).toStrictEqual(before);
    const events = JSON.parse(JSON.stringify(corrected.events)) as typeof before;
    expect(deriveState(corrected.id, events)).toStrictEqual(corrected.currentState);
  });

  it('leaves the injected roller untouched through correction and recovered fold', async () => {
    const roller = jest.fn(() => { throw new Error('correction-drew-dice'); });
    const session = makeSession(roller);
    await correctHeat(session);
    const recovered = InteractiveSession.fromHydratedSession(session.getSession(), {
      random: new SeededRandom(99), d6Roller: roller,
    });
    expect(recovered.getState()).toStrictEqual(session.getState());
    expect(roller).not.toHaveBeenCalled();
  });

  it('retains committed state after failed persistence', async () => {
    const session = makeSession();
    const before = session.getSession();
    await expect(session.applyGmCorrection(
      [{ family: 'heat-ammo', unitId: GameSide.Player, after: { heat: 17 } }],
      { expectedHeadEventId: before.events.at(-1)!.id, storage: { appendEvent: async () => { throw new Error('disk-failure'); } } },
    )).rejects.toThrow('disk-failure');
    expect(session.getSession()).toBe(before);
    await correctHeat(session);
    expect(session.getState().units[GameSide.Player].heat).toBe(17);
  });

  it('refuses ordinary commands while the correction transaction is pending', async () => {
    const session = makeSession();
    const before = session.getSession();
    let release: (() => void) | undefined;
    const pendingWrite = new Promise<void>(resolve => { release = resolve; });
    const correction = session.applyGmCorrection(
      [{ family: 'heat-ammo', unitId: GameSide.Player, after: { heat: 17 } }],
      { expectedHeadEventId: before.events.at(-1)!.id, storage: { appendEvent: () => pendingWrite } },
    );
    expect(() => session.advancePhase()).toThrow('gm-correction-commit-pending');
    expect(session.getSession()).toBe(before);
    release?.();
    await correction;
    expect(session.getState().units[GameSide.Player].heat).toBe(17);
  });

  it('refuses an obsolete preview head before appending to storage', async () => {
    const session = makeSession();
    const appendEvent = jest.fn(async () => undefined);
    await expect(session.applyGmCorrection(
      [{ family: 'heat-ammo', unitId: GameSide.Player, after: { heat: 17 } }],
      { expectedHeadEventId: 'old-head', storage: { appendEvent } },
    )).rejects.toThrow('gm-correction-stale-head');
    expect(appendEvent).not.toHaveBeenCalled();
    expect(session.getState().units[GameSide.Player].heat).toBe(0);
  });
});
