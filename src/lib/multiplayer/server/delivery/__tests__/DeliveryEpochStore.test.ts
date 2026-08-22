/**
 * Durable viewer delivery-epoch store contract (authority-audit PR 7).
 *
 * Pins: same 8-tuple reuses one opaque epoch id; any key change mints a
 * new id; ids never contain key substrings; cursors from unknown or
 * foreign epochs share one stale-epoch shape; visible facts get gapless
 * sequences that survive reconnect and restart; a thrown assignment
 * leaves no reserved gap.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type {
  EventJournalAppendResult,
  IEventJournal,
  IStoredEvent,
} from '@/lib/events/journal/EventJournalContract';
import type {
  IViewerProjectionRequest,
  JsonValue,
} from '@/lib/multiplayer/server/projection/ViewerProjectionTypes';

import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import {
  AuthorizedViewerResolver,
  mintVerifiedPrincipal,
  type IAuthorizedViewer,
  type IMembershipRecord,
  type IMembershipSource,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import {
  ViewerAudienceProjectorRegistry,
  type IViewerAudienceProjectorDefinition,
} from '@/lib/multiplayer/server/projection/ViewerAudienceProjector';
import { ViewerProjectionService } from '@/lib/multiplayer/server/projection/ViewerProjectionService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  DELIVERY_EPOCH_ID_PATTERN,
  DELIVERY_EPOCH_STALE_MESSAGE,
  DeliveryEpochError,
  type IDeliveryEpochRequest,
} from '../IDeliveryEpochStore';
import { projectWithDelivery } from '../projectWithDelivery';
import { SQLiteDeliveryEpochStore } from '../SQLiteDeliveryEpochStore';

const CREATED_AT = '2026-08-21T23:00:00.000Z';
const OCCURRED_AT = '2026-08-21T22:00:00.000Z';
const RECORDED_AT = '2026-08-21T22:30:00.000Z';
const STREAM_TYPE = 'audience-proof';
const SESSION_ID = 'session-omega';
const MATCH_ID = 'match-zed';
const UNKNOWN_EPOCH_ID = 'f'.repeat(32);

const PLAYER_ROW: IMembershipRecord = {
  principalId: 'user-xyz',
  principalKind: 'human',
  campaignId: 'campaign-alpha',
  campaignSessionId: SESSION_ID,
  matchId: MATCH_ID,
  participantId: 'participant-xyz',
  role: 'player',
  ownedForceIds: ['force-1'],
  membershipRevision: 3,
  active: true,
};

const GM_ROW: IMembershipRecord = {
  ...PLAYER_ROW,
  principalId: 'user-gmz',
  participantId: 'participant-gmz',
  role: 'gm',
  ownedForceIds: ['force-gm'],
};

const PRINCIPAL = {
  actorKind: 'human' as const,
  actorId: 'actor-journal',
  authorityType: 'test-host',
  authorityId: 'host-1',
};

class FakeMembershipSource implements IMembershipSource {
  public rows = new Map<string, IMembershipRecord>();
  public revisions = new Map<string, number>();

  /** Records a membership row and its session epoch. */
  public set(row: IMembershipRecord): void {
    this.rows.set(
      JSON.stringify([row.principalId, row.campaignSessionId]),
      row,
    );
    this.revisions.set(row.campaignSessionId, row.membershipRevision);
  }

  /** Returns the row for the principal/session pair, or null. */
  public async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    return (
      this.rows.get(JSON.stringify([principalId, campaignSessionId])) ?? null
    );
  }

  /** Returns the session epoch, or 0 when the session is unknown. */
  public async currentMembershipRevision(
    campaignSessionId: string,
  ): Promise<number> {
    return this.revisions.get(campaignSessionId) ?? 0;
  }
}

/** Mints a branded viewer from a membership row. */
async function resolveViewer(
  row: IMembershipRecord,
): Promise<IAuthorizedViewer> {
  const source = new FakeMembershipSource();
  source.set(row);
  const resolver = new AuthorizedViewerResolver(source);
  return resolver.resolve(
    mintVerifiedPrincipal(row.principalId),
    row.campaignSessionId,
  );
}

/** Copies a named string field onto a fresh projector payload. */
function copyField(
  payload: unknown,
  field: string,
): { readonly [key: string]: string } {
  if (typeof payload !== 'object' || payload === null) return { [field]: '' };
  const record = payload as { readonly [key: string]: unknown };
  const value = record[field];
  return { [field]: typeof value === 'string' ? value : '' };
}

