/**
 * Viewer projection service contract (authority-audit PR 6).
 *
 * Pins: branded-viewer required (spread clones refuse); stream scope
 * uses viewer fields only and never reads the journal; audience law on
 * a real InMemoryEventJournal; raw IStoredEvent fields never serialize;
 * projector throw / missing decision fail closed with no partial facts;
 * projectorVersion is stamped; two stream-type versions coexist.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type {
  IAppendEventBatch,
  ICommandReceipt,
  ICommittedReadPage,
  IEventJournal,
  IJournalHighWater,
  IReadCommittedQuery,
  IReadEntityHistoryQuery,
  IReadEventHistoryQuery,
  IReadStreamQuery,
  IStoredEvent,
  EventJournalAppendResult,
} from '@/lib/events/journal/EventJournalContract';

import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import {
  AuthorizedViewerResolver,
  isAuthorizedViewer,
  mintVerifiedPrincipal,
  type IAuthorizedViewer,
  type IMembershipRecord,
  type IMembershipSource,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

import {
  ViewerAudienceProjectorRegistry,
  type IViewerAudienceProjectorDefinition,
} from '../ViewerAudienceProjector';
import { ViewerProjectionService } from '../ViewerProjectionService';
import {
  VIEWER_PROJECTION_MESSAGES,
  VIEWER_SAFE_FACT_KEYS,
  VIEWER_SAFE_PROJECTION_KEYS,
  ViewerProjectionError,
  type IViewerProjectionRequest,
  type IViewerSafeProjection,
  type JsonValue,
} from '../ViewerProjectionTypes';

const RECORDED_AT = '2026-08-21T22:00:00.000Z';
const OCCURRED_AT = '2026-08-21T21:00:00.000Z';
const STREAM_TYPE = 'audience-proof';
const STREAM_TYPE_B = 'version-b-proof';
const SESSION_ID = 'session-1';
const FOREIGN_EXISTING = 'foreign-session-existing';
const FOREIGN_ABSENT = 'foreign-session-absent';

const PLAYER_ROW: IMembershipRecord = {
  principalId: 'user-player',
  principalKind: 'human',
  campaignId: 'campaign-alpha',
  campaignSessionId: SESSION_ID,
  matchId: 'match-9',
  participantId: 'participant-player',
  role: 'player',
  ownedForceIds: ['force-1'],
  membershipRevision: 3,
  active: true,
};

const GM_ROW: IMembershipRecord = {
  ...PLAYER_ROW,
  principalId: 'user-gm',
  participantId: 'participant-gm',
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

/**
 * Journal probe that records readStream calls so wrong-session proofs
 * can show the foreign stream was never loaded.
 */
class ProbeJournal implements IEventJournal {
  public readStreamCalls = 0;
  public lastReadPayloads: unknown[] = [];
  public allReadPayloads: unknown[] = [];

  public constructor(private readonly inner: IEventJournal) {}

  public append(input: IAppendEventBatch): Promise<EventJournalAppendResult> {
    return this.inner.append(input);
  }

  public async readStream(
    query: IReadStreamQuery,
  ): Promise<readonly IStoredEvent[]> {
    this.readStreamCalls += 1;
    const rows = await this.inner.readStream(query);
    this.lastReadPayloads = [];
    for (const row of rows) {
      this.lastReadPayloads.push(row.payload);
      this.allReadPayloads.push(row.payload);
    }
    return rows;
  }

  public readEntityHistory(
    query: IReadEntityHistoryQuery,
  ): Promise<readonly IStoredEvent[]> {
    return this.inner.readEntityHistory(query);
  }

  public readEventHistory(
    query: IReadEventHistoryQuery,
  ): Promise<readonly IStoredEvent[]> {
    return this.inner.readEventHistory(query);
  }

  public captureHighWater(): Promise<IJournalHighWater> {
    return this.inner.captureHighWater();
  }

  public readCommitted(
    query: IReadCommittedQuery,
  ): Promise<ICommittedReadPage> {
    return this.inner.readCommitted(query);
  }

  public getCommandReceipt(commandId: string): Promise<ICommandReceipt | null> {
    return this.inner.getCommandReceipt(commandId);
  }
}

interface IAsyncThunk {
  (): Promise<unknown>;
}

/**
 * Runs `fn` and returns the typed projection error, or fails the test.
 */
