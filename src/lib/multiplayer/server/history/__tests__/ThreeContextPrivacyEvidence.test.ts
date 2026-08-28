/**
 * Three-principal privacy evidence at the history/timeline/export
 * service boundary (authority-audit PR 10, tasks 10.1-10.2, design D5).
 *
 * Honest scope: ViewerHistoryService is a server application service.
 * It has no HTTP routes and no socket binding in this wave. The browser
 * cannot exercise readHistory / readTimeline / exportForViewer. This
 * suite is the three-principal evidence for those surfaces: real SQLite
 * file DB + InMemoryEventJournal, composed the same way as
 * ViewerHistoryService.test.ts.
 *
 * Live action, rejection, reconnect, replay, DOM, and browser storage
 * are covered by e2e/authority-privacy-three-context.spec.ts.
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
} from '@/lib/events/audit/IActionAuditRepository';
import type {
  EventJournalAppendResult,
  IEventJournal,
  IStoredEvent,
} from '@/lib/events/journal/EventJournalContract';
import type {
  IMembershipRecord,
  IMembershipSource,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import type { IDeliveryCursor } from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';
import type { IViewerAudienceProjectorDefinition } from '@/lib/multiplayer/server/projection/ViewerAudienceProjector';
import type { JsonValue } from '@/lib/multiplayer/server/projection/ViewerProjectionTypes';

import { SQLiteActionAuditRepository } from '@/lib/events/audit/SQLiteActionAuditRepository';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { SQLitePrivateRecordRepository } from '@/lib/events/privacy/SQLitePrivateRecordRepository';
import { AuthorizedViewerResolver } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import {
  HumanActionAuthorizationError,
  authorizeHumanAction,
  isHumanActionAuthorizationError,
} from '@/lib/multiplayer/server/authorization/HumanActionAuthorizationGate';
import { SQLiteDeliveryEpochStore } from '@/lib/multiplayer/server/delivery/SQLiteDeliveryEpochStore';
import { ViewerAudienceProjectorRegistry } from '@/lib/multiplayer/server/projection/ViewerAudienceProjector';
import { ViewerProjectionService } from '@/lib/multiplayer/server/projection/ViewerProjectionService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import { ViewerHistoryService } from '../ViewerHistoryService';

const CREATED_AT = '2026-08-22T06:00:00.000Z';
const RECORDED_AT = '2026-08-22T05:30:00.000Z';
const OCCURRED_AT = '2026-08-22T05:00:00.000Z';
const STREAM_TYPE = 'privacy-evidence';
const SESSION_ID = 'session-privacy-evidence';
const MATCH_ID = 'match-privacy-evidence';
const FOREIGN_EPOCH_ID = 'c'.repeat(32);

const PUBLIC_MARKER = 'PUBLIC-SHARED-PRIVACY-PR10';
const OWNER_A_MARKER = 'OWNER-A-MARKER-PRIVACY-PR10';
const OWNER_B_MARKER = 'OWNER-B-MARKER-PRIVACY-PR10';
const GM_ONLY_MARKER = 'GM-ONLY-MARKER-PRIVACY-PR10';
const HIDDEN_MARKER = 'HIDDEN-MARKER-PRIVACY-PR10';
const PRIVATE_MARKER = 'GM-PRIVATE-PAYLOAD-PRIVACY-PR10';

const PLAYER_A_FIRST_REV = 71001;
const PLAYER_A_LAST_REV = 71003;
const PLAYER_B_FIRST_REV = 72011;
const PLAYER_B_LAST_REV = 72012;

const DIGEST_A = 'd'.repeat(64);
const DIGEST_B = 'e'.repeat(64);

const JOURNAL_PRINCIPAL = {
  actorKind: 'human' as const,
  actorId: 'actor-privacy-evidence',
  authorityType: 'test-host',
  authorityId: 'host-privacy-evidence',
};

const PLAYER_A_ROW: IMembershipRecord = {
  principalId: 'user-privacy-player-a',
  principalKind: 'human',
  campaignId: 'campaign-privacy',
  campaignSessionId: SESSION_ID,
  matchId: MATCH_ID,
  participantId: 'participant-privacy-a',
  role: 'player',
  ownedForceIds: ['force-privacy-a'],
  membershipRevision: 4,
  active: true,
};

const PLAYER_B_ROW: IMembershipRecord = {
  ...PLAYER_A_ROW,
  principalId: 'user-privacy-player-b',
  participantId: 'participant-privacy-b',
  ownedForceIds: ['force-privacy-b'],
};

const GM_ROW: IMembershipRecord = {
  ...PLAYER_A_ROW,
  principalId: 'user-privacy-gm',
  participantId: 'participant-privacy-gm',
  role: 'gm',
  ownedForceIds: ['force-privacy-gm'],
};

const RAW_FIELD_NAMES = [
  'eventDigest',
  'commitPosition',
  'streamRevision',
  'previousStreamEventDigest',
] as const;

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

function copyField(payload: unknown, key: string): JsonValue {
  if (typeof payload !== 'object' || payload === null) return { [key]: '' };
  const record = payload as { readonly [field: string]: unknown };
  const value = record[key];
  return { [key]: typeof value === 'string' ? value : '' };
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

/** Audience catalog: public, owner-only, gm-only, hidden. */
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

