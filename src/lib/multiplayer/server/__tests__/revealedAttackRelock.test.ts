import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { InteractiveSession } from '@/engine/InteractiveSession';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';
import {
  createPilotHitEvent,
  createShutdownCheckEvent,
  createUnitDestroyedEvent,
  createUnitEjectedEvent,
  createUnitRetreatedEvent,
} from '@/utils/gameplay/gameEvents';
import {
  canAdvancePhase,
  hydrateGameSessionFromEvents,
  lockAttack,
  lockMovement,
} from '@/utils/gameplay/gameSession';
import { getUnitOperability } from '@/utils/gameplay/unitOperability';

import type { IMatchStore } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost } from '../ServerMatchHost';
import * as bootstrap from '../ServerMatchHostBootstrap';
import { digestCommandPostState } from '../ServerMatchHostDecision';

jest.mock('../ServerMatchHostBootstrap', () => {
  const actual = jest.requireActual<
    typeof import('../ServerMatchHostBootstrap')
  >('../ServerMatchHostBootstrap');
  return { ...actual, buildHostSession: jest.fn(actual.buildHostSession) };
});

const MATCH_ID = 'match-revealed-relock';
const ACTIVE_IDS = ['lock-player', 'lock-opponent'];
const NON_ACTING_IDS = [
  'destroyed',
  'shutdown',
  'unconscious',
  'retreated',
  'ejected',
];

function roster(extraIds: readonly string[] = []): IGameUnit[] {
  return [...ACTIVE_IDS, ...extraIds].map((id) => ({
    id,
    name: id,
    side: id === 'lock-opponent' ? GameSide.Opponent : GameSide.Player,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  }));
}

