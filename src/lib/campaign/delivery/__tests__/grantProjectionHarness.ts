/**
 * Shared SQLite + journal harness for campaign delivery tests.
 * Not a test file; loaded by the suites under this folder.
 */

import type { Database } from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type {
  ICampaignGrant,
  ICampaignGrantStore,
  IIssueCampaignGrant,
} from '@/lib/campaign/grants/ICampaignGrantStore';
import type {
  CampaignEventScope,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  AuthorizedViewerResolver,
  mintVerifiedPrincipal,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import { SQLiteDeliveryEpochStore } from '@/lib/multiplayer/server/delivery/SQLiteDeliveryEpochStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import type { IProjectCampaignStreamDeps } from '../projectCampaignStreamForGrant';

import { SQLiteCampaignGrantStore } from '../../grants/SQLiteCampaignGrantStore';
import {
  appendCampaignCommandBatch,
  type ICampaignJournalEnvelope,
} from '../../sync/JournalCampaignEventStore';
import { CampaignGrantMembershipSource } from '../CampaignGrantMembershipSource';

export const ISSUER_PUBLIC_KEY = 'aXNzdWVyLXB1YmxpYy1rZXktZml4dHVyZQ==';
export const ISSUED_AT = '2026-08-22T16:00:00.000Z';
export const EXPIRES_AT = '2026-08-22T20:00:00.000Z';
export const REVOKED_AT = '2026-08-22T17:00:00.000Z';
export const EVENT_TS = '2026-08-22T16:30:00.000Z';
export const CLOCK_AT_ISSUE = ISSUED_AT;
export const PARTICIPANT_PLAYER = 'participant-player';
export const PARTICIPANT_GM = 'participant-gm';

export class BrokenCampaignGrantStore implements ICampaignGrantStore {
  /** Always throws; models a downed grant store. */
  public issueGrant(_input: IIssueCampaignGrant): ICampaignGrant {
    throw new Error('grant store down');
  }

  /** Always throws; models a downed grant store. */
  public listGrants(_campaignId: string): readonly ICampaignGrant[] {
    throw new Error('grant store down');
  }

  /** Always throws; models a downed grant store. */
  public revokeGrant(_grantId: string, _revokedAt: string): ICampaignGrant {
    throw new Error('grant store down');
  }

  /** Always throws; models a downed grant store. */
  public getGrant(_grantId: string): ICampaignGrant | null {
    throw new Error('grant store down');
  }
}

export class InjectedCampaignClock {
  public iso: string = CLOCK_AT_ISSUE;

  /** Returns the injected ISO timestamp; never reads the system clock. */
  public now(): string {
    return this.iso;
  }
}

export interface ICampaignDeliveryHarness {
  readonly dir: string;
  readonly dbPath: string;
  /** The borrowed process handle, for stores that take one directly. */
  readonly db: Database;
  readonly clock: InjectedCampaignClock;
  readonly grantStore: SQLiteCampaignGrantStore;
  readonly membership: CampaignGrantMembershipSource;
  readonly resolver: AuthorizedViewerResolver;
  readonly journal: SQLiteEventJournal<ICampaignJournalEnvelope>;
  readonly deliveryStore: SQLiteDeliveryEpochStore;
  readonly deps: IProjectCampaignStreamDeps;
}

/**
 * Opens one file-backed SQLite database with grant, delivery-epoch, and
 * journal tables, plus injected clocks.
 */
export async function openCampaignDeliveryHarness(): Promise<ICampaignDeliveryHarness> {
  const dir = await mkdtemp(path.join(tmpdir(), 'campaign-delivery-'));
  const dbPath = path.join(dir, 'campaign-delivery.db');
  resetSQLiteService();
  return openCampaignDeliveryHarnessAt(dir, dbPath);
}

/** Opens adapters over an existing path. Shared by open and reopen. */
async function openCampaignDeliveryHarnessAt(
  dir: string,
  dbPath: string,
): Promise<ICampaignDeliveryHarness> {
  getSQLiteService({ path: dbPath }).initialize();
  const db = getSQLiteService().getDatabase();
  const grantStore = new SQLiteCampaignGrantStore(db);
  const clock = new InjectedCampaignClock();
  const membership = new CampaignGrantMembershipSource(grantStore, function () {
    return clock.now();
  });
  const resolver = new AuthorizedViewerResolver(membership);
  const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
    db,
    function () {
      return EVENT_TS;
    },
  );
  const deliveryStore = new SQLiteDeliveryEpochStore(db, function () {
    return ISSUED_AT;
  });
  return {
    dir,
    dbPath,
    db,
    clock,
    grantStore,
    membership,
    resolver,
    journal,
    deliveryStore,
    deps: {
      grantStore,
      viewerResolver: resolver,
      journal,
      deliveryStore,
      clock: function () {
        return clock.now();
      },
    },
  };
}