async function expectProjectionError(
  fn: IAsyncThunk,
): Promise<ViewerProjectionError> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof ViewerProjectionError) return error;
    throw error;
  }
  throw new Error('expected ViewerProjectionError');
}

/**
 * Mints a real branded viewer through the resolver (never a hand-built
 * object). Property reads on a clone are not authorization.
 */
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

/**
 * Reads a projector-facing payload as a record so test projectors can
 * copy selected viewer-safe fields into a FRESH object.
 */
function isPayloadRecord(
  payload: unknown,
): payload is { readonly [key: string]: unknown } {
  return (
    typeof payload === 'object' && payload !== null && !Array.isArray(payload)
  );
}

function asRecord(payload: unknown): { readonly [key: string]: unknown } {
  if (isPayloadRecord(payload)) return payload;
  return {};
}

/**
 * Copies a named string field onto a new object (never the input
 * payload identity).
 */
function copyField(
  payload: unknown,
  field: string,
): { readonly [key: string]: string } {
  const record = asRecord(payload);
  const value = record[field];
  return { [field]: typeof value === 'string' ? value : '' };
}

function projectHeadline(payload: unknown): JsonValue {
  return copyField(payload, 'headline');
}

function projectOwnerNote(payload: unknown): JsonValue {
  const record = asRecord(payload);
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

function projectBoom(): JsonValue {
  throw new Error('BOOM-SECRET-FRAGMENT');
}

/**
 * Audience catalog used by the real-journal proofs: public, owner-only,
 * gm-only, hidden. Missing types and boom types are added per test.
 */
function audienceDefinition(
  extras: IViewerAudienceProjectorDefinition['decisions'] = [],
): IViewerAudienceProjectorDefinition {
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
      ...extras,
    ],
  };
}

function versionBDefinition(): IViewerAudienceProjectorDefinition {
  return {
    projectorVersion: 7,
    streamType: STREAM_TYPE_B,
    decisions: [
      {
        eventType: 'public_notice',
        decision: { kind: 'public', project: projectHeadline },
      },
    ],
  };
}

function recordedAt(): string {
  return RECORDED_AT;
}

function committed(result: EventJournalAppendResult): IStoredEvent[] {
  if (result.kind !== 'committed')
    throw new Error(`expected committed append, got ${result.kind}`);
  return [...result.events];
}

/**
 * Appends one event to a real in-memory journal and returns the stored
 * row so raw-field values can be scanned for absence in projections.
 */
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

/**
 * Public, two-owner, gm-only, hidden, public chain used by audience and
 * raw-row proofs. Revision order is the visibility order under test.
 */
async function appendAudienceStream(
  journal: IEventJournal,
  streamId: string,
): Promise<readonly IStoredEvent[]> {
  const stored: IStoredEvent[] = [];
  stored.push(
    await appendEvent(journal, {
      streamType: STREAM_TYPE,
      streamId,
      expectedRevision: 0,
      eventType: 'public_notice',
      payload: { headline: 'PUBLIC-ALPHA' },
      commandId: 'cmd-raw-forbid-public-alpha',
    }),
  );
  stored.push(
    await appendEvent(journal, {
      streamType: STREAM_TYPE,
      streamId,
      expectedRevision: 1,
      eventType: 'owner_note',
      payload: {
        note: 'OWNER-P1-NOTE',
        participantId: PLAYER_ROW.participantId,
        forceId: 'force-1',
      },
      commandId: 'cmd-raw-forbid-owner-p1',
    }),
  );
  stored.push(
    await appendEvent(journal, {
      streamType: STREAM_TYPE,
      streamId,
      expectedRevision: 2,
      eventType: 'owner_note',
      payload: {
        note: 'OWNER-P2-NOTE',
        participantId: 'participant-other',
        forceId: 'force-2',
      },
      commandId: 'cmd-raw-forbid-owner-p2',
    }),
  );
  stored.push(
    await appendEvent(journal, {
      streamType: STREAM_TYPE,
      streamId,
      expectedRevision: 3,
      eventType: 'gm_briefing',
      payload: { briefing: 'GM-ONLY-BRIEFING' },
      commandId: 'cmd-raw-forbid-gm-briefing',
    }),
  );
  stored.push(
    await appendEvent(journal, {
      streamType: STREAM_TYPE,
      streamId,
      expectedRevision: 4,
      eventType: 'hidden_authority',
      payload: { secret: 'HIDDEN-AUTHORITY-BODY' },
      commandId: 'cmd-raw-forbid-hidden',
    }),
  );
  stored.push(
    await appendEvent(journal, {
      streamType: STREAM_TYPE,
      streamId,
      expectedRevision: 5,
      eventType: 'public_notice',
      payload: { headline: 'PUBLIC-BRAVO' },
      commandId: 'cmd-raw-forbid-public-bravo',
    }),
  );
  return stored;
}

