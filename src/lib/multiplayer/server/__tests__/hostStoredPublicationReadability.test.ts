import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IIntent, IServerMessage } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameEventType, GamePhase, type IGameEvent } from '@/types/gameplay';
import { logger } from '@/utils/logger';

import { DurableMatchStore } from '../DurableMatchStore';
import { matchCommandFingerprint } from '../matchCommandBatch';
import { _setCombatJournalAuthorityModeForTests } from '../matchJournalAuthority';
import { preflightMatchPublications } from '../MatchPublicationReadability';
import { recoverActiveMatches } from '../MatchRecovery';
import { AcceptedIntentTracker } from '../reconnection/AcceptedIntentTracker';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';
import { createPersistedHost } from './matchHostPersistence.test-helpers';

const AT = '2026-11-11T00:00:00.000Z';
const ID = 'stored-publication';

class Socket implements IMatchSocket {
  readonly frames: IServerMessage[] = [];
  readyState = 1;
  send(data: string): void {
    this.frames.push(JSON.parse(data) as IServerMessage);
  }
  close(): void {
    this.readyState = 3;
  }
}

function oldPsr(sequence: number): IGameEvent {
  // This is a raw legacy JSON row, deliberately outside the current TS shape.
  return JSON.parse(
    JSON.stringify({
      id: 'legacy-gyro',
      gameId: ID,
      sequence,
      timestamp: AT,
      type: GameEventType.PSRResolved,
      turn: 1,
      phase: GamePhase.End,
      payload: {
        unitId: 'mek',
        targetNumber: null,
        roll: 0,
        modifiers: 0,
        passed: false,
        reason: 'Gyro destroyed - automatic failure',
      },
    }),
  ) as IGameEvent;
}