/** @spec openspec/changes/fix-engine-relock-revealed/specs/game-engine-orchestration/spec.md */
describe.each(['memory', 'sqlite'] as const)(
  'revealed attack locking (%s)',
  (storage) => {
    let store: IMatchStore;
    let durable: DurableMatchStore | undefined;
    let directory: string | undefined;
    let dbPath: string;
    let host: ServerMatchHost | undefined;
    let engine: InteractiveSession;

    beforeEach(() => {
      if (storage === 'sqlite') {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-relock-'));
        dbPath = path.join(directory, 'match.db');
        resetSQLiteService();
        getSQLiteService({ path: dbPath }).initialize();
        durable = new DurableMatchStore({ path: dbPath });
        store = durable;
      } else {
        store = new InMemoryMatchStore({ quiet: true });
      }
    });

    afterEach(async () => {
      await host?.closeMatch();
      durable?.close();
      if (directory) {
        resetSQLiteService();
        fs.rmSync(directory, { recursive: true, force: true });
      }
    });

    async function createHost(extraIds: readonly string[] = []): Promise<void> {
      const now = '2026-06-30T12:00:00.000Z';
      await store.createMatch({
        matchId: MATCH_ID,
        hostPlayerId: 'host-player',
        playerIds: ['host-player', 'guest-player'],
        sideAssignments: [
          { playerId: 'host-player', side: 'player' },
          { playerId: 'guest-player', side: 'opponent' },
        ],
        status: 'active',
        createdAt: now,
        updatedAt: now,
        config: { mapRadius: 4, turnLimit: 5 },
      });

      // Keep a handle for the same domain lock APIs used by hosted actions.
      // The production factory and all of its dice/capture wiring run unchanged.
      const { buildHostSession: build } = jest.requireActual<
        typeof import('../ServerMatchHostBootstrap')
      >('../ServerMatchHostBootstrap');
      const capture = jest
        .spyOn(bootstrap, 'buildHostSession')
        .mockImplementation((input) => {
          const built = build(input);
          engine = built.session;
          return built;
        });
      try {
        host = ServerMatchHost.create(MATCH_ID, store, {
          mapRadius: 4,
          turnLimit: 5,
          random: new SeededRandom(42),
          grid: createMinimalGrid(4),
          playerUnits: [],
          opponentUnits: [],
          gameUnits: roster(extraIds),
          diceSeed: 42,
          journalAuthority: false,
        });
      } finally {
        capture.mockRestore();
      }
      await Promise.resolve();
      await Promise.resolve();
    }

    async function advance(intentId: string): Promise<void> {
      if (!host) throw new Error('Host not created');
      const envelope: IIntent = {
        kind: 'Intent',
        matchId: MATCH_ID,
        ts: nowIso(),
        playerId: 'host-player',
        intentId,
        intent: { kind: 'AdvancePhase' },
      };
      const messages = await host.handleIntent(envelope);
      expect(messages.filter((message) => message.kind === 'Error')).toEqual(
        [],
      );
    }

    function complete(
      lock: typeof lockMovement,
      ids: readonly string[] = ACTIVE_IDS,
    ): void {
      for (const id of ids) {
        const before = engine.getSession();
        const after = lock(before, id);
        for (const event of after.events.slice(before.events.length))
          engine.appendEvent(event);
      }
    }

    async function enterWeaponAttack(): Promise<void> {
      await advance('initiative');
      complete(lockMovement);
      expect(canAdvancePhase(engine.getSession())).toBe(true);
      await advance('movement');
      expect(engine.getSession().currentState.phase).toBe(
        GamePhase.WeaponAttack,
      );
    }

    function expectNoRelockAfterReveal(
      events: readonly IGameEvent[],
      completedIds: readonly string[],
    ): void {
      const reveal = events.findIndex(
        (event) => event.type === GameEventType.AttacksRevealed,
      );
      expect(reveal).toBeGreaterThanOrEqual(0);
      expect(
        events
          .slice(reveal + 1)
          .filter(
            (event) =>
              event.type === GameEventType.AttackLocked &&
              completedIds.includes(event.actorId ?? ''),
          ),
      ).toEqual([]);
    }

    it('legally completes WeaponAttack then advances with the unchanged 12-entry signature and digest', async () => {
      await createHost();
      await enterWeaponAttack();
      complete(lockAttack);
      expect(
        ACTIVE_IDS.map(
          (id) => engine.getSession().currentState.units[id].lockState,
        ),
      ).toEqual([LockState.Revealed, LockState.Revealed]);
      expect(canAdvancePhase(engine.getSession())).toBe(true);
      await advance('weapon');

      const events = await store.getEvents(MATCH_ID);
      expectNoRelockAfterReveal(events, ACTIVE_IDS);
      expect(events.map((event) => `${event.sequence}:${event.type}`)).toEqual([
        '0:game_created',
        '1:game_started',
        '2:initiative_rolled',
        '3:initiative_order_set',
        '4:phase_changed',
        '5:movement_locked',
        '6:movement_locked',
        '7:phase_changed',
        '8:attack_locked',
        '9:attack_locked',
        '10:attacks_revealed',
        '11:phase_changed',
      ]);
      expect(digestCommandPostState(engine.getSession())).toBe(
        '164f29962e280bee5b09130ed0ff5b37475df5a2afe4d267aca665e76c4b5262',
      );
      expect(
        digestCommandPostState(
          hydrateGameSessionFromEvents(engine.getSession().id, events),
        ),
      ).toBe(digestCommandPostState(engine.getSession()));

      if (durable) {
        await host?.closeMatch();
        host = undefined;
        durable.close();
        durable = new DurableMatchStore({ path: dbPath });
        store = durable;
        const reopened = await store.getEvents(MATCH_ID);
        expect(reopened).toEqual(events);
        expect(
          digestCommandPostState(
            hydrateGameSessionFromEvents(engine.getSession().id, reopened),
          ),
        ).toBe(digestCommandPostState(engine.getSession()));
      }
    });

    it('skips a later-key Locked unit that becomes Revealed mid-loop on a mixed-board raw advance', async () => {
      await createHost();
      await enterWeaponAttack();
      expect(Object.keys(engine.getSession().currentState.units)).toEqual(
        ACTIVE_IDS,
      );
      complete(lockAttack, ['lock-opponent']);
      expect(
        ACTIVE_IDS.map(
          (id) => engine.getSession().currentState.units[id].lockState,
        ),
      ).toEqual([LockState.Pending, LockState.Locked]);
      expect(canAdvancePhase(engine.getSession())).toBe(false);
      await advance('mixed-raw-advance');

      const events = await store.getEvents(MATCH_ID);
      expectNoRelockAfterReveal(events, ['lock-opponent']);
      expect(
        events.slice(8).map((event) => [event.type, event.actorId ?? null]),
      ).toEqual([
        [GameEventType.AttackLocked, 'lock-opponent'],
        [GameEventType.AttackLocked, 'lock-player'],
        [GameEventType.AttacksRevealed, null],
        [GameEventType.PhaseChanged, null],
      ]);
      expect(engine.getSession().currentState.phase).toBe(
        GamePhase.PhysicalAttack,
      );
    });

    it('documents current behaviour: ordinary advances still lock non-acting units (separate OPEN)', async () => {
      await createHost(NON_ACTING_IDS);
      const context = (unitId: string) => {
        const session = engine.getSession();
        return {
          gameId: session.id,
          sequence: session.events.length,
          turn: session.currentState.turn,
          phase: session.currentState.phase,
          unitId,
        };
      };
      engine.appendEvent(
        createUnitDestroyedEvent({ ...context('destroyed'), cause: 'damage' }),
      );
      engine.appendEvent(
        createShutdownCheckEvent({
          ...context('shutdown'),
          heatLevel: 30,
          targetNumber: 13,
          roll: 2,
          shutdownOccurred: true,
        }),
      );
      engine.appendEvent(
        createPilotHitEvent({
          ...context('unconscious'),
          wounds: 1,
          totalWounds: 1,
          source: 'head_hit',
          consciousnessCheckRequired: true,
          consciousnessCheckPassed: false,
        }),
      );
      const retreat = context('retreated');
      engine.appendEvent(
        createUnitRetreatedEvent(
          retreat.gameId,
          retreat.sequence,
          retreat.turn,
          retreat.phase,
          retreat.unitId,
          'north',
        ),
      );
      const eject = context('ejected');
      engine.appendEvent(
        createUnitEjectedEvent(
          eject.gameId,
          eject.sequence,
          eject.turn,
          eject.phase,
          eject.unitId,
          'player_declared',
        ),
      );

      await advance('initiative');
      for (const [lock, type, command] of [
        [lockMovement, GameEventType.MovementLocked, 'movement'],
        [lockAttack, GameEventType.AttackLocked, 'weapon'],
      ] as const) {
        for (const id of NON_ACTING_IDS) {
          expect(
            getUnitOperability(engine.getSession().currentState.units[id])
              .canAct,
          ).toBe(false);
          expect(engine.getSession().currentState.units[id].lockState).toBe(
            LockState.Pending,
          );
        }
        complete(lock);
        expect(canAdvancePhase(engine.getSession())).toBe(true);
        const before = engine.getSession().events.length;
        await advance(command);
        const emitted = (await store.getEvents(MATCH_ID)).slice(before);
        expect(
          emitted
            .filter(
              (event) =>
                event.type === type &&
                NON_ACTING_IDS.includes(event.actorId ?? ''),
            )
            .map((event) => event.actorId),
        ).toEqual(NON_ACTING_IDS);
      }
    });
  },
);