function requestFor(
  streamId: string,
  streamType = STREAM_TYPE,
): IViewerProjectionRequest {
  return { streamType, streamId };
}

function makeService(
  journal: IEventJournal,
  extras: IViewerAudienceProjectorDefinition['decisions'] = [],
): ViewerProjectionService {
  const registry = new ViewerAudienceProjectorRegistry();
  registry.register(audienceDefinition(extras));
  registry.register(versionBDefinition());
  return new ViewerProjectionService({ journal, registry });
}

/**
 * Collects authority-field VALUES from stored rows that must never
 * appear in a serialized projection (unique strings only; numeric
 * positions are asserted via forbidden keys, not digit search).
 */
function rawAuthorityFragments(stored: readonly IStoredEvent[]): string[] {
  const fragments: string[] = [];
  for (const event of stored) {
    fragments.push(event.eventDigest);
    fragments.push(event.commandId);
    fragments.push(event.recordedAt);
    fragments.push(event.occurredAt);
    fragments.push(event.eventId);
    if (event.previousStreamEventDigest !== null)
      fragments.push(event.previousStreamEventDigest);
  }
  return fragments;
}

const FORBIDDEN_RAW_KEYS = [
  'eventDigest',
  'commitPosition',
  'streamRevision',
  'commandId',
  'recordedAt',
  'previousStreamEventDigest',
  'canonicalizerVersion',
  'actorId',
  'authorityId',
  'afterRevision',
] as const;

