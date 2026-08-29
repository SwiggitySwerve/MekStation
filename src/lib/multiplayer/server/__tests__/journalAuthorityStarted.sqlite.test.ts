/**
 * The journal-authority-started fact is a constraint, not a convention
 * (adopt-combat-event-journal-authority task 2.3; design D4).
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchMeta } from '../IMatchStore';
import type { IMatchJournalAuthorityStarted } from '../matchJournalAuthority';

import { DurableMatchStore } from '../DurableMatchStore';

const MATCH_ID = 'match-started-fact';

function removeDatabase(file: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${file}${suffix}`, { force: true });
  }
}

function makeMeta(matchId: string): IMatchMeta {
  const now = '2026-08-28T00:00:00.000Z';
  return {
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

function makeEvent(matchId: string, sequence: number): IGameEvent {
  return {
    id: `evt-${sequence}`,
    gameId: matchId,
    sequence,
    timestamp: '3025-01-01T00:00:00.000Z',
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {} as never,
  } as IGameEvent;
}

function started(
  matchId: string,
  commandId: string,
): IMatchJournalAuthorityStarted {
  return {
    matchId,
    commandId,
    firstRevision: 0,
    lastRevision: 1,
    head: {
      streamType: 'match',
      streamId: matchId,
      branchId: 'main',
      revision: 1,
      digest: 'digest-started',
      effectiveGeneration: 1,
    },
    committedAt: '',
  };
}

describe('journal-authority-started fact', () => {
  it('is written in the first batch transaction and survives reopen', async () => {
    const file = path.join(
      __dirname,
      '../../../../../test-results/gm-two-player',
      `started-fact-${process.pid}.db`,
    );
    removeDatabase(file);
    const first = new DurableMatchStore({ path: file });
    try {
      await first.createMatch(makeMeta(MATCH_ID));
      const committed = await first.appendCommandBatch(MATCH_ID, {
        commandId: 'cmd-first',
        actorId: 'p1',
        expectedRevision: 0,
        events: [makeEvent(MATCH_ID, 0), makeEvent(MATCH_ID, 1)],
        expectedPostStateDigest: 'digest-started',
        journalAuthorityStarted: started(MATCH_ID, 'cmd-first'),
      });
      expect(committed.kind).toBe('committed');
      const fact = await first.getJournalAuthorityStarted(MATCH_ID);
      expect(fact?.commandId).toBe('cmd-first');
      expect(fact?.firstRevision).toBe(0);
      expect(fact?.lastRevision).toBe(1);
      expect(fact?.head.digest).toBe('digest-started');
    } finally {
      first.close();
    }

    const reopened = new DurableMatchStore({ path: file });
    try {
      const fact = await reopened.getJournalAuthorityStarted(MATCH_ID);
      expect(fact?.commandId).toBe('cmd-first');
      expect(fact?.head.revision).toBe(1);
      expect(await reopened.getCommandReceipt(MATCH_ID, 'cmd-first')).toEqual(
        expect.objectContaining({
          commandId: 'cmd-first',
          expectedPostStateDigest: 'digest-started',
        }),
      );
    } finally {
      reopened.close();
      removeDatabase(file);
    }
  });

  it('refuses a second write rather than replacing the row', async () => {
    const matchId = `match-started-once-${process.pid}-${Date.now()}`;
    const file = path.join(
      __dirname,
      '../../../../../test-results/gm-two-player',
      `started-once-${process.pid}-${Date.now()}.db`,
    );
    removeDatabase(file);
    const store = new DurableMatchStore({ path: file });
    try {
      await store.createMatch(makeMeta(matchId));
      const first = await store.appendCommandBatch(matchId, {
        commandId: 'cmd-first',
        actorId: 'p1',
        expectedRevision: 0,
        events: [makeEvent(matchId, 0)],
        journalAuthorityStarted: started(matchId, 'cmd-first'),
      });
      expect(first.kind).toBe('committed');
      expect(await store.getJournalAuthorityStarted(matchId)).not.toBeNull();

      await expect(
        store.appendCommandBatch(matchId, {
          commandId: 'cmd-second',
          actorId: 'p1',
          expectedRevision: 1,
          events: [makeEvent(matchId, 1)],
          journalAuthorityStarted: started(matchId, 'cmd-second'),
        }),
      ).rejects.toThrow();

      const fact = await store.getJournalAuthorityStarted(matchId);
      expect(fact?.commandId).toBe('cmd-first');
      expect(
        (await store.getEvents(matchId)).map((event) => event.sequence),
      ).toEqual([0]);
    } finally {
      store.close();
      removeDatabase(file);
    }
  });
});
