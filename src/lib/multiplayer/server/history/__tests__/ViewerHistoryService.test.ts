/**
 * ViewerHistoryService contract (authority-audit PR 9).
 *
 * Pins: gate-first refusals before any store read; history byte parity
 * with projectWithCursor; hidden-gap sequences; timeline redaction;
 * export deny-by-default; projection-failure with no partial export.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type {
  IActionAuditInsert,
  IActionAuditRecord,
  IActionAuditRepository,
  ActionAuditWriteResult,
} from '@/lib/events/audit/IActionAuditRepository';
import type {
  EventJournalAppendResult,
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
} from '@/lib/events/journal/EventJournalContract';
import type {
  IPrivateAccessAuditRecord,
  IPrivateRecordAuthorizedCreate,
  IPrivateRecordCreate,
  IPrivateRecordEraseInput,
  IPrivateRecordErasedView,
  IPrivateRecordExportInput,
  IPrivateRecordExportView,
  IPrivateRecordLookupInput,
  IPrivateRecordOpenView,
  IPrivateRecordPrivateExportView,
  IPrivateRecordRedactInput,
  IPrivateRecordRepository,
  IPrivateRecordView,
  IPrivateRetentionConfig,
  IPrivateRetentionRun,
} from '@/lib/events/privacy/IPrivateRecordRepository';
import type {
  IAuthorizedViewer,
  IMembershipRecord,
  IMembershipSource,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import type {
  DeliveryCursorValidation,
  IDeliveryCursor,
  IDeliveryEpochBaseline,
  IDeliveryEpochStore,
  IDeliveryMapping,
  IDeliverySequenceAssignment,
} from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';
import type { IViewerAudienceProjectorDefinition } from '@/lib/multiplayer/server/projection/ViewerAudienceProjector';
import type { JsonValue } from '@/lib/multiplayer/server/projection/ViewerProjectionTypes';

import { SQLiteActionAuditRepository } from '@/lib/events/audit/SQLiteActionAuditRepository';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { SQLitePrivateRecordRepository } from '@/lib/events/privacy/SQLitePrivateRecordRepository';
import {
  AuthorizedViewerResolver,
  mintVerifiedPrincipal,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import {
  HumanActionAuthorizationError,
  isHumanActionAuthorizationError,
} from '@/lib/multiplayer/server/authorization/HumanActionAuthorizationGate';
import { MembershipSourceUnavailableError } from '@/lib/multiplayer/server/authorization/MatchSeatMembershipSource';
import { projectWithCursor } from '@/lib/multiplayer/server/delivery/projectWithDelivery';
import { SQLiteDeliveryEpochStore } from '@/lib/multiplayer/server/delivery/SQLiteDeliveryEpochStore';
import { ViewerAudienceProjectorRegistry } from '@/lib/multiplayer/server/projection/ViewerAudienceProjector';
import { ViewerProjectionService } from '@/lib/multiplayer/server/projection/ViewerProjectionService';
import {
  VIEWER_PROJECTION_MESSAGES,
  ViewerProjectionError,
  isViewerProjectionError,
} from '@/lib/multiplayer/server/projection/ViewerProjectionTypes';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import { ViewerHistoryService } from '../ViewerHistoryService';
import {
  VIEWER_GM_TIMELINE_KEYS,
  VIEWER_PLAYER_TIMELINE_KEYS,
  VIEWER_PRIVATE_DEFAULT_EXPORT_KEYS,
  isGmTimelineEntry,
} from '../ViewerHistoryTypes';

const CREATED_AT = '2026-08-21T23:00:00.000Z';
const RECORDED_AT = '2026-08-21T22:30:00.000Z';
const OCCURRED_AT = '2026-08-21T22:00:00.000Z';
const STREAM_TYPE = 'history-proof';
const SESSION_ID = 'session-history';
const MATCH_ID = 'match-history';
const FOREIGN_SESSION = 'foreign-session-history';
const FOREIGN_EPOCH_ID = 'b'.repeat(32);
const PRIVATE_SECRET = 'GM-PRIVATE-PAYLOAD-HISTORY-PR9';
const HIDDEN_SECRET = 'HIDDEN-AUTHORITY-BODY-PR9';
const BOOM_SECRET = 'BOOM-SECRET-FRAGMENT-PR9';
const PLAYER_FIRST_REV = 9001;
const PLAYER_LAST_REV = 9003;
const OTHER_FIRST_REV = 8111;
const OTHER_LAST_REV = 8112;
const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const DIGEST_C = 'c'.repeat(64);
const PROBE_MESSAGE =
  'repository must not be read before the human-action gate';

const PLAYER_ROW: IMembershipRecord = {
  principalId: 'user-history-player',
  principalKind: 'human',
  campaignId: 'campaign-alpha',
  campaignSessionId: SESSION_ID,
  matchId: MATCH_ID,
  participantId: 'participant-history-player',
  role: 'player',
  ownedForceIds: ['force-1'],
  membershipRevision: 3,
  active: true,
};

const OTHER_ROW: IMembershipRecord = {
  ...PLAYER_ROW,
  principalId: 'user-history-other',
  participantId: 'participant-history-other',
  ownedForceIds: ['force-2'],
};

const GM_ROW: IMembershipRecord = {
  ...PLAYER_ROW,
  principalId: 'user-history-gm',
  participantId: 'participant-history-gm',
  role: 'gm',
  ownedForceIds: ['force-gm'],
};

const JOURNAL_PRINCIPAL = {
  actorKind: 'human' as const,
  actorId: 'actor-journal',
  authorityType: 'test-host',
  authorityId: 'host-1',
};

interface IAsyncRun {
  (): Promise<unknown>;
}

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

class BrokenMembershipSource implements IMembershipSource {
  /** Infrastructure failure distinct from a missing membership row. */
  public async lookupMembership(): Promise<IMembershipRecord | null> {
    throw new MembershipSourceUnavailableError('membership store unavailable');
  }

  /** Infrastructure failure distinct from a missing membership row. */
  public async currentMembershipRevision(): Promise<number> {
    throw new MembershipSourceUnavailableError('membership store unavailable');
  }
}

