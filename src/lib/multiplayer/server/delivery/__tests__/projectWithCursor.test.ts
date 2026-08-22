/**
 * projectWithCursor consumption shape (authority-audit PR 8).
 *
 * Pins: a valid cursor pages facts after afterSequence; a stale or
 * foreign cursor returns the typed stale-epoch result with no facts and
 * no new mappings; reconnect with the returned baseline reuses the
 * same sequences.
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

import { DELIVERY_EPOCH_STALE_MESSAGE } from '../IDeliveryEpochStore';
import { projectWithCursor } from '../projectWithDelivery';
import { SQLiteDeliveryEpochStore } from '../SQLiteDeliveryEpochStore';

const CREATED_AT = '2026-08-21T23:00:00.000Z';
const OCCURRED_AT = '2026-08-21T22:00:00.000Z';
const RECORDED_AT = '2026-08-21T22:30:00.000Z';
const STREAM_TYPE = 'cursor-proof';
const SESSION_ID = 'session-cursor';
const MATCH_ID = 'match-cursor';
const FOREIGN_EPOCH_ID = 'a'.repeat(32);

const PLAYER_ROW: IMembershipRecord = {
  principalId: 'user-cursor',
  principalKind: 'human',
  campaignId: 'campaign-alpha',
  campaignSessionId: SESSION_ID,
  matchId: MATCH_ID,
  participantId: 'participant-cursor',
  role: 'player',
  ownedForceIds: ['force-1'],
  membershipRevision: 3,
  active: true,
};

const GM_ROW: IMembershipRecord = {
  ...PLAYER_ROW,
  principalId: 'user-cursor-gm',
  participantId: 'participant-cursor-gm',
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

/** Copies headline onto a fresh projector payload. */
function projectHeadline(payload: unknown): JsonValue {
  if (typeof payload !== 'object' || payload === null) return { headline: '' };
  const record = payload as { readonly [key: string]: unknown };
  const headline = record['headline'];
  return { headline: typeof headline === 'string' ? headline : '' };
}

/** Audience catalog with a single public notice type. */
function audienceDefinition(): IViewerAudienceProjectorDefinition {
  return {
    projectorVersion: 1,
    streamType: STREAM_TYPE,
    decisions: [
      {
        eventType: 'public_notice',
        decision: { kind: 'public', project: projectHeadline },
      },
    ],
  };
}

function committed(result: EventJournalAppendResult): IStoredEvent[] {
  if (result.kind !== 'committed') {
    throw new Error(`expected committed append, got ${result.kind}`);
  }
  return [...result.events];
}

/** Appends one public notice and returns the stored row. */
async function appendNotice(
  journal: IEventJournal,
  expectedRevision: number,
  headline: string,
  commandId: string,
): Promise<IStoredEvent> {
  const rows = committed(
    await journal.append({
      streamType: STREAM_TYPE,
      streamId: SESSION_ID,
      expectedBranchId: 'root',
      expectedRevision,
      commandId,
      principal: PRINCIPAL,
      events: [
        {
          eventId: `${commandId}-event`,
          eventType: 'public_notice',
          eventVersion: 1,
          correlationId: `correlation-${commandId}`,
          causationEventIds: [],
          occurredAt: OCCURRED_AT,
          payload: { headline },
          entityRefs: [],
        },
      ],
    }),
  );
  const stored = rows[0];
  if (stored === undefined) throw new Error('append produced no event');
  return stored;
}

describe('projectWithCursor', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'project-with-cursor-'));
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

  function makeService(journal: IEventJournal): ViewerProjectionService {
    const registry = new ViewerAudienceProjectorRegistry();
    registry.register(audienceDefinition());
    return new ViewerProjectionService({ journal, registry });
  }

  function projectionRequest(): IViewerProjectionRequest {
    return { streamType: STREAM_TYPE, streamId: SESSION_ID };
  }

  it('pages facts after afterSequence and reuses mappings on reconnect', async () => {
    const store = openStore();
    const player = await resolveViewer(PLAYER_ROW);
    const gm = await resolveViewer(GM_ROW);
    const journal = new InMemoryEventJournal(() => RECORDED_AT);
    await appendNotice(journal, 0, 'NOTICE-A', 'cmd-a');
    await appendNotice(journal, 1, 'NOTICE-B', 'cmd-b');
    await appendNotice(journal, 2, 'NOTICE-C', 'cmd-c');
    const service = makeService(journal);

    const baselinePage = await projectWithCursor(
      service,
      store,
      player,
      projectionRequest(),
      null,
    );
    expect(baselinePage.kind).toBe('page');
    if (baselinePage.kind !== 'page') return;
    expect(baselinePage.facts.map((row) => row.deliverySequence)).toEqual([
      1, 2, 3,
    ]);
    expect(baselinePage.facts.every((row) => row.reused === false)).toBe(true);
    expect(baselinePage.baseline.deliveryEpochId).toBe(
      baselinePage.deliveryEpochId,
    );

    const paged = await projectWithCursor(
      service,
      store,
      player,
      projectionRequest(),
      {
        deliveryEpochId: baselinePage.deliveryEpochId,
        afterSequence: 1,
      },
    );
    expect(paged.kind).toBe('page');
    if (paged.kind !== 'page') return;
    expect(paged.facts.map((row) => row.deliverySequence)).toEqual([2, 3]);
    expect(paged.facts.every((row) => row.reused)).toBe(true);
    expect(paged.deliveryEpochId).toBe(baselinePage.deliveryEpochId);

    const beforeStale = mappingCount(baselinePage.deliveryEpochId);
    const gmEpoch = store.resolveEpoch(gm, {
      streamType: STREAM_TYPE,
      streamId: SESSION_ID,
      projectorVersion: 1,
    });
    const staleForeign = await projectWithCursor(
      service,
      store,
      player,
      projectionRequest(),
      { deliveryEpochId: gmEpoch.deliveryEpochId, afterSequence: 0 },
    );
    expect(staleForeign).toEqual({
      kind: 'stale-epoch',
      message: DELIVERY_EPOCH_STALE_MESSAGE,
      newBaseline: {
        deliveryEpochId: baselinePage.deliveryEpochId,
        effectiveGeneration: baselinePage.effectiveGeneration,
      },
    });
    expect('facts' in staleForeign).toBe(false);
    expect(mappingCount(baselinePage.deliveryEpochId)).toBe(beforeStale);

    const staleUnknown = await projectWithCursor(
      service,
      store,
      player,
      projectionRequest(),
      { deliveryEpochId: FOREIGN_EPOCH_ID, afterSequence: 0 },
    );
    expect(staleUnknown).toEqual(staleForeign);
    expect(mappingCount(baselinePage.deliveryEpochId)).toBe(beforeStale);

    if (staleForeign.kind !== 'stale-epoch') return;
    const reconnect = await projectWithCursor(
      service,
      store,
      player,
      projectionRequest(),
      {
        deliveryEpochId: staleForeign.newBaseline.deliveryEpochId,
        afterSequence: 0,
      },
    );
    expect(reconnect.kind).toBe('page');
    if (reconnect.kind !== 'page') return;
    expect(reconnect.facts.map((row) => row.deliverySequence)).toEqual([
      1, 2, 3,
    ]);
    expect(reconnect.facts.every((row) => row.reused)).toBe(true);
    expect(reconnect.deliveryEpochId).toBe(baselinePage.deliveryEpochId);
  });
});