describe('viewer projection service', function () {
  describe('authorized viewer brand', function () {
    it('refuses a structural spread clone of a real viewer as not-a-viewer', async function () {
      const journal = new ProbeJournal(new InMemoryEventJournal(recordedAt));
      const service = makeService(journal);
      const viewer = await resolveViewer(PLAYER_ROW);
      expect(isAuthorizedViewer(viewer)).toBe(true);
      const clone = { ...viewer };
      expect(isAuthorizedViewer(clone)).toBe(false);
      expect(clone.kind).toBe('viewer');
      expect(clone.role).toBe('player');

      const error = await expectProjectionError(function () {
        return service.project(clone, requestFor(SESSION_ID));
      });
      expect(error.code).toBe('not-a-viewer');
      expect(error.message).toBe(VIEWER_PROJECTION_MESSAGES.notAViewer);
      expect(journal.readStreamCalls).toBe(0);
    });
  });

  describe('stream scope', function () {
    it('refuses wrong-session with a byte-identical error whether or not the stream exists, and never reads the journal', async function () {
      const inner = new InMemoryEventJournal(recordedAt);
      const journal = new ProbeJournal(inner);
      const service = makeService(journal);
      const viewer = await resolveViewer(PLAYER_ROW);
      await appendAudienceStream(inner, FOREIGN_EXISTING);

      const existing = await expectProjectionError(function () {
        return service.project(viewer, requestFor(FOREIGN_EXISTING));
      });
      const absent = await expectProjectionError(function () {
        return service.project(viewer, requestFor(FOREIGN_ABSENT));
      });

      expect(existing.code).toBe('wrong-session');
      expect(absent.code).toBe('wrong-session');
      expect(existing.message).toBe('Authorization refused');
      expect(absent.message).toBe('Authorization refused');
      expect(JSON.stringify(existing)).toBe(JSON.stringify(absent));
      expect(JSON.stringify(existing.toJSON())).toBe(
        JSON.stringify(absent.toJSON()),
      );
      expect(journal.readStreamCalls).toBe(0);
    });
  });

  describe('audience law', function () {
    it('projects public plus own owner-only for a player; public plus all owner-only plus gm-only for gm; hidden to nobody; sequenceHint gapless over visible facts', async function () {
      const inner = new InMemoryEventJournal(recordedAt);
      const journal = new ProbeJournal(inner);
      const service = makeService(journal);
      await appendAudienceStream(inner, SESSION_ID);
      const player = await resolveViewer(PLAYER_ROW);
      const gm = await resolveViewer(GM_ROW);

      const playerView = await service.project(player, requestFor(SESSION_ID));
      const gmView = await service.project(gm, requestFor(SESSION_ID));

      expect(
        playerView.facts.map(function (fact) {
          return fact.payload;
        }),
      ).toEqual([
        { headline: 'PUBLIC-ALPHA' },
        { note: 'OWNER-P1-NOTE', participantId: PLAYER_ROW.participantId },
        { headline: 'PUBLIC-BRAVO' },
      ]);
      expect(
        playerView.facts.map(function (fact) {
          return fact.sequenceHint;
        }),
      ).toEqual([1, 2, 3]);

      expect(
        gmView.facts.map(function (fact) {
          return fact.payload;
        }),
      ).toEqual([
        { headline: 'PUBLIC-ALPHA' },
        { note: 'OWNER-P1-NOTE', participantId: PLAYER_ROW.participantId },
        { note: 'OWNER-P2-NOTE', participantId: 'participant-other' },
        { briefing: 'GM-ONLY-BRIEFING' },
        { headline: 'PUBLIC-BRAVO' },
      ]);
      expect(
        gmView.facts.map(function (fact) {
          return fact.sequenceHint;
        }),
      ).toEqual([1, 2, 3, 4, 5]);

      const playerJson = JSON.stringify(playerView);
      const gmJson = JSON.stringify(gmView);
      expect(playerJson).not.toContain('HIDDEN-AUTHORITY-BODY');
      expect(gmJson).not.toContain('HIDDEN-AUTHORITY-BODY');
      expect(playerJson).not.toContain('OWNER-P2-NOTE');
      expect(playerJson).not.toContain('GM-ONLY-BRIEFING');
    });
  });

  describe('raw-row prohibition', function () {
    it('omits stored-event authority values and keys, uses a closed fact shape, and never reuses stored payload identity', async function () {
      const inner = new InMemoryEventJournal(recordedAt);
      const journal = new ProbeJournal(inner);
      const service = makeService(journal);
      const stored = await appendAudienceStream(inner, SESSION_ID);
      const player = await resolveViewer(PLAYER_ROW);
      const gm = await resolveViewer(GM_ROW);

      const playerView = await service.project(player, requestFor(SESSION_ID));
      const gmView = await service.project(gm, requestFor(SESSION_ID));
      const fragments = rawAuthorityFragments(stored);

      function assertSafe(view: IViewerSafeProjection): void {
        const json = JSON.stringify(view);
        for (const fragment of fragments) {
          expect(json).not.toContain(fragment);
        }
        for (const key of FORBIDDEN_RAW_KEYS) {
          expect(json).not.toContain(`"${key}"`);
        }
        expect(Object.keys(view)).toEqual([...VIEWER_SAFE_PROJECTION_KEYS]);
        for (const fact of view.facts) {
          expect(Object.keys(fact)).toEqual([...VIEWER_SAFE_FACT_KEYS]);
          for (const payload of journal.allReadPayloads) {
            expect(fact.payload).not.toBe(payload);
          }
          for (const row of stored) {
            expect(fact.payload).not.toBe(row.payload);
          }
        }
      }

      assertSafe(playerView);
      assertSafe(gmView);
    });
  });

  describe('fail closed', function () {
    it('refuses projection-failed with no partial facts when a decision throws mid-stream', async function () {
      const inner = new InMemoryEventJournal(recordedAt);
      const journal = new ProbeJournal(inner);
      const service = makeService(journal, [
        {
          eventType: 'boom_notice',
          decision: { kind: 'public', project: projectBoom },
        },
      ]);
      await appendEvent(inner, {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        expectedRevision: 0,
        eventType: 'public_notice',
        payload: { headline: 'PUBLIC-BEFORE-BOOM' },
        commandId: 'cmd-fail-public-before',
      });
      await appendEvent(inner, {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        expectedRevision: 1,
        eventType: 'boom_notice',
        payload: { headline: 'SHOULD-NOT-LEAK-BOOM-PAYLOAD' },
        commandId: 'cmd-fail-boom',
      });
      const viewer = await resolveViewer(PLAYER_ROW);
      let captured: IViewerSafeProjection | undefined;
      const error = await expectProjectionError(async function () {
        captured = await service.project(viewer, requestFor(SESSION_ID));
      });
      expect(captured).toBeUndefined();
      expect(error.code).toBe('projection-failed');
      expect(error.message).toBe(VIEWER_PROJECTION_MESSAGES.projectionFailed);
      const errorJson = JSON.stringify(error);
      expect(errorJson).not.toContain('SHOULD-NOT-LEAK-BOOM-PAYLOAD');
      expect(errorJson).not.toContain('PUBLIC-BEFORE-BOOM');
      expect(errorJson).not.toContain('BOOM-SECRET-FRAGMENT');
      expect(String(error)).not.toContain('SHOULD-NOT-LEAK-BOOM-PAYLOAD');
    });

    it('refuses projection-failed with no partial facts when an event type has no decision', async function () {
      const inner = new InMemoryEventJournal(recordedAt);
      const journal = new ProbeJournal(inner);
      const service = makeService(journal);
      await appendEvent(inner, {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        expectedRevision: 0,
        eventType: 'public_notice',
        payload: { headline: 'PUBLIC-BEFORE-UNKNOWN' },
        commandId: 'cmd-fail-public-unknown',
      });
      await appendEvent(inner, {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        expectedRevision: 1,
        eventType: 'undecided_notice',
        payload: { headline: 'UNDECIDED-PAYLOAD-FRAGMENT' },
        commandId: 'cmd-fail-undecided',
      });
      const viewer = await resolveViewer(PLAYER_ROW);
      let captured: IViewerSafeProjection | undefined;
      const error = await expectProjectionError(async function () {
        captured = await service.project(viewer, requestFor(SESSION_ID));
      });
      expect(captured).toBeUndefined();
      expect(error.code).toBe('projection-failed');
      const errorJson = JSON.stringify(error);
      expect(errorJson).not.toContain('UNDECIDED-PAYLOAD-FRAGMENT');
      expect(errorJson).not.toContain('PUBLIC-BEFORE-UNKNOWN');
    });
  });

  describe('versioning', function () {
    it('stamps projectorVersion and lets two stream-type versions coexist', async function () {
      const inner = new InMemoryEventJournal(recordedAt);
      const journal = new ProbeJournal(inner);
      const service = makeService(journal);
      await appendEvent(inner, {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        expectedRevision: 0,
        eventType: 'public_notice',
        payload: { headline: 'VERSION-A' },
        commandId: 'cmd-version-a',
      });
      await appendEvent(inner, {
        streamType: STREAM_TYPE_B,
        streamId: SESSION_ID,
        expectedRevision: 0,
        eventType: 'public_notice',
        payload: { headline: 'VERSION-B' },
        commandId: 'cmd-version-b',
      });
      const viewer = await resolveViewer(PLAYER_ROW);
      const viewA = await service.project(viewer, requestFor(SESSION_ID));
      const viewB = await service.project(
        viewer,
        requestFor(SESSION_ID, STREAM_TYPE_B),
      );
      expect(viewA.projectorVersion).toBe(1);
      expect(viewA.streamType).toBe(STREAM_TYPE);
      expect(viewB.projectorVersion).toBe(7);
      expect(viewB.streamType).toBe(STREAM_TYPE_B);
    });

    it('refuses unknown-projector before reading the journal', async function () {
      const journal = new ProbeJournal(new InMemoryEventJournal(recordedAt));
      const service = makeService(journal);
      const viewer = await resolveViewer(PLAYER_ROW);
      const error = await expectProjectionError(function () {
        return service.project(
          viewer,
          requestFor(SESSION_ID, 'no-such-stream'),
        );
      });
      expect(error.code).toBe('unknown-projector');
      expect(error.message).toBe(VIEWER_PROJECTION_MESSAGES.unknownProjector);
      expect(journal.readStreamCalls).toBe(0);
    });

    it('refuses duplicate projector registration with a typed error', function () {
      const registry = new ViewerAudienceProjectorRegistry();
      registry.register(audienceDefinition());
      try {
        registry.register(audienceDefinition());
        throw new Error('expected duplicate-projector');
      } catch (error) {
        expect(error).toBeInstanceOf(ViewerProjectionError);
        if (error instanceof ViewerProjectionError) {
          expect(error.code).toBe('duplicate-projector');
          expect(error.message).toBe(
            VIEWER_PROJECTION_MESSAGES.duplicateProjector,
          );
        }
      }
    });
  });
});