/**
 * Journal wrapper that records readStream so gate-first proofs can
 * show the foreign stream was never loaded.
 */
class ProbeJournal implements IEventJournal {
  public readStreamCalls = 0;

  public constructor(private readonly inner: IEventJournal) {}

  public append(input: IAppendEventBatch): Promise<EventJournalAppendResult> {
    return this.inner.append(input);
  }

  public async readStream(
    query: IReadStreamQuery,
  ): Promise<readonly IStoredEvent[]> {
    this.readStreamCalls += 1;
    return this.inner.readStream(query);
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

/** Probe that records and refuses every action-audit read/write. */
class ProbeAuditRepository implements IActionAuditRepository {
  public calls: string[] = [];

  public recordLifecycle(): ActionAuditWriteResult {
    this.calls.push('recordLifecycle');
    throw new Error(PROBE_MESSAGE);
  }

  public linkPublishedReceipt(): ActionAuditWriteResult {
    this.calls.push('linkPublishedReceipt');
    throw new Error(PROBE_MESSAGE);
  }

  public readByCommandId(): IActionAuditRecord | null {
    this.calls.push('readByCommandId');
    throw new Error(PROBE_MESSAGE);
  }

  public readBySession(): readonly IActionAuditRecord[] {
    this.calls.push('readBySession');
    throw new Error(PROBE_MESSAGE);
  }
}

/** Probe that records and refuses every private-record operation. */
class ProbePrivateRepository implements IPrivateRecordRepository {
  public calls: string[] = [];

  public createPrivateRecord(): IPrivateRecordOpenView {
    this.calls.push('createPrivateRecord');
    throw new Error(PROBE_MESSAGE);
  }

  public createAuthorizedPrivateRecord(
    _input: IPrivateRecordAuthorizedCreate,
  ): Promise<IPrivateRecordOpenView> {
    this.calls.push('createAuthorizedPrivateRecord');
    return Promise.reject(new Error(PROBE_MESSAGE));
  }

  public lookupPrivate(
    _input: IPrivateRecordLookupInput,
  ): Promise<IPrivateRecordView> {
    this.calls.push('lookupPrivate');
    return Promise.reject(new Error(PROBE_MESSAGE));
  }

  public exportView(
    _input: IPrivateRecordExportInput,
  ): Promise<
    IPrivateRecordExportView | IPrivateRecordPrivateExportView | null
  > {
    this.calls.push('exportView');
    return Promise.reject(new Error(PROBE_MESSAGE));
  }

  public erase(
    _input: IPrivateRecordEraseInput,
  ): Promise<IPrivateRecordErasedView> {
    this.calls.push('erase');
    return Promise.reject(new Error(PROBE_MESSAGE));
  }

  public redact(
    _input: IPrivateRecordRedactInput,
  ): Promise<IPrivateRecordOpenView> {
    this.calls.push('redact');
    return Promise.reject(new Error(PROBE_MESSAGE));
  }

  public listAccessAudit(): readonly IPrivateAccessAuditRecord[] {
    this.calls.push('listAccessAudit');
    throw new Error(PROBE_MESSAGE);
  }

  public configureRetention(_input: IPrivateRetentionConfig): void {
    this.calls.push('configureRetention');
    throw new Error(PROBE_MESSAGE);
  }

  public runRetention(_input: IPrivateRetentionRun): readonly string[] {
    this.calls.push('runRetention');
    throw new Error(PROBE_MESSAGE);
  }
}

/** Probe that records and refuses every delivery-epoch operation. */
class ProbeEpochStore implements IDeliveryEpochStore {
  public calls: string[] = [];

  public resolveEpoch(): IDeliveryEpochBaseline {
    this.calls.push('resolveEpoch');
    throw new Error(PROBE_MESSAGE);
  }

  public validateCursor(): DeliveryCursorValidation {
    this.calls.push('validateCursor');
    throw new Error(PROBE_MESSAGE);
  }

  public assignSequences(): readonly IDeliverySequenceAssignment[] {
    this.calls.push('assignSequences');
    throw new Error(PROBE_MESSAGE);
  }

  public readMappings(): readonly IDeliveryMapping[] {
    this.calls.push('readMappings');
    throw new Error(PROBE_MESSAGE);
  }

  public bumpGeneration(): number {
    this.calls.push('bumpGeneration');
    throw new Error(PROBE_MESSAGE);
  }
}

/** Copies headline onto a fresh projector payload. */
function projectHeadline(payload: unknown): JsonValue {
  if (typeof payload !== 'object' || payload === null) return { headline: '' };
  const record = payload as { readonly [key: string]: unknown };
  const headline = record['headline'];
  return { headline: typeof headline === 'string' ? headline : '' };
}

/** Throws a secret-bearing error so leak scans can prove it is swallowed. */
function projectBoom(): JsonValue {
  throw new Error(BOOM_SECRET);
}

/** Audience catalog with public and hidden types for history proofs. */
function audienceDefinition(): IViewerAudienceProjectorDefinition {
  return {
    projectorVersion: 1,
    streamType: STREAM_TYPE,
    decisions: [
      {
        eventType: 'public_notice',
        decision: { kind: 'public', project: projectHeadline },
      },
      { eventType: 'hidden_authority', decision: { kind: 'hidden' } },
    ],
  };
}

/** Audience catalog whose boom type fails the whole projection. */
function boomAudienceDefinition(): IViewerAudienceProjectorDefinition {
  return {
    projectorVersion: 1,
    streamType: STREAM_TYPE,
    decisions: [
      {
        eventType: 'public_notice',
        decision: { kind: 'public', project: projectHeadline },
      },
      {
        eventType: 'boom_notice',
        decision: { kind: 'public', project: projectBoom },
      },
    ],
  };
}

function recordedAt(): string {
  return RECORDED_AT;
}

function createdAt(): string {
  return CREATED_AT;
}

function seatedResolver(): AuthorizedViewerResolver {
  const source = new FakeMembershipSource();
  source.set(PLAYER_ROW);
  source.set(OTHER_ROW);
  source.set(GM_ROW);
  return new AuthorizedViewerResolver(source);
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

function committed(result: EventJournalAppendResult): IStoredEvent[] {
  if (result.kind !== 'committed') {
    throw new Error(`expected committed append, got ${result.kind}`);
  }
  return [...result.events];
}

/** Appends one journal event and returns the stored row. */
async function appendEvent(
  journal: IEventJournal,
  spec: {
    readonly expectedRevision: number;
    readonly eventType: string;
    readonly payload: { readonly [key: string]: string };
    readonly commandId: string;
  },
): Promise<IStoredEvent> {
  const rows = committed(
    await journal.append({
      streamType: STREAM_TYPE,
      streamId: SESSION_ID,
      expectedBranchId: 'root',
      expectedRevision: spec.expectedRevision,
      commandId: spec.commandId,
      principal: JOURNAL_PRINCIPAL,
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

/** Runs `run` and returns the typed human-action refusal, or fails. */
async function catchAuth(
  run: IAsyncRun,
): Promise<HumanActionAuthorizationError> {
  try {
    await run();
  } catch (error) {
    if (isHumanActionAuthorizationError(error)) return error;
    throw error;
  }
  throw new Error('expected HumanActionAuthorizationError');
}

/** Runs `run` and returns the typed projection refusal, or fails. */
async function catchProjection(run: IAsyncRun): Promise<ViewerProjectionError> {
  try {
    await run();
  } catch (error) {
    if (isViewerProjectionError(error)) return error;
    throw error;
  }
  throw new Error('expected ViewerProjectionError');
}

function leakBlob(value: unknown): string {
  return JSON.stringify(value);
}

function historyRequest(cursor: IDeliveryCursor | null = null) {
  return {
    streamType: STREAM_TYPE,
    streamId: SESSION_ID,
    cursor,
  };
}

describe('ViewerHistoryService', function () {
  let dir: string;
  let dbPath: string;

  beforeEach(async function () {
    dir = await mkdtemp(path.join(tmpdir(), 'viewer-history-'));
    dbPath = path.join(dir, 'viewer-history.db');
    resetSQLiteService();
  });

  afterEach(async function () {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /** Opens the file-backed service and returns the live handle. */
  function database(): Database.Database {
    getSQLiteService({ path: dbPath }).initialize();
    return getSQLiteService().getDatabase();
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

  function makeProjection(
    journal: IEventJournal,
    definition: IViewerAudienceProjectorDefinition = audienceDefinition(),
  ): ViewerProjectionService {
    const registry = new ViewerAudienceProjectorRegistry();
    registry.register(definition);
    return new ViewerProjectionService({ journal, registry });
  }

  function makeHistory(
    journal: IEventJournal,
    options: {
      readonly resolver?: AuthorizedViewerResolver;
      readonly definition?: IViewerAudienceProjectorDefinition;
      readonly auditRepo?: IActionAuditRepository;
      readonly privateRepo?: IPrivateRecordRepository;
      readonly epochStore?: IDeliveryEpochStore;
    } = {},
  ): {
    readonly history: ViewerHistoryService;
    readonly projection: ViewerProjectionService;
    readonly store: IDeliveryEpochStore;
    readonly audit: IActionAuditRepository;
    readonly privateRepo: IPrivateRecordRepository;
    readonly resolver: AuthorizedViewerResolver;
  } {
    const db = database();
    const resolver = options.resolver ?? seatedResolver();
    const projection = makeProjection(journal, options.definition);
    const store =
      options.epochStore ?? new SQLiteDeliveryEpochStore(db, createdAt);
    const audit = options.auditRepo ?? new SQLiteActionAuditRepository(db);
    const privateRepo =
      options.privateRepo ?? new SQLitePrivateRecordRepository(db);
    const history = new ViewerHistoryService({
      resolver,
      projection,
      epochStore: store,
      auditRepo: audit,
      privateRepo,
    });
    return { history, projection, store, audit, privateRepo, resolver };
  }

  describe('gate-first', function () {
    it('refuses an unknown principal on every entrypoint before any store read', async function () {
      const journal = new ProbeJournal(new InMemoryEventJournal(recordedAt));
      const audit = new ProbeAuditRepository();
      const privateRepo = new ProbePrivateRepository();
      const epochStore = new ProbeEpochStore();
      const { history } = makeHistory(journal, {
        auditRepo: audit,
        privateRepo,
        epochStore,
      });

      const historyError = await catchAuth(async function () {
        return history.readHistory(
          'unknown-principal',
          SESSION_ID,
          historyRequest(),
        );
      });
      const timelineError = await catchAuth(async function () {
        return history.readTimeline('unknown-principal', SESSION_ID, {
          campaignSessionId: SESSION_ID,
        });
      });
      const exportError = await catchAuth(async function () {
        return history.exportForViewer('unknown-principal', SESSION_ID, {
          streamType: STREAM_TYPE,
          streamId: SESSION_ID,
        });
      });

      expect(historyError.code).toBe('no-viewer');
      expect(timelineError.code).toBe('no-viewer');
      expect(exportError.code).toBe('no-viewer');
      expect(historyError.message).toBe('Authorization refused');
      expect(timelineError.message).toBe(historyError.message);
      expect(exportError.message).toBe(historyError.message);
      expect(historyError.message).not.toContain('unknown-principal');
      expect(journal.readStreamCalls).toBe(0);
      expect(audit.calls).toEqual([]);
      expect(privateRepo.calls).toEqual([]);
      expect(epochStore.calls).toEqual([]);
    });

    it('refuses wrong-scope requests with a constant message and no foreign load', async function () {
      const journal = new ProbeJournal(new InMemoryEventJournal(recordedAt));
      const audit = new ProbeAuditRepository();
      const privateRepo = new ProbePrivateRepository();
      const epochStore = new ProbeEpochStore();
      const { history } = makeHistory(journal, {
        auditRepo: audit,
        privateRepo,
        epochStore,
      });

      const historyError = await catchAuth(async function () {
        return history.readHistory(PLAYER_ROW.principalId, SESSION_ID, {
          streamType: STREAM_TYPE,
          streamId: FOREIGN_SESSION,
          cursor: null,
        });
      });
      const timelineError = await catchAuth(async function () {
        return history.readTimeline(PLAYER_ROW.principalId, SESSION_ID, {
          campaignSessionId: FOREIGN_SESSION,
        });
      });
      const exportError = await catchAuth(async function () {
        return history.exportForViewer(PLAYER_ROW.principalId, SESSION_ID, {
          streamType: STREAM_TYPE,
          streamId: FOREIGN_SESSION,
        });
      });

      expect(historyError.code).toBe('wrong-session');
      expect(timelineError.code).toBe('wrong-session');
      expect(exportError.code).toBe('wrong-session');
      expect(historyError.message).toBe('Authorization refused');
      expect(timelineError.message).toBe(historyError.message);
      expect(exportError.message).toBe(historyError.message);
      expect(historyError.message).not.toContain(FOREIGN_SESSION);
      expect(journal.readStreamCalls).toBe(0);
      expect(audit.calls).toEqual([]);
      expect(privateRepo.calls).toEqual([]);
      expect(epochStore.calls).toEqual([]);
    });

    it('propagates membership infrastructure failures without an auth verdict', async function () {
      const journal = new ProbeJournal(new InMemoryEventJournal(recordedAt));
      const { history } = makeHistory(journal, {
        resolver: new AuthorizedViewerResolver(new BrokenMembershipSource()),
        auditRepo: new ProbeAuditRepository(),
        privateRepo: new ProbePrivateRepository(),
        epochStore: new ProbeEpochStore(),
      });
      let caught: unknown;
      try {
        await history.readHistory(
          PLAYER_ROW.principalId,
          SESSION_ID,
          historyRequest(),
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(MembershipSourceUnavailableError);
      expect(caught instanceof HumanActionAuthorizationError).toBe(false);
      expect(journal.readStreamCalls).toBe(0);
    });
  });

  describe('history parity', function () {
    it('matches projectWithCursor byte-for-byte on the same resolved viewer', async function () {
      const journal = new InMemoryEventJournal(recordedAt);
      await appendEvent(journal, {
        expectedRevision: 0,
        eventType: 'public_notice',
        payload: { headline: 'NOTICE-A' },
        commandId: 'cmd-hist-a',
      });
      await appendEvent(journal, {
        expectedRevision: 1,
        eventType: 'public_notice',
        payload: { headline: 'NOTICE-B' },
        commandId: 'cmd-hist-b',
      });
      const { history, projection, store } = makeHistory(journal);
      const warmup = await history.readHistory(
        PLAYER_ROW.principalId,
        SESSION_ID,
        historyRequest(),
      );
      expect(warmup.kind).toBe('page');
      if (warmup.kind !== 'page') return;

      const viewer = await resolveViewer(PLAYER_ROW);
      const cursor: IDeliveryCursor = {
        deliveryEpochId: warmup.deliveryEpochId,
        afterSequence: 0,
      };
      const viaDirect = await projectWithCursor(
        projection,
        store,
        viewer,
        { streamType: STREAM_TYPE, streamId: SESSION_ID },
        cursor,
      );
      const viaService = await history.readHistory(
        PLAYER_ROW.principalId,
        SESSION_ID,
        historyRequest(cursor),
      );
      expect(viaService).toEqual(viaDirect);
    });

    it('passes stale cursors through with no sequence assignment', async function () {
      const journal = new InMemoryEventJournal(recordedAt);
      await appendEvent(journal, {
        expectedRevision: 0,
        eventType: 'public_notice',
        payload: { headline: 'NOTICE-A' },
        commandId: 'cmd-stale-a',
      });
      const { history, projection, store } = makeHistory(journal);
      const warmup = await history.readHistory(
        PLAYER_ROW.principalId,
        SESSION_ID,
        historyRequest(),
      );
      expect(warmup.kind).toBe('page');
      if (warmup.kind !== 'page') return;
      const before = mappingCount(warmup.deliveryEpochId);
      const gm = await resolveViewer(GM_ROW);
      const gmEpoch = store.resolveEpoch(gm, {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        projectorVersion: 1,
      });
      const staleCursor: IDeliveryCursor = {
        deliveryEpochId: gmEpoch.deliveryEpochId,
        afterSequence: 0,
      };
      const player = await resolveViewer(PLAYER_ROW);
      const viaDirect = await projectWithCursor(
        projection,
        store,
        player,
        { streamType: STREAM_TYPE, streamId: SESSION_ID },
        staleCursor,
      );
      const viaService = await history.readHistory(
        PLAYER_ROW.principalId,
        SESSION_ID,
        historyRequest(staleCursor),
      );
      const unknown = await history.readHistory(
        PLAYER_ROW.principalId,
        SESSION_ID,
        historyRequest({
          deliveryEpochId: FOREIGN_EPOCH_ID,
          afterSequence: 0,
        }),
      );
      expect(viaService).toEqual(viaDirect);
      expect(unknown).toEqual(viaService);
      expect(viaService.kind).toBe('stale-epoch');
      expect('facts' in viaService).toBe(false);
      expect(mappingCount(warmup.deliveryEpochId)).toBe(before);
    });
  });

  describe('hidden gap', function () {
    it('pages visible facts with gapless durable sequences across hidden events', async function () {
      const journal = new InMemoryEventJournal(recordedAt);
      await appendEvent(journal, {
        expectedRevision: 0,
        eventType: 'public_notice',
        payload: { headline: 'PUBLIC-A' },
        commandId: 'cmd-gap-a',
      });
      await appendEvent(journal, {
        expectedRevision: 1,
        eventType: 'hidden_authority',
        payload: { secret: HIDDEN_SECRET },
        commandId: 'cmd-gap-hidden',
      });
      await appendEvent(journal, {
        expectedRevision: 2,
        eventType: 'public_notice',
        payload: { headline: 'PUBLIC-B' },
        commandId: 'cmd-gap-b',
      });
      const { history } = makeHistory(journal);
      const page = await history.readHistory(
        PLAYER_ROW.principalId,
        SESSION_ID,
        historyRequest(),
      );
      expect(page.kind).toBe('page');
      if (page.kind !== 'page') return;
      const sequences: number[] = [];
      const headlines: string[] = [];
      for (let index = 0; index < page.facts.length; index += 1) {
        const delivered = page.facts[index];
        if (delivered === undefined) continue;
        sequences.push(delivered.deliverySequence);
        const payload = delivered.fact.payload;
        if (
          typeof payload === 'object' &&
          payload !== null &&
          'headline' in payload
        ) {
          headlines.push(String(payload.headline));
        }
      }
      expect(sequences).toEqual([1, 2]);
      expect(headlines).toEqual(['PUBLIC-A', 'PUBLIC-B']);
      expect(leakBlob(page)).not.toContain(HIDDEN_SECRET);
    });
  });

  describe('timeline redaction', function () {
    function seedAudit(audit: SQLiteActionAuditRepository): void {
      const playerActor = {
        principalId: PLAYER_ROW.principalId,
        participantId: PLAYER_ROW.participantId,
        role: 'player' as const,
      };
      const otherActor = {
        principalId: OTHER_ROW.principalId,
        participantId: OTHER_ROW.participantId,
        role: 'player' as const,
      };
      const playerAccepted: IActionAuditInsert = {
        campaignSessionId: SESSION_ID,
        matchId: MATCH_ID,
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        commandId: 'cmd-tl-player',
        commandDigest: DIGEST_A,
        actor: playerActor,
        correlationId: 'corr-player',
        createdAt: '2026-08-21T20:00:00.000Z',
        lifecycleState: 'accepted',
        safeReasonCode: null,
        committedFirstRevision: PLAYER_FIRST_REV,
        committedLastRevision: PLAYER_LAST_REV,
        committedEventCount: 3,
      };
      const otherAccepted: IActionAuditInsert = {
        campaignSessionId: SESSION_ID,
        matchId: MATCH_ID,
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        commandId: 'cmd-tl-other',
        commandDigest: DIGEST_B,
        actor: otherActor,
        correlationId: 'corr-other',
        createdAt: '2026-08-21T20:01:00.000Z',
        lifecycleState: 'accepted',
        safeReasonCode: null,
        committedFirstRevision: OTHER_FIRST_REV,
        committedLastRevision: OTHER_LAST_REV,
        committedEventCount: 2,
      };
      const otherRejected: IActionAuditInsert = {
        campaignSessionId: SESSION_ID,
        matchId: MATCH_ID,
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
        commandId: 'cmd-tl-rejected',
        commandDigest: DIGEST_C,
        actor: otherActor,
        correlationId: 'corr-rejected',
        createdAt: '2026-08-21T20:02:00.000Z',
        lifecycleState: 'rejected',
        safeReasonCode: 'command-rejected',
        committedFirstRevision: null,
        committedLastRevision: null,
        committedEventCount: null,
      };
      expect(audit.recordLifecycle(playerAccepted).kind).toBe('created');
      expect(audit.recordLifecycle(otherAccepted).kind).toBe('created');
      expect(audit.recordLifecycle(otherRejected).kind).toBe('created');
      audit.linkPublishedReceipt(
        'cmd-tl-player',
        'receipt-player-1',
        '2026-08-21T20:03:00.000Z',
      );
    }

    it('hides other principals and committed revisions from a player; gm sees both', async function () {
      const journal = new InMemoryEventJournal(recordedAt);
      const { history, audit } = makeHistory(journal);
      if (!(audit instanceof SQLiteActionAuditRepository)) {
        throw new Error('expected real SQLite action-audit repository');
      }
      seedAudit(audit);

      const playerEntries = await history.readTimeline(
        PLAYER_ROW.principalId,
        SESSION_ID,
        { campaignSessionId: SESSION_ID },
      );
      expect(playerEntries).toHaveLength(3);
      const playerJson = leakBlob(playerEntries);
      expect(playerJson).not.toContain(String(PLAYER_FIRST_REV));
      expect(playerJson).not.toContain(String(PLAYER_LAST_REV));
      expect(playerJson).not.toContain(String(OTHER_FIRST_REV));
      expect(playerJson).not.toContain(String(OTHER_LAST_REV));
      expect(playerJson).not.toContain('committedFirstRevision');
      expect(playerJson).not.toContain('committedLastRevision');
      expect(playerJson).not.toContain(OTHER_ROW.principalId);
      expect(playerJson).toContain(PLAYER_ROW.principalId);
      expect(playerJson).toContain('command-rejected');

      for (let index = 0; index < playerEntries.length; index += 1) {
        const entry = playerEntries[index];
        if (entry === undefined) continue;
        expect(Object.keys(entry)).toEqual([...VIEWER_PLAYER_TIMELINE_KEYS]);
        expect('committedFirstRevision' in entry).toBe(false);
        expect('committedLastRevision' in entry).toBe(false);
      }
      expect(playerEntries[0]?.actorPrincipalId).toBe(PLAYER_ROW.principalId);
      expect(playerEntries[1]?.actorPrincipalId).toBeNull();
      expect(playerEntries[2]?.actorPrincipalId).toBeNull();
      expect(playerEntries[2]?.safeReasonCode).toBe('command-rejected');

      const gmEntries = await history.readTimeline(
        GM_ROW.principalId,
        SESSION_ID,
        { campaignSessionId: SESSION_ID },
      );
      expect(gmEntries).toHaveLength(3);
      const gmJson = leakBlob(gmEntries);
      expect(gmJson).toContain(PLAYER_ROW.principalId);
      expect(gmJson).toContain(OTHER_ROW.principalId);
      expect(gmJson).toContain(String(PLAYER_FIRST_REV));
      expect(gmJson).toContain(String(PLAYER_LAST_REV));
      expect(gmJson).toContain(String(OTHER_FIRST_REV));
      expect(gmJson).toContain(String(OTHER_LAST_REV));
      for (let index = 0; index < gmEntries.length; index += 1) {
        const entry = gmEntries[index];
        if (entry === undefined) continue;
        expect(Object.keys(entry)).toEqual([...VIEWER_GM_TIMELINE_KEYS]);
      }
      expect(
        gmEntries[0] !== undefined && isGmTimelineEntry(gmEntries[0]),
      ).toBe(true);
      const gmOwn = gmEntries[0];
      if (gmOwn === undefined || !isGmTimelineEntry(gmOwn)) {
        throw new Error('expected a gm timeline entry with committed range');
      }
      expect(gmOwn.committedFirstRevision).toBe(PLAYER_FIRST_REV);
      expect(gmEntries[1]?.actorPrincipalId).toBe(OTHER_ROW.principalId);
    });
  });

  describe('export deny-by-default', function () {
    function createPrivate(
      privateRepo: IPrivateRecordRepository,
    ): IPrivateRecordOpenView {
      const input: IPrivateRecordCreate = {
        campaignSessionId: SESSION_ID,
        commandId: 'cmd-private-export',
        recordKind: 'gm-reason',
        payload: PRIVATE_SECRET,
        retentionClass: 'session',
        createdAt: CREATED_AT,
      };
      return privateRepo.createPrivateRecord(input);
    }

    it('returns payload-free private shapes for a player and includes payload for gm', async function () {
      const journal = new InMemoryEventJournal(recordedAt);
      await appendEvent(journal, {
        expectedRevision: 0,
        eventType: 'public_notice',
        payload: { headline: 'EXPORT-PUBLIC' },
        commandId: 'cmd-export-public',
      });
      const { history, privateRepo } = makeHistory(journal);
      const created = createPrivate(privateRepo);

      const playerExport = await history.exportForViewer(
        PLAYER_ROW.principalId,
        SESSION_ID,
        {
          streamType: STREAM_TYPE,
          streamId: SESSION_ID,
          privateRefs: [created.opaqueRef],
        },
      );
      expect(playerExport.privateRecords).toHaveLength(1);
      const playerPrivate = playerExport.privateRecords[0];
      if (playerPrivate === undefined) {
        throw new Error('expected a default private export shape');
      }
      expect(Object.keys(playerPrivate)).toEqual([
        ...VIEWER_PRIVATE_DEFAULT_EXPORT_KEYS,
      ]);
      expect(leakBlob(playerExport)).not.toContain(PRIVATE_SECRET);
      expect('payload' in playerPrivate).toBe(false);

      const gmExport = await history.exportForViewer(
        GM_ROW.principalId,
        SESSION_ID,
        {
          streamType: STREAM_TYPE,
          streamId: SESSION_ID,
          includePrivate: true,
          occurredAt: OCCURRED_AT,
          privateRefs: [created.opaqueRef],
        },
      );
      expect(leakBlob(gmExport)).toContain(PRIVATE_SECRET);
      expect(gmExport.privateRecords[0]).toEqual({
        opaqueRef: created.opaqueRef,
        payloadState: 'present',
        recordKind: 'gm-reason',
        payload: PRIVATE_SECRET,
      });
      expect(privateRepo.listAccessAudit(created.opaqueRef)).toEqual([
        expect.objectContaining({
          purpose: 'export-attempt',
          result: 'granted',
          actorRole: 'gm',
          actorPrincipalId: GM_ROW.principalId,
        }),
      ]);
    });

    it('keeps payload-free shapes when a player asks includePrivate and records the denial', async function () {
      const journal = new InMemoryEventJournal(recordedAt);
      await appendEvent(journal, {
        expectedRevision: 0,
        eventType: 'public_notice',
        payload: { headline: 'EXPORT-PUBLIC' },
        commandId: 'cmd-export-denied',
      });
      const { history, privateRepo } = makeHistory(journal);
      const created = createPrivate(privateRepo);

      const playerExport = await history.exportForViewer(
        PLAYER_ROW.principalId,
        SESSION_ID,
        {
          streamType: STREAM_TYPE,
          streamId: SESSION_ID,
          includePrivate: true,
          occurredAt: OCCURRED_AT,
          privateRefs: [created.opaqueRef],
        },
      );
      expect(playerExport.privateRecords).toHaveLength(1);
      const playerPrivate = playerExport.privateRecords[0];
      if (playerPrivate === undefined) {
        throw new Error('expected a default private export shape');
      }
      expect(Object.keys(playerPrivate)).toEqual([
        ...VIEWER_PRIVATE_DEFAULT_EXPORT_KEYS,
      ]);
      expect(leakBlob(playerExport)).not.toContain(PRIVATE_SECRET);
      expect(privateRepo.listAccessAudit(created.opaqueRef)).toEqual([
        expect.objectContaining({
          purpose: 'export-attempt',
          result: 'denied',
          actorPrincipalId: PLAYER_ROW.principalId,
        }),
      ]);
    });
  });

  describe('projection failure on export', function () {
    it('fails typed with no partial facts and no private content on the error', async function () {
      const journal = new InMemoryEventJournal(recordedAt);
      await appendEvent(journal, {
        expectedRevision: 0,
        eventType: 'boom_notice',
        payload: { headline: BOOM_SECRET },
        commandId: 'cmd-export-boom',
      });
      const { history, privateRepo } = makeHistory(journal, {
        definition: boomAudienceDefinition(),
      });
      const created = privateRepo.createPrivateRecord({
        campaignSessionId: SESSION_ID,
        commandId: 'cmd-boom-private',
        recordKind: 'gm-reason',
        payload: PRIVATE_SECRET,
        retentionClass: 'session',
        createdAt: CREATED_AT,
      });

      const error = await catchProjection(async function () {
        return history.exportForViewer(PLAYER_ROW.principalId, SESSION_ID, {
          streamType: STREAM_TYPE,
          streamId: SESSION_ID,
          includePrivate: true,
          occurredAt: OCCURRED_AT,
          privateRefs: [created.opaqueRef],
        });
      });
      expect(error.code).toBe('projection-failed');
      expect(error.message).toBe(VIEWER_PROJECTION_MESSAGES.projectionFailed);
      const blob = `${error.name}${error.code}${error.message}${JSON.stringify(error)}${error.stack ?? ''}`;
      expect(blob).not.toContain(PRIVATE_SECRET);
      expect(blob).not.toContain(BOOM_SECRET);
      expect(privateRepo.listAccessAudit(created.opaqueRef)).toEqual([]);
    });
  });
});