function recordedAt(): string {
  return RECORDED_AT;
}

function createdAt(): string {
  return CREATED_AT;
}

function seatedResolver(): AuthorizedViewerResolver {
  const source = new FakeMembershipSource();
  source.set(PLAYER_A_ROW);
  source.set(PLAYER_B_ROW);
  source.set(GM_ROW);
  return new AuthorizedViewerResolver(source);
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
      expectedBranchId: ROOT_EVENT_BRANCH_ID,
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

function exportRequest(privateRefs: readonly string[]) {
  return {
    streamType: STREAM_TYPE,
    streamId: SESSION_ID,
    privateRefs,
  };
}

async function journalEventCount(journal: IEventJournal): Promise<number> {
  const rows = await journal.readStream({
    streamType: STREAM_TYPE,
    streamId: SESSION_ID,
    branchId: ROOT_EVENT_BRANCH_ID,
    afterRevision: 0,
    limit: 500,
  });
  return rows.length;
}

function playerBAuditSnapshot(
  audit: SQLiteActionAuditRepository,
): readonly IActionAuditRecord[] {
  return audit
    .readBySession(SESSION_ID)
    .filter((row) => row.actor.principalId === PLAYER_B_ROW.principalId);
}

function assertAbsent(blob: string, fragments: readonly string[]): void {
  for (let index = 0; index < fragments.length; index += 1) {
    const fragment = fragments[index];
    if (fragment === undefined) continue;
    expect(blob).not.toContain(fragment);
  }
}

function assertPresent(blob: string, fragments: readonly string[]): void {
  for (let index = 0; index < fragments.length; index += 1) {
    const fragment = fragments[index];
    if (fragment === undefined) continue;
    expect(blob).toContain(fragment);
  }
}

describe('three-context privacy evidence (service boundary)', function () {
  let dir: string;
  let dbPath: string;

  beforeEach(async function () {
    dir = await mkdtemp(path.join(tmpdir(), 'privacy-evidence-'));
    dbPath = path.join(dir, 'privacy-evidence.db');
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

  function makeWorld(): {
    readonly history: ViewerHistoryService;
    readonly journal: InMemoryEventJournal;
    readonly audit: SQLiteActionAuditRepository;
    readonly privateRepo: SQLitePrivateRecordRepository;
    readonly resolver: AuthorizedViewerResolver;
  } {
    const db = database();
    const journal = new InMemoryEventJournal(recordedAt);
    const resolver = seatedResolver();
    const registry = new ViewerAudienceProjectorRegistry();
    registry.register(audienceDefinition());
    const projection = new ViewerProjectionService({ journal, registry });
    const store = new SQLiteDeliveryEpochStore(db, createdAt);
    const audit = new SQLiteActionAuditRepository(db);
    const privateRepo = new SQLitePrivateRecordRepository(db);
    const history = new ViewerHistoryService({
      resolver,
      projection,
      epochStore: store,
      auditRepo: audit,
      privateRepo,
    });
    return { history, journal, audit, privateRepo, resolver };
  }

  async function seedWorld(): Promise<{
    readonly history: ViewerHistoryService;
    readonly journal: InMemoryEventJournal;
    readonly audit: SQLiteActionAuditRepository;
    readonly privateRepo: SQLitePrivateRecordRepository;
    readonly resolver: AuthorizedViewerResolver;
    readonly stored: {
      readonly publicEvent: IStoredEvent;
      readonly ownerA: IStoredEvent;
      readonly ownerB: IStoredEvent;
      readonly gmOnly: IStoredEvent;
      readonly hidden: IStoredEvent;
    };
    readonly privateRef: string;
  }> {
    const world = makeWorld();
    const publicEvent = await appendEvent(world.journal, {
      expectedRevision: 0,
      eventType: 'public_notice',
      payload: { headline: PUBLIC_MARKER },
      commandId: 'cmd-privacy-public',
    });
    const ownerA = await appendEvent(world.journal, {
      expectedRevision: 1,
      eventType: 'owner_note',
      payload: {
        note: OWNER_A_MARKER,
        participantId: PLAYER_A_ROW.participantId,
        forceId: PLAYER_A_ROW.ownedForceIds[0] ?? 'force-privacy-a',
      },
      commandId: 'cmd-privacy-owner-a',
    });
    const ownerB = await appendEvent(world.journal, {
      expectedRevision: 2,
      eventType: 'owner_note',
      payload: {
        note: OWNER_B_MARKER,
        participantId: PLAYER_B_ROW.participantId,
        forceId: PLAYER_B_ROW.ownedForceIds[0] ?? 'force-privacy-b',
      },
      commandId: 'cmd-privacy-owner-b',
    });
    const gmOnly = await appendEvent(world.journal, {
      expectedRevision: 3,
      eventType: 'gm_briefing',
      payload: { briefing: GM_ONLY_MARKER },
      commandId: 'cmd-privacy-gm-only',
    });
    const hidden = await appendEvent(world.journal, {
      expectedRevision: 4,
      eventType: 'hidden_authority',
      payload: { secret: HIDDEN_MARKER },
      commandId: 'cmd-privacy-hidden',
    });

    const playerAAccepted: IActionAuditInsert = {
      campaignSessionId: SESSION_ID,
      matchId: MATCH_ID,
      streamType: STREAM_TYPE,
      streamId: SESSION_ID,
      commandId: 'cmd-audit-player-a',
      commandDigest: DIGEST_A,
      actor: {
        principalId: PLAYER_A_ROW.principalId,
        participantId: PLAYER_A_ROW.participantId,
        role: 'player',
      },
      correlationId: 'corr-privacy-a',
      createdAt: '2026-08-22T04:00:00.000Z',
      lifecycleState: 'accepted',
      safeReasonCode: null,
      committedFirstRevision: PLAYER_A_FIRST_REV,
      committedLastRevision: PLAYER_A_LAST_REV,
      committedEventCount: 3,
    };
    const playerBAccepted: IActionAuditInsert = {
      campaignSessionId: SESSION_ID,
      matchId: MATCH_ID,
      streamType: STREAM_TYPE,
      streamId: SESSION_ID,
      commandId: 'cmd-audit-player-b',
      commandDigest: DIGEST_B,
      actor: {
        principalId: PLAYER_B_ROW.principalId,
        participantId: PLAYER_B_ROW.participantId,
        role: 'player',
      },
      correlationId: 'corr-privacy-b',
      createdAt: '2026-08-22T04:01:00.000Z',
      lifecycleState: 'accepted',
      safeReasonCode: null,
      committedFirstRevision: PLAYER_B_FIRST_REV,
      committedLastRevision: PLAYER_B_LAST_REV,
      committedEventCount: 2,
    };
    expect(world.audit.recordLifecycle(playerAAccepted).kind).toBe('created');
    expect(world.audit.recordLifecycle(playerBAccepted).kind).toBe('created');

    const created = world.privateRepo.createPrivateRecord({
      campaignSessionId: SESSION_ID,
      commandId: 'cmd-privacy-private',
      recordKind: 'gm-reason',
      payload: PRIVATE_MARKER,
      retentionClass: 'session',
      createdAt: CREATED_AT,
    });

    return {
      history: world.history,
      journal: world.journal,
      audit: world.audit,
      privateRepo: world.privateRepo,
      resolver: world.resolver,
      stored: { publicEvent, ownerA, ownerB, gmOnly, hidden },
      privateRef: created.opaqueRef,
    };
  }

  function forbiddenAuthorityFragments(stored: {
    readonly ownerB: IStoredEvent;
    readonly gmOnly: IStoredEvent;
    readonly hidden: IStoredEvent;
  }): readonly string[] {
    return [
      OWNER_B_MARKER,
      GM_ONLY_MARKER,
      HIDDEN_MARKER,
      PRIVATE_MARKER,
      String(PLAYER_A_FIRST_REV),
      String(PLAYER_A_LAST_REV),
      String(PLAYER_B_FIRST_REV),
      String(PLAYER_B_LAST_REV),
      stored.ownerB.eventDigest,
      stored.gmOnly.eventDigest,
      stored.hidden.eventDigest,
      ...RAW_FIELD_NAMES,
    ];
  }

  async function readPrincipalViews(
    history: ViewerHistoryService,
    principalId: string,
    privateRef: string,
  ): Promise<{
    readonly historyPage: unknown;
    readonly timeline: unknown;
    readonly exported: unknown;
    readonly blob: string;
  }> {
    const historyPage = await history.readHistory(
      principalId,
      SESSION_ID,
      historyRequest(),
    );
    const timeline = await history.readTimeline(principalId, SESSION_ID, {
      campaignSessionId: SESSION_ID,
    });
    const exported = await history.exportForViewer(
      principalId,
      SESSION_ID,
      exportRequest([privateRef]),
    );
    return {
      historyPage,
      timeline,
      exported,
      blob: `${leakBlob(historyPage)}${leakBlob(timeline)}${leakBlob(exported)}`,
    };
  }

  describe('pre-serialization objects', function () {
    it('playerA outputs contain playerA facts and omit playerB/gm-only/hidden/private/authority', async function () {
      const world = await seedWorld();
      const views = await readPrincipalViews(
        world.history,
        PLAYER_A_ROW.principalId,
        world.privateRef,
      );

      expect(views.historyPage).toEqual(
        expect.objectContaining({ kind: 'page' }),
      );
      assertPresent(views.blob, [
        PUBLIC_MARKER,
        OWNER_A_MARKER,
        PLAYER_A_ROW.principalId,
      ]);
      assertAbsent(views.blob, [
        ...forbiddenAuthorityFragments(world.stored),
        PLAYER_B_ROW.principalId,
      ]);
    });

    it('playerB is the symmetric owner-control for OWNER-B and still omits gm-only/hidden/private', async function () {
      const world = await seedWorld();
      const views = await readPrincipalViews(
        world.history,
        PLAYER_B_ROW.principalId,
        world.privateRef,
      );

      assertPresent(views.blob, [
        PUBLIC_MARKER,
        OWNER_B_MARKER,
        PLAYER_B_ROW.principalId,
      ]);
      assertAbsent(views.blob, [
        OWNER_A_MARKER,
        GM_ONLY_MARKER,
        HIDDEN_MARKER,
        PRIVATE_MARKER,
        PLAYER_A_ROW.principalId,
        world.stored.ownerA.eventDigest,
        world.stored.gmOnly.eventDigest,
        world.stored.hidden.eventDigest,
        ...RAW_FIELD_NAMES,
      ]);
    });

    it('gm sees both owner markers and gm-only, still omits hidden and default-export private payload', async function () {
      const world = await seedWorld();
      const views = await readPrincipalViews(
        world.history,
        GM_ROW.principalId,
        world.privateRef,
      );

      assertPresent(views.blob, [
        PUBLIC_MARKER,
        OWNER_A_MARKER,
        OWNER_B_MARKER,
        GM_ONLY_MARKER,
        PLAYER_A_ROW.principalId,
        PLAYER_B_ROW.principalId,
        String(PLAYER_A_FIRST_REV),
        String(PLAYER_B_FIRST_REV),
      ]);
      assertAbsent(views.blob, [
        HIDDEN_MARKER,
        PRIVATE_MARKER,
        world.stored.hidden.eventDigest,
        ...RAW_FIELD_NAMES,
      ]);
    });
  });

  describe('exported bytes', function () {
    it('player export buffers omit private/hidden/digest markers; gm includePrivate contains private and records access', async function () {
      const world = await seedWorld();
      const playerExport = await world.history.exportForViewer(
        PLAYER_A_ROW.principalId,
        SESSION_ID,
        exportRequest([world.privateRef]),
      );
      const playerBytes = Buffer.from(JSON.stringify(playerExport), 'utf8');
      expect(playerBytes.includes(Buffer.from(PRIVATE_MARKER, 'utf8'))).toBe(
        false,
      );
      expect(playerBytes.includes(Buffer.from(HIDDEN_MARKER, 'utf8'))).toBe(
        false,
      );
      expect(
        playerBytes.includes(
          Buffer.from(world.stored.hidden.eventDigest, 'utf8'),
        ),
      ).toBe(false);
      expect(
        playerBytes.includes(
          Buffer.from(world.stored.gmOnly.eventDigest, 'utf8'),
        ),
      ).toBe(false);
      expect(playerBytes.includes(Buffer.from(OWNER_A_MARKER, 'utf8'))).toBe(
        true,
      );

      const gmDefault = await world.history.exportForViewer(
        GM_ROW.principalId,
        SESSION_ID,
        exportRequest([world.privateRef]),
      );
      const gmDefaultBytes = Buffer.from(JSON.stringify(gmDefault), 'utf8');
      expect(gmDefaultBytes.includes(Buffer.from(PRIVATE_MARKER, 'utf8'))).toBe(
        false,
      );
      expect(gmDefaultBytes.includes(Buffer.from(GM_ONLY_MARKER, 'utf8'))).toBe(
        true,
      );

      const gmPrivate = await world.history.exportForViewer(
        GM_ROW.principalId,
        SESSION_ID,
        {
          streamType: STREAM_TYPE,
          streamId: SESSION_ID,
          includePrivate: true,
          occurredAt: OCCURRED_AT,
          privateRefs: [world.privateRef],
        },
      );
      const gmPrivateBytes = Buffer.from(JSON.stringify(gmPrivate), 'utf8');
      expect(gmPrivateBytes.includes(Buffer.from(PRIVATE_MARKER, 'utf8'))).toBe(
        true,
      );
      expect(gmPrivateBytes.includes(Buffer.from(HIDDEN_MARKER, 'utf8'))).toBe(
        false,
      );
      expect(world.privateRepo.listAccessAudit(world.privateRef)).toEqual([
        expect.objectContaining({
          purpose: 'export-attempt',
          result: 'granted',
          actorRole: 'gm',
          actorPrincipalId: GM_ROW.principalId,
        }),
      ]);
    });
  });

  describe('cross-principal cursor', function () {
    it('playerB presenting playerA cursor matches a fabricated-unknown-id stale-epoch byte-for-byte', async function () {
      const world = await seedWorld();
      const playerAPage = await world.history.readHistory(
        PLAYER_A_ROW.principalId,
        SESSION_ID,
        historyRequest(),
      );
      expect(playerAPage.kind).toBe('page');
      if (playerAPage.kind !== 'page') return;

      await world.history.readHistory(
        PLAYER_B_ROW.principalId,
        SESSION_ID,
        historyRequest(),
      );

      const foreignCursor: IDeliveryCursor = {
        deliveryEpochId: playerAPage.deliveryEpochId,
        afterSequence: 0,
      };
      const unknownCursor: IDeliveryCursor = {
        deliveryEpochId: FOREIGN_EPOCH_ID,
        afterSequence: 0,
      };
      const viaForeign = await world.history.readHistory(
        PLAYER_B_ROW.principalId,
        SESSION_ID,
        historyRequest(foreignCursor),
      );
      const viaUnknown = await world.history.readHistory(
        PLAYER_B_ROW.principalId,
        SESSION_ID,
        historyRequest(unknownCursor),
      );

      expect(viaForeign.kind).toBe('stale-epoch');
      expect(viaUnknown.kind).toBe('stale-epoch');
      expect(viaForeign).toEqual(viaUnknown);
      expect(
        Buffer.from(JSON.stringify(viaForeign), 'utf8').equals(
          Buffer.from(JSON.stringify(viaUnknown), 'utf8'),
        ),
      ).toBe(true);
      expect('facts' in viaForeign).toBe(false);
    });
  });

  describe('rejection', function () {
    it('playerA claiming playerB participant/force is typed scope-escalation with pinned audit and journal counts', async function () {
      const world = await seedWorld();
      const journalBefore = await journalEventCount(world.journal);
      const playerBAuditBefore = leakBlob(playerBAuditSnapshot(world.audit));
      const sessionAuditBefore = world.audit.readBySession(SESSION_ID).length;

      let refusal: HumanActionAuthorizationError | null = null;
      try {
        await authorizeHumanAction(
          world.resolver,
          PLAYER_A_ROW.principalId,
          SESSION_ID,
          {
            kind: 'command',
            claimedParticipantId: PLAYER_B_ROW.participantId,
            claimedForceIds: [...PLAYER_B_ROW.ownedForceIds],
          },
        );
      } catch (error) {
        if (isHumanActionAuthorizationError(error)) {
          refusal = error;
        } else {
          throw error;
        }
      }
      expect(refusal).not.toBeNull();
      if (refusal === null) {
        throw new Error('expected HumanActionAuthorizationError');
      }
      expect(refusal.code).toBe('scope-escalation');
      expect(refusal.message).toBe('Authorization refused');
      expect(refusal.message).not.toContain(PLAYER_B_ROW.principalId);
      expect(refusal.message).not.toContain(PLAYER_B_ROW.participantId);

      const ownCommand = await authorizeHumanAction(
        world.resolver,
        PLAYER_A_ROW.principalId,
        SESSION_ID,
        {
          kind: 'command',
          claimedParticipantId: PLAYER_A_ROW.participantId,
          claimedForceIds: [...PLAYER_A_ROW.ownedForceIds],
        },
      );
      expect(ownCommand.principalId).toBe(PLAYER_A_ROW.principalId);
      expect(ownCommand.ownedForceIds).toEqual([...PLAYER_A_ROW.ownedForceIds]);

      expect(await journalEventCount(world.journal)).toBe(journalBefore);
      expect(world.audit.readBySession(SESSION_ID).length).toBe(
        sessionAuditBefore,
      );
      expect(leakBlob(playerBAuditSnapshot(world.audit))).toBe(
        playerBAuditBefore,
      );
    });
  });
});
