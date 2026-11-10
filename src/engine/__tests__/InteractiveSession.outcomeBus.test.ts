import 'fake-indexeddb/auto';
import type { IWeapon } from '@/simulation/ai/types';

jest.mock('../adapters/CompendiumAdapter', () => ({ adaptUnit: jest.fn() }));

import { IDBFactory } from 'fake-indexeddb';

import {
  _resetCombatOutcomeBus,
  subscribeToCombatOutcome,
} from '@/engine/combatOutcomeBus';
import { createPendingOutcomePublication } from '@/engine/combatOutcomeJournal';
import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import {
  InteractiveSession,
  recoverInteractiveSession,
} from '@/engine/InteractiveSession';
import { MatchLogStorage, matchLogStorage } from '@/lib/p2p/matchLogStorage';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  GameSide,
  GameEventType,
  LockState,
  MovementType,
  type IGameUnit,
  type IGameSession,
} from '@/types/gameplay';
import { defaultD6Roller } from '@/utils/gameplay/diceTypes';
import { logger } from '@/utils/logger';

import type { IAdaptedUnit } from '../types';

import * as adapter from '../adapters/CompendiumAdapter';

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    configurable: true,
    writable: true,
  });
}

function makeWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function makeAdaptedUnit(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: 0, r: -2 } : { q: 0, r: 2 },
    facing: side === GameSide.Player ? Facing.North : Facing.South,
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
    weapons: [makeWeapon(`${id}-medium-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function makeGameUnits(): IGameUnit[] {
  return [
    {
      id: 'unit-player',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'unit-opponent',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function makeSession(): InteractiveSession {
  return new InteractiveSession(
    7,
    30,
    new SeededRandom(42),
    createMinimalGrid(7),
    [makeAdaptedUnit('unit-player', GameSide.Player)],
    [makeAdaptedUnit('unit-opponent', GameSide.Opponent)],
    makeGameUnits(),
  );
}

describe('InteractiveSession outcome bus hardening', () => {
  let acknowledgementWrites: Promise<void>[];

  beforeEach(() => {
    acknowledgementWrites = [];
    const acknowledge = matchLogStorage.acknowledgeOutcomePublication;
    jest
      .spyOn(matchLogStorage, 'acknowledgeOutcomePublication')
      .mockImplementation((...args) => {
        const write = acknowledge(...args);
        acknowledgementWrites.push(write);
        return write;
      });
  });

  afterEach(async () => {
    try {
      await matchLogStorage.flushPendingWrites();
      await Promise.all(acknowledgementWrites);
    } finally {
      _resetCombatOutcomeBus();
      jest.restoreAllMocks();
    }
  });

  it('does not latch the publish guard when every outcome listener throws', () => {
    const session = makeSession();
    const listenerError = new Error('localStorage quota exceeded');
    const loggerSpy = jest
      .spyOn(logger, 'error')
      .mockImplementation(() => undefined);
    subscribeToCombatOutcome(() => {
      throw listenerError;
    });

    expect(() => session.concede(GameSide.Player)).not.toThrow();

    expect(session.hasPublishedOutcome()).toBe(false);
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('CombatOutcomeReady'),
      listenerError,
    );
  });

  it('does not republish a recovered historical completed session without a receipt', () => {
    const live = makeSession();
    live.concede(GameSide.Player);
    const listener = jest.fn();
    subscribeToCombatOutcome(listener);
    const recovered = InteractiveSession.fromSession(
      live.getSession(),
      defaultD6Roller,
    );

    expect(recovered.hasPublishedOutcome()).toBe(true);
    recovered.getOutcome();
    recovered.getOutcome();
    expect(listener).not.toHaveBeenCalled();
  });

  it('prevents reentrant outcome delivery while a listener derives the result', () => {
    const session = makeSession();
    const listener = jest.fn(() => session.getOutcome());
    subscribeToCombatOutcome(listener);
    session.concede(GameSide.Player);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.hasPublishedOutcome()).toBe(true);
  });
});

describe('InteractiveSession persisted outcome publication', () => {
  beforeEach(() => {
    matchLogStorage.close();
    Object.defineProperty(globalThis, 'indexedDB', {
      value: new IDBFactory(),
      configurable: true,
      writable: true,
    });
    jest
      .mocked(adapter.adaptUnit)
      .mockImplementation(async (_unitRef, options) =>
        makeAdaptedUnit(
          options?.side === GameSide.Opponent ? 'unit-opponent' : 'unit-player',
          options?.side ?? GameSide.Player,
        ),
      );
  });

  afterEach(async () => {
    await matchLogStorage.flushPendingWrites();
    matchLogStorage.close();
    _resetCombatOutcomeBus();
    jest.restoreAllMocks();
  });

  async function seedLiveSession(): Promise<InteractiveSession> {
    const live = makeSession();
    const session = live.getSession();
    const writes = session.events.map((event) =>
      matchLogStorage.appendEvent(session.id, event),
    );
    await matchLogStorage.flushPendingWrites();
    await Promise.all(writes);
    return live;
  }

  async function recover(
    live: InteractiveSession,
  ): Promise<InteractiveSession> {
    const hydrated = await InteractiveSession.fromMatchLog(
      live.getSession().id,
    );
    return InteractiveSession.fromSessionAsync(hydrated);
  }

  it('recovers a new pending completion, delivers once, and restores its acknowledgement on another recovery', async () => {
    const live = await seedLiveSession();
    live.concede(GameSide.Player);
    await matchLogStorage.flushPendingWrites();
    const terminal = live.getSession().events.at(-1)!;
    expect(terminal.type).toBe(GameEventType.GameEnded);
    expect(
      await matchLogStorage.getOutcomePublication(
        live.getSession().id,
        terminal.id,
      ),
    ).toEqual(expect.objectContaining({ state: 'pending' }));

    const recovered = await recover(live);
    expect(recovered.hasPublishedOutcome()).toBe(false);
    const listener = jest.fn();
    subscribeToCombatOutcome(listener);
    const acknowledge = jest.spyOn(
      matchLogStorage,
      'acknowledgeOutcomePublication',
    );
    recovered.getOutcome();
    recovered.getOutcome();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(recovered.hasPublishedOutcome()).toBe(true);
    expect(acknowledge).toHaveBeenCalledTimes(1);
    await acknowledge.mock.results[0].value;
    expect(
      await matchLogStorage.getOutcomePublication(
        live.getSession().id,
        terminal.id,
      ),
    ).toEqual(expect.objectContaining({ state: 'acknowledged' }));

    matchLogStorage.close();
    const again = await recover(live);
    expect(again.hasPublishedOutcome()).toBe(true);
    again.getOutcome();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('never republishes a pre-migration completed log with no publication receipt', async () => {
    const live = makeSession();
    live.concede(GameSide.Player);
    const historical: IGameSession = live.getSession();
    const dbName = 'historical-outcome-v2';
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, 2);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('matchEvents', {
          keyPath: ['matchId', 'sequence'],
        });
        request.result.createObjectStore('matches', { keyPath: 'matchId' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        ['matchEvents', 'matches'],
        'readwrite',
      );
      for (const event of historical.events)
        transaction.objectStore('matchEvents').put({
          matchId: historical.id,
          sequence: event.sequence,
          event,
          savedAt: event.timestamp,
        });
      transaction.objectStore('matches').put({
        matchId: historical.id,
        status: 'completed',
        hostPeerId: null,
        guestPeerId: null,
        lastActivity: historical.updatedAt,
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    const storage = new MatchLogStorage({ dbName });
    await storage.initialize();
    const replayedTerminal = storage.appendEvent(
      historical.id,
      historical.events.at(-1)!,
    );
    await storage.flushPendingWrites();
    await replayedTerminal;
    const listener = jest.fn();
    subscribeToCombatOutcome(listener);
    const recovered = await recoverInteractiveSession(historical.id, storage);
    expect(recovered.hasPublishedOutcome()).toBe(true);
    recovered.getOutcome();
    expect(listener).not.toHaveBeenCalled();
    storage.close();
  });

  it('retries a pending completion through the production cold-recovery entry point', async () => {
    const live = await seedLiveSession();
    live.concede(GameSide.Player);
    await matchLogStorage.flushPendingWrites();
    matchLogStorage.close();
    const listener = jest.fn();
    subscribeToCombatOutcome(listener);
    const acknowledge = jest.spyOn(
      matchLogStorage,
      'acknowledgeOutcomePublication',
    );
    const recovered = await recoverInteractiveSession(live.getSession().id);
    expect(recovered.hasPublishedOutcome()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    await acknowledge.mock.results[0].value;
    const events = recovered.getSession().events;
    const again = await recoverInteractiveSession(live.getSession().id);
    expect(again.hasPublishedOutcome()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(again.getSession().events).toEqual(events);
  });

  it('keeps a failed acknowledgement pending and retries without changing gameplay events', async () => {
    const live = await seedLiveSession();
    const failure = new Error('receipt write failed');
    const log = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const acknowledge = jest
      .spyOn(matchLogStorage, 'acknowledgeOutcomePublication')
      .mockRejectedValueOnce(failure);
    const listener = jest.fn();
    subscribeToCombatOutcome(listener);
    live.concede(GameSide.Player);
    const events = [...live.getSession().events];
    await expect(acknowledge.mock.results[0].value).rejects.toThrow(failure);
    expect(live.hasPublishedOutcome()).toBe(false);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Match log save failed'),
      failure,
    );
    acknowledge.mockRestore();
    const successful = jest.spyOn(
      matchLogStorage,
      'acknowledgeOutcomePublication',
    );
    live.getOutcome();
    await successful.mock.results[0].value;
    expect(live.hasPublishedOutcome()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(live.getSession().events).toEqual(events);
  });

  it('acknowledges the same injected storage that supplied the recovered pending receipt', async () => {
    const live = makeSession();
    live.concede(GameSide.Player);
    const session = live.getSession();
    const storage = new MatchLogStorage({
      dbName: 'injected-publication-backend',
      scheduleFrame: () => undefined,
    });
    const writes = session.events.map((event) =>
      storage.appendEvent(
        session.id,
        event,
        event.type === GameEventType.GameEnded
          ? createPendingOutcomePublication(session.id, event)
          : undefined,
      ),
    );
    await storage.flushPendingWrites();
    await Promise.all(writes);
    const acknowledge = jest.spyOn(storage, 'acknowledgeOutcomePublication');
    const defaultAcknowledge = jest.spyOn(
      matchLogStorage,
      'acknowledgeOutcomePublication',
    );
    const listener = jest.fn();
    subscribeToCombatOutcome(listener);
    const recovered = await recoverInteractiveSession(session.id, storage);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(recovered.hasPublishedOutcome()).toBe(true);
    expect(acknowledge).toHaveBeenCalledTimes(1);
    expect(defaultAcknowledge).not.toHaveBeenCalled();
    await acknowledge.mock.results[0].value;
    expect(
      await storage.getOutcomePublication(
        session.id,
        session.events.at(-1)!.id,
      ),
    ).toEqual(expect.objectContaining({ state: 'acknowledged' }));
    storage.close();
  });

  it('never lets a scratch completion publish or persist a receipt for the live session', async () => {
    const live = await seedLiveSession();
    const append = jest.spyOn(matchLogStorage, 'appendEvent');
    const acknowledge = jest.spyOn(
      matchLogStorage,
      'acknowledgeOutcomePublication',
    );
    const listener = jest.fn();
    subscribeToCombatOutcome(listener);
    const scratch = InteractiveSession.fromHydratedSession(live.getSession(), {
      random: new SeededRandom(42),
      suppressOutcomePublication: true,
    });
    scratch.concede(GameSide.Player);
    expect(scratch.isGameOver()).toBe(true);
    expect(scratch.hasPublishedOutcome()).toBe(true);
    expect(live.isGameOver()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
    expect(acknowledge).not.toHaveBeenCalled();
  });

  it('does not publish replicated completed history that never owned outcome publication', async () => {
    const live = makeSession();
    live.concede(GameSide.Player);
    const session = live.getSession();
    const storage = new MatchLogStorage({
      dbName: 'replicated-completion',
      scheduleFrame: () => undefined,
    });
    const writes = session.events.map((event) =>
      storage.appendEvent(session.id, event),
    );
    await storage.flushPendingWrites();
    await Promise.all(writes);
    const listener = jest.fn();
    subscribeToCombatOutcome(listener);
    const recovered = await recoverInteractiveSession(session.id, storage);
    expect(recovered.hasPublishedOutcome()).toBe(true);
    expect(listener).not.toHaveBeenCalled();
    storage.close();
  });
});