/**
 * Closes and reopens the SAME database file, returning a fresh set of
 * adapters over it. A genuine restart: nothing in-process survives, so
 * "survives a restart" cannot pass on an in-memory leftover.
 */
export async function reopenCampaignDeliveryHarness(
  harness: ICampaignDeliveryHarness,
): Promise<ICampaignDeliveryHarness> {
  resetSQLiteService();
  return openCampaignDeliveryHarnessAt(harness.dir, harness.dbPath);
}

/** Closes the process-global SQLite handle and deletes the temp dir. */
export async function closeCampaignDeliveryHarness(
  harness: ICampaignDeliveryHarness,
): Promise<void> {
  resetSQLiteService();
  await rm(harness.dir, { recursive: true, force: true, maxRetries: 3 });
}

/** Issues a grant with the shared issuer key and injected timestamps. */
export function issueTestGrant(
  harness: ICampaignDeliveryHarness,
  input: {
    readonly campaignId: string;
    readonly participantId: string;
    readonly scopes: readonly string[];
  },
): ICampaignGrant {
  return harness.grantStore.issueGrant({
    campaignId: input.campaignId,
    participantId: input.participantId,
    issuerPublicKey: ISSUER_PUBLIC_KEY,
    scopes: input.scopes,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
  });
}

/**
 * Builds a FundsChanged event so tests can stamp an arbitrary scope
 * and a unique reason marker without inventing a new event type.
 */
export function fundsEvent(
  campaignId: string,
  sequence: number,
  scope: CampaignEventScope,
  reason: string,
): ICampaignEvent {
  return {
    sequence,
    campaignId,
    ts: EVENT_TS,
    authorPlayerId: 'pid-host',
    type: 'FundsChanged',
    scope,
    payload: { delta: 0, reason, balance: 1 },
  };
}

/** Appends one campaign event as its own command so identities stay distinct. */
export async function appendCampaignEvent(
  harness: ICampaignDeliveryHarness,
  event: ICampaignEvent,
): Promise<void> {
  const result = await appendCampaignCommandBatch(harness.journal, {
    campaignId: event.campaignId,
    commandId: `cmd-${event.campaignId}-${event.sequence}`,
    events: [event],
    expectedPostStateDigest: null,
  });
  if (result.kind !== 'committed') {
    throw new Error(`expected committed append, got ${result.kind}`);
  }
}

/** Appends a stamped scope/reason script as contiguous campaign sequences. */
export async function appendScopeScript(
  harness: ICampaignDeliveryHarness,
  campaignId: string,
  script: readonly {
    readonly scope: CampaignEventScope;
    readonly reason: string;
  }[],
): Promise<void> {
  for (let index = 0; index < script.length; index += 1) {
    const step = script[index];
    if (step === undefined) continue;
    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, index, step.scope, step.reason),
    );
  }
}

/** Counts durable mapping rows for one delivery epoch. */
export function mappingCount(epochId: string): number {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT COUNT(*) AS c FROM delivery_event_mapping
       WHERE delivery_epoch_id = ?`,
    )
    .get(epochId) as { c: number };
  return row.c;
}

/** Mints a server-verified principal for the grant's participant. */
export function mintGrantPrincipal(participantId: string) {
  return mintVerifiedPrincipal(participantId);
}