function projectHeadline(payload: unknown): JsonValue {
  return copyField(payload, 'headline');
}

function projectOwnerNote(payload: unknown): JsonValue {
  if (typeof payload !== 'object' || payload === null) {
    return { note: '', participantId: '' };
  }
  const record = payload as { readonly [key: string]: unknown };
  const note = record['note'];
  const participantId = record['participantId'];
  return {
    note: typeof note === 'string' ? note : '',
    participantId: typeof participantId === 'string' ? participantId : '',
  };
}

function projectBriefing(payload: unknown): JsonValue {
  return copyField(payload, 'briefing');
}

/** Audience catalog with public, owner-only, gm-only, and hidden types. */
function audienceDefinition(): IViewerAudienceProjectorDefinition {
  return {
    projectorVersion: 1,
    streamType: STREAM_TYPE,
    decisions: [
      {
        eventType: 'public_notice',
        decision: { kind: 'public', project: projectHeadline },
      },
      {
        eventType: 'owner_note',
        decision: { kind: 'owner-only', project: projectOwnerNote },
      },
      {
        eventType: 'gm_briefing',
        decision: { kind: 'gm-only', project: projectBriefing },
      },
      { eventType: 'hidden_authority', decision: { kind: 'hidden' } },
    ],
  };
}

function committed(result: EventJournalAppendResult): IStoredEvent[] {
  if (result.kind !== 'committed') {
    throw new Error(`expected committed append, got ${result.kind}`);
  }
  return [...result.events];
}

/** Appends one event and returns the stored row for digest pinning. */
async function appendEvent(
  journal: IEventJournal,
  spec: {
    streamType: string;
    streamId: string;
    expectedRevision: number;
    eventType: string;
    payload: { readonly [key: string]: string };
    commandId: string;
  },
): Promise<IStoredEvent> {
  const rows = committed(
    await journal.append({
      streamType: spec.streamType,
      streamId: spec.streamId,
      expectedBranchId: 'root',
      expectedRevision: spec.expectedRevision,
      commandId: spec.commandId,
      principal: PRINCIPAL,
      events: [
        {
          eventId: `${spec.commandId}-event`,
          eventType: spec.eventType,
          eventVersion: 1,
          correlationId: `correlation-${spec.commandId}`,
          causationEventIds: [],
          occurredAt: OCCURRED_AT,
          payload: spec.payload,
          entityRefs: [],
        },
      ],
    }),
  );
  const stored = rows[0];
  if (stored === undefined) throw new Error('append produced no event');
  return stored;
}