describe('pre-upgrade publication rows', () => {
  let directory: string;
  let file: string;
  let store: DurableMatchStore;
  let host: ServerMatchHost | undefined;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'host-publication-'));
    file = path.join(directory, 'matches.db');
    store = new DurableMatchStore({ path: file });
    _setCombatJournalAuthorityModeForTests('off');
    jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    await store.createMatch({
      matchId: ID,
      hostPlayerId: 'p1',
      playerIds: ['p1', 'p2'],
      sideAssignments: [
        { playerId: 'p1', side: 'player' },
        { playerId: 'p2', side: 'opponent' },
      ],
      status: 'active',
      createdAt: AT,
      updatedAt: AT,
      config: { mapRadius: 4, turnLimit: 5 },
    });
    host = await createPersistedHost(() =>
      ServerMatchHost.create(ID, store, {
        mapRadius: 4,
        turnLimit: 5,
        random: new SeededRandom(42),
        diceSeed: 42,
        grid: createMinimalGrid(4),
        gameUnits: [],
        playerUnits: [],
        opponentUnits: [],
      }),
    );
  });
  afterEach(async () => {
    await host?.closeMatch();
    store.close();
    await rm(directory, { recursive: true, force: true });
    _setCombatJournalAuthorityModeForTests(null);
    jest.restoreAllMocks();
  });

  // Raw SQL deliberately models data committed by an older writer. There is
  // no production flag or store API that skips the current acceptance guard.
  function insertLegacyOutbox(event: IGameEvent): void {
    const db = new Database(file);
    try {
      db.prepare(
        'INSERT INTO mp_match_outbox (match_id, sequence, command_id, event_json, created_at) VALUES (?, ?, ?, ?, ?)',
      ).run(ID, event.sequence, 'old-command', JSON.stringify(event), AT);
    } finally {
      db.close();
    }
  }

  it('refuses before retaining the live command or draining its cursor, then accepts a retry after repair', async () => {
    if (!host) throw new Error('Host missing');
    const sender = new Socket();
    const peer = new Socket();
    await host.admitSocket(sender, 'p1', 'sender');
    await host.admitSocket(peer, 'p2', 'peer');
    sender.frames.length = peer.frames.length = 0;
    const live = host.getSessionForTests();
    const before = await store.getEvents(ID);
    insertLegacyOutbox(oldPsr(before.length));
    const pending = await store.listPendingPublications(ID);
    const append = jest.spyOn(store, 'appendCommandBatch');
    const single = jest.spyOn(store, 'appendEvent');
    const accepted = jest.spyOn(AcceptedIntentTracker.prototype, 'record');
    const envelope: IIntent = {
      kind: 'Intent',
      matchId: ID,
      playerId: 'p1',
      ts: AT,
      intentId: 'retry-after-row-repair',
      intent: { kind: 'AdvancePhase' },
    };
    const messages = await host.handleIntent(envelope, 'sender', 'p1');
    expect(messages).toEqual([
      expect.objectContaining({
        kind: 'Error',
        code: 'INTERNAL_ERROR',
        reason: 'Unable to process the command.',
      }),
    ]);
    expect(sender.frames).toEqual(messages);
    expect(peer.frames).toEqual([]);
    expect([sender.readyState, peer.readyState]).toEqual([1, 1]);
    expect(host.getSessionForTests()).toBe(live);
    expect(await store.getEvents(ID)).toEqual(before);
    expect(await store.listPendingPublications(ID)).toEqual(pending);
    expect(append).not.toHaveBeenCalled();
    expect(single).not.toHaveBeenCalled();
    expect(accepted).not.toHaveBeenCalled();
    const db = new Database(file);
    try {
      db.prepare('DELETE FROM mp_match_outbox WHERE match_id = ?').run(ID);
    } finally {
      db.close();
    }
    const retry = await host.handleIntent(envelope, 'sender', 'p1');
    expect(retry.filter((message) => message.kind === 'Error')).toEqual([]);
    expect(accepted).toHaveBeenCalledWith(envelope.intentId);
    expect((await store.getEvents(ID))[before.length].sequence).toBe(
      before.length,
    );
  });

  it('validates a delayed declaration before publishing its reveal', async () => {
    const invalidPayload = {
      attackerId: 'mek',
      targetId: 'enemy',
      weapons: [],
      toHitNumber: 5,
      modifiers: [],
      privateLegacyField: 'invalid',
    };
    const declaration: IGameEvent = {
      id: 'legacy-declaration',
      gameId: ID,
      sequence: 10,
      timestamp: AT,
      type: GameEventType.AttackDeclared,
      turn: 1,
      phase: GamePhase.WeaponAttack,
      payload: invalidPayload,
    };
    const db = new Database(file);
    try {
      db.prepare(
        'INSERT INTO mp_match_events (match_id, sequence, event_json) VALUES (?, ?, ?)',
      ).run(ID, declaration.sequence, JSON.stringify(declaration));
    } finally {
      db.close();
    }
    const reveal: IGameEvent = {
      ...declaration,
      id: 'reveal',
      sequence: 11,
      type: GameEventType.AttacksRevealed,
      payload: {},
    };
    await expect(
      preflightMatchPublications(ID, store, [declaration, reveal], [reveal]),
    ).rejects.toMatchObject({ name: 'UnreadableStoredEventError' });
    // A resumed outbox reveal must have the same preflight as a new reveal.
    insertLegacyOutbox(reveal);
    await expect(
      preflightMatchPublications(ID, store, [declaration, reveal], []),
    ).rejects.toMatchObject({ name: 'UnreadableStoredEventError' });
  });

  it('restart blocks an unreadable stored row by name without rewriting its source', async () => {
    const before = await store.getEvents(ID);
    const legacy = oldPsr(before.length);
    const bytes = JSON.stringify(legacy);
    const db = new Database(file);
    try {
      db.prepare(
        'INSERT INTO mp_match_events (match_id, sequence, event_json) VALUES (?, ?, ?)',
      ).run(ID, legacy.sequence, bytes);
    } finally {
      db.close();
    }
    const result = await recoverActiveMatches(store, undefined, ID);
    expect(result.hosts.has(ID)).toBe(false);
    expect(result.failed).toEqual([ID]);
    expect(result.blocked).toEqual([
      expect.objectContaining({ matchId: ID, reason: 'replay-failed' }),
    ]);
    expect(JSON.stringify((await store.getEvents(ID)).at(-1))).toBe(bytes);
    expect((await store.getMatchMeta(ID)).status).toBe('active');
  });

  it('a duplicate receipt resumes existing rows without re-appending legacy bytes', async () => {
    const matchId = 'duplicate-legacy-row';
    await store.createMatch({ ...(await store.getMatchMeta(ID)), matchId });
    const retryHost = await createPersistedHost(() =>
      ServerMatchHost.create(matchId, store, {
        mapRadius: 4,
        turnLimit: 5,
        random: new SeededRandom(42),
        diceSeed: 42,
        grid: createMinimalGrid(4),
        gameUnits: [],
        playerUnits: [],
        opponentUnits: [],
        journalAuthority: true,
      }),
    );
    try {
      expect(retryHost.isJournalAuthorityEnabled()).toBe(true);
      const sender = new Socket();
      const peer = new Socket();
      await retryHost.admitSocket(sender, 'p1', 'sender');
      await retryHost.admitSocket(peer, 'p2', 'peer');
      sender.frames.length = peer.frames.length = 0;
      const initial = retryHost.getSessionForTests();
      const event = { ...oldPsr(initial.events.length), gameId: matchId };
      const batch = {
        commandId: 'old-command',
        actorId: 'p1',
        expectedRevision: event.sequence,
        events: [event],
      };
      const bytes = JSON.stringify(event);
      const db = new Database(file);
      try {
        db.transaction(() => {
          db.prepare(
            'INSERT INTO mp_match_events (match_id, sequence, event_json) VALUES (?, ?, ?)',
          ).run(matchId, event.sequence, bytes);
          db.prepare(
            'INSERT INTO mp_command_receipts (match_id, command_id, actor_id, first_revision, last_revision, event_count, fingerprint, committed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ).run(
            matchId,
            batch.commandId,
            batch.actorId,
            event.sequence,
            event.sequence,
            1,
            matchCommandFingerprint(batch),
            AT,
          );
          db.prepare(
            'INSERT INTO mp_match_outbox (match_id, sequence, command_id, event_json, created_at) VALUES (?, ?, ?, ?, ?)',
          ).run(matchId, event.sequence, batch.commandId, bytes, AT);
        })();
      } finally {
        db.close();
      }
      const before = await store.getEvents(matchId);
      const append = jest.spyOn(store, 'appendCommandBatch');
      const single = jest.spyOn(store, 'appendEvent');
      const frames = await retryHost.handleIntent(
        {
          kind: 'Intent',
          matchId,
          playerId: 'p1',
          ts: AT,
          intentId: batch.commandId,
          intent: { kind: 'AdvancePhase' },
        },
        'sender',
        'p1',
      );
      expect(frames).toEqual([
        expect.objectContaining({ kind: 'Error', code: 'INTERNAL_ERROR' }),
      ]);
      expect(sender.frames).toEqual(frames);
      expect(peer.frames).toEqual([]);
      expect([sender.readyState, peer.readyState]).toEqual([1, 1]);
      expect(append).not.toHaveBeenCalled();
      expect(single).not.toHaveBeenCalled();
      expect(await store.getEvents(matchId)).toEqual(before);
      expect(retryHost.getSessionForTests()).toBe(initial);
      expect((await store.getMatchMeta(matchId)).status).toBe('active');
    } finally {
      await retryHost.closeMatch();
    }
  });
});