describe('SQLiteDeliveryEpochStore', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'delivery-epoch-store-'));
    dbPath = path.join(dir, 'delivery-epochs.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /** Opens a file-backed store with an injected clock. */
  function openStore(): SQLiteDeliveryEpochStore {
    getSQLiteService({ path: dbPath }).initialize();
    return new SQLiteDeliveryEpochStore(
      getSQLiteService().getDatabase(),
      () => CREATED_AT,
    );
  }

  function requestFor(
    streamId = SESSION_ID,
    projectorVersion = 1,
    streamType = STREAM_TYPE,
  ): IDeliveryEpochRequest {
    return { streamType, streamId, projectorVersion };
  }

  function maxSequence(epochId: string): number | null {
    const row = getSQLiteService()
      .getDatabase()
      .prepare(
        `SELECT MAX(delivery_sequence) AS maxSeq FROM delivery_event_mapping
         WHERE delivery_epoch_id = ?`,
      )
      .get(epochId) as { maxSeq: number | null };
    return row.maxSeq;
  }

  function mappingCount(epochId: string): number {
    const row = getSQLiteService()
      .getDatabase()
      .prepare(
        `SELECT COUNT(*) AS c FROM delivery_event_mapping
         WHERE delivery_epoch_id = ?`,
      )
      .get(epochId) as { c: number };
    return row.c;
  }

  describe('epoch derivation', () => {
    it('returns the same opaque id for the same viewer and stream twice', async () => {
      const store = openStore();
      const player = await resolveViewer(PLAYER_ROW);
      const first = store.resolveEpoch(player, requestFor());
      const second = store.resolveEpoch(player, requestFor());
      expect(first.deliveryEpochId).toBe(second.deliveryEpochId);
      expect(first.effectiveGeneration).toBe(1);
      expect(DELIVERY_EPOCH_ID_PATTERN.test(first.deliveryEpochId)).toBe(true);
    });

    it('mints a different id when any of the eight key components change', async () => {
      const store = openStore();
      const player = await resolveViewer(PLAYER_ROW);
      const otherPrincipal = await resolveViewer({
        ...PLAYER_ROW,
        principalId: 'user-otherz',
      });
      const otherParticipant = await resolveViewer({
        ...PLAYER_ROW,
        participantId: 'participant-otherz',
      });
      const otherSession = await resolveViewer({
        ...PLAYER_ROW,
        campaignSessionId: 'session-otherz',
      });
      const bumpedRevision = await resolveViewer({
        ...PLAYER_ROW,
        membershipRevision: 9,
      });
      const base = store.resolveEpoch(player, requestFor());
      const ids = [
        store.resolveEpoch(otherPrincipal, requestFor()).deliveryEpochId,
        store.resolveEpoch(otherParticipant, requestFor()).deliveryEpochId,
        store.resolveEpoch(otherSession, requestFor()).deliveryEpochId,
        store.resolveEpoch(bumpedRevision, requestFor()).deliveryEpochId,
        store.resolveEpoch(player, requestFor(MATCH_ID)).deliveryEpochId,
        store.resolveEpoch(player, requestFor(SESSION_ID, 1, 'other-streamz'))
          .deliveryEpochId,
        store.resolveEpoch(player, requestFor(SESSION_ID, 2)).deliveryEpochId,
      ];
      store.bumpGeneration(SESSION_ID, STREAM_TYPE, SESSION_ID);
      ids.push(store.resolveEpoch(player, requestFor()).deliveryEpochId);
      expect(new Set([base.deliveryEpochId, ...ids]).size).toBe(ids.length + 1);
    });

    it('mints ids that never contain a key-component substring', async () => {
      const store = openStore();
      const player = await resolveViewer(PLAYER_ROW);
      const epoch = store.resolveEpoch(player, requestFor());
      const parts = [
        player.principalId,
        player.campaignSessionId,
        player.participantId,
        STREAM_TYPE,
        SESSION_ID,
      ];
      for (const part of parts) {
        expect(epoch.deliveryEpochId.includes(part)).toBe(false);
      }
    });

    it('refuses a structural viewer clone', async () => {
      const store = openStore();
      const player = await resolveViewer(PLAYER_ROW);
      const clone = { ...player };
      expect(() => store.resolveEpoch(clone, requestFor())).toThrow(
        DeliveryEpochError,
      );
    });
  });

  describe('cursor validation', () => {
    it('accepts a cursor whose epoch matches the derived tuple', async () => {
      const store = openStore();
      const player = await resolveViewer(PLAYER_ROW);
      const baseline = store.resolveEpoch(player, requestFor());
      expect(
        store.validateCursor(player, requestFor(), {
          deliveryEpochId: baseline.deliveryEpochId,
          afterSequence: 0,
        }),
      ).toEqual({ kind: 'valid' });
    });

    it('returns byte-identical stale-epoch results for unknown and foreign ids', async () => {
      const store = openStore();
      const player = await resolveViewer(PLAYER_ROW);
      const gm = await resolveViewer(GM_ROW);
      store.resolveEpoch(player, requestFor());
      const foreign = store.resolveEpoch(gm, requestFor());
      const unknownResult = store.validateCursor(player, requestFor(), {
        deliveryEpochId: UNKNOWN_EPOCH_ID,
        afterSequence: 0,
      });
      const foreignResult = store.validateCursor(player, requestFor(), {
        deliveryEpochId: foreign.deliveryEpochId,
        afterSequence: 0,
      });
      expect(unknownResult).toEqual(foreignResult);
      expect(unknownResult).toEqual({
        kind: 'stale-epoch',
        message: DELIVERY_EPOCH_STALE_MESSAGE,
        newBaseline: store.resolveEpoch(player, requestFor()),
      });
    });

    it('returns stale-epoch with a new baseline after generation bump', async () => {
      const store = openStore();
      const player = await resolveViewer(PLAYER_ROW);
      const original = store.resolveEpoch(player, requestFor());
      store.bumpGeneration(SESSION_ID, STREAM_TYPE, SESSION_ID);
      const result = store.validateCursor(player, requestFor(), {
        deliveryEpochId: original.deliveryEpochId,
        afterSequence: 0,
      });
      expect(result.kind).toBe('stale-epoch');
      if (result.kind !== 'stale-epoch') return;
      expect(result.message).toBe(DELIVERY_EPOCH_STALE_MESSAGE);
      expect(result.newBaseline.deliveryEpochId).not.toBe(
        original.deliveryEpochId,
      );
      expect(result.newBaseline.effectiveGeneration).toBe(2);
      expect(store.resolveEpoch(player, requestFor())).toEqual(
        result.newBaseline,
      );
    });

    it('returns stale-epoch after membershipRevision changes', async () => {
      const store = openStore();
      const originalViewer = await resolveViewer(PLAYER_ROW);
      const original = store.resolveEpoch(originalViewer, requestFor());
      const moved = await resolveViewer({
        ...PLAYER_ROW,
        membershipRevision: 11,
      });
      const result = store.validateCursor(moved, requestFor(), {
        deliveryEpochId: original.deliveryEpochId,
        afterSequence: 0,
      });
      expect(result.kind).toBe('stale-epoch');
      if (result.kind !== 'stale-epoch') return;
      expect(result.message).toBe(DELIVERY_EPOCH_STALE_MESSAGE);
      expect(result.newBaseline.deliveryEpochId).not.toBe(
        original.deliveryEpochId,
      );
    });
  });

  describe('gapless visible-only assignment', () => {
    function makeService(journal: IEventJournal): ViewerProjectionService {
      const registry = new ViewerAudienceProjectorRegistry();
      registry.register(audienceDefinition());
      return new ViewerProjectionService({ journal, registry });
    }

    function projectionRequest(): IViewerProjectionRequest {
      return { streamType: STREAM_TYPE, streamId: SESSION_ID };
    }

    it('assigns adjacent sequences across a hidden gap and reuses on replay', async () => {
      const store = openStore();
      const player = await resolveViewer(PLAYER_ROW);
      const gm = await resolveViewer(GM_ROW);
      const journal = new InMemoryEventJournal(() => RECORDED_AT);
      const visibleA = await appendEvent(journal, {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        expectedRevision: 0,
        eventType: 'public_notice',
        payload: { headline: 'PUBLIC-A' },
        commandId: 'cmd-visible-a',
      });
      await appendEvent(journal, {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        expectedRevision: 1,
        eventType: 'hidden_authority',
        payload: { secret: 'HIDDEN-BODY' },
        commandId: 'cmd-hidden',
      });
      const visibleB = await appendEvent(journal, {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        expectedRevision: 2,
        eventType: 'public_notice',
        payload: { headline: 'PUBLIC-B' },
        commandId: 'cmd-visible-b',
      });
      await appendEvent(journal, {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        expectedRevision: 3,
        eventType: 'gm_briefing',
        payload: { briefing: 'GM-ONLY' },
        commandId: 'cmd-gm-only',
      });
      const service = makeService(journal);
      const playerPage = await projectWithDelivery(
        service,
        store,
        player,
        projectionRequest(),
      );
      expect(playerPage.facts.map((row) => row.deliverySequence)).toEqual([
        1, 2,
      ]);
      expect(playerPage.facts.map((row) => row.projectedEventIdentity)).toEqual(
        [visibleA.eventDigest, visibleB.eventDigest],
      );
      expect(playerPage.facts[0]?.projectedEventIdentity).not.toBe(
        String(visibleA.streamRevision),
      );
      expect(playerPage.facts[0]?.projectedEventIdentity).not.toBe(
        String(visibleA.commitPosition),
      );
      expect(
        playerPage.projection.facts.map((fact) => fact.sequenceHint),
      ).toEqual([1, 2]);

      const replay = await projectWithDelivery(
        service,
        store,
        player,
        projectionRequest(),
      );
      expect(replay.deliveryEpochId).toBe(playerPage.deliveryEpochId);
      expect(replay.facts.map((row) => row.deliverySequence)).toEqual([1, 2]);
      expect(replay.facts.every((row) => row.reused)).toBe(true);
      expect(mappingCount(playerPage.deliveryEpochId)).toBe(2);

      const gmPage = await projectWithDelivery(
        service,
        store,
        gm,
        projectionRequest(),
      );
      expect(gmPage.deliveryEpochId).not.toBe(playerPage.deliveryEpochId);
      expect(gmPage.facts.map((row) => row.deliverySequence)).toEqual([
        1, 2, 3,
      ]);
      expect(gmPage.facts.map((row) => row.fact.factType)).toEqual([
        'public_notice',
        'public_notice',
        'gm_briefing',
      ]);

      const paged = store.readMappings(playerPage.deliveryEpochId, 1, 10);
      expect(paged).toEqual([
        { projectedEventIdentity: visibleB.eventDigest, deliverySequence: 2 },
      ]);
      expect(Object.keys(paged[0] ?? {})).toEqual([
        'projectedEventIdentity',
        'deliverySequence',
      ]);
    });
  });

  describe('concurrency and reserved gaps', () => {
    it('rolls back a poisoned assignment and continues gaplessly', async () => {
      const store = openStore();
      const player = await resolveViewer(PLAYER_ROW);
      const epoch = store.resolveEpoch(player, requestFor());
      expect(() =>
        store.assignSequences(epoch.deliveryEpochId, ['identity-one', '']),
      ).toThrow(DeliveryEpochError);
      expect(maxSequence(epoch.deliveryEpochId)).toBeNull();
      expect(mappingCount(epoch.deliveryEpochId)).toBe(0);
      const recovered = store.assignSequences(epoch.deliveryEpochId, [
        'identity-one',
      ]);
      expect(recovered).toEqual([
        {
          projectedEventIdentity: 'identity-one',
          deliverySequence: 1,
          reused: false,
        },
      ]);
    });

    it('interleaves distinct identity sets into one gapless sequence space', async () => {
      const store = openStore();
      const player = await resolveViewer(PLAYER_ROW);
      const epoch = store.resolveEpoch(player, requestFor());
      const first = store.assignSequences(epoch.deliveryEpochId, [
        'set-a-1',
        'set-a-2',
      ]);
      const second = store.assignSequences(epoch.deliveryEpochId, [
        'set-b-1',
        'set-b-2',
      ]);
      const replayFirst = store.assignSequences(epoch.deliveryEpochId, [
        'set-a-1',
        'set-a-2',
      ]);
      const sequences = [...first, ...second].map(
        (row) => row.deliverySequence,
      );
      expect(sequences.sort((left, right) => left - right)).toEqual([
        1, 2, 3, 4,
      ]);
      expect(new Set(sequences).size).toBe(4);
      expect(replayFirst.every((row) => row.reused)).toBe(true);
      expect(replayFirst.map((row) => row.deliverySequence)).toEqual(
        first.map((row) => row.deliverySequence),
      );
      expect(mappingCount(epoch.deliveryEpochId)).toBe(4);
    });
  });

  describe('restart', () => {
    it('preserves epochs, mappings, and generations across close and reopen', async () => {
      const store = openStore();
      const player = await resolveViewer(PLAYER_ROW);
      const epoch = store.resolveEpoch(player, requestFor());
      store.assignSequences(epoch.deliveryEpochId, ['identity-keep']);
      store.bumpGeneration(SESSION_ID, STREAM_TYPE, SESSION_ID);
      const postBump = store.resolveEpoch(player, requestFor());
      expect(postBump.effectiveGeneration).toBe(2);
      expect(postBump.deliveryEpochId).not.toBe(epoch.deliveryEpochId);
      store.assignSequences(postBump.deliveryEpochId, ['identity-keep']);

      resetSQLiteService();
      const reopened = openStore();
      const restored = reopened.resolveEpoch(
        await resolveViewer(PLAYER_ROW),
        requestFor(),
      );
      expect(restored).toEqual(postBump);
      const continued = reopened.assignSequences(postBump.deliveryEpochId, [
        'identity-keep',
        'identity-next',
      ]);
      expect(continued).toEqual([
        {
          projectedEventIdentity: 'identity-keep',
          deliverySequence: 1,
          reused: true,
        },
        {
          projectedEventIdentity: 'identity-next',
          deliverySequence: 2,
          reused: false,
        },
      ]);
      expect(reopened.readMappings(epoch.deliveryEpochId, 0, 10)).toEqual([
        {
          projectedEventIdentity: 'identity-keep',
          deliverySequence: 1,
        },
      ]);
      const oldCursor = reopened.validateCursor(
        await resolveViewer(PLAYER_ROW),
        requestFor(),
        { deliveryEpochId: epoch.deliveryEpochId, afterSequence: 0 },
      );
      expect(oldCursor.kind).toBe('stale-epoch');
    });
  });
});
