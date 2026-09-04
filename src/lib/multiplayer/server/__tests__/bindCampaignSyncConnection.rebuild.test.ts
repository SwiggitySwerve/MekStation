/**
 * LIVE campaign frames refuse while a campaign-stream correction lease
 * is held (umbrella 16.3 clause A). Gating at the three mutating arms
 * is what stops a proposal, a decision, or a host intent from committing
 * into the history the correction is replacing.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 */

import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type Database from 'better-sqlite3';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type {
  IClientMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { importCampaignBaseline } from '@/lib/campaign/authority/campaignAuthorityMigration';
import { CAMPAIGN_STREAM_TYPE } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso } from '@/types/multiplayer/Protocol';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import { CampaignHostRegistry } from '../CampaignHostRegistry';

const CAMPAIGN_ID = 'campaign-sync';
const MATCH_ID = 'match-campaign';
const NOW = '3025-01-03T00:00:00.000Z';
const TTL_MS = 30_000;

class MockWireSocket extends EventEmitter implements IMatchSocket {
  readonly sent: IServerMessage[] = [];
  readonly closes: Array<{ code?: number; reason?: string }> = [];
  readyState = 1;

  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.closes.push({ code, reason });
    this.emit('close');
  }

  inbound(message: IClientMessage | Record<string, unknown> | string): void {
    this.emit(
      'message',
      typeof message === 'string' ? message : JSON.stringify(message),
    );
  }
}

const quietLogger = {
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

async function flushAsyncHandlers(): Promise<void> {
  for (let i = 0; i < 32; i += 1) {
    await Promise.resolve();
  }
}

describe('bindCampaignSyncConnection during a campaign history rebuild', () => {
  let dir: string;
  let db: Database.Database;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-sync-rebuild-'));
    resetSQLiteService();
    const service = getSQLiteService({ path: path.join(dir, 'campaign.db') });
    service.initialize();
    db = service.getDatabase();
    const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      db,
      () => NOW,
    );
    const imported = await importCampaignBaseline(journal, {
      campaignId: CAMPAIGN_ID,
      state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance: 1_000_000 },
      sourceSnapshotRevision: 1,
      importedAt: NOW,
    });
    if (imported.kind !== 'imported') throw new Error(imported.kind);
    new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function streamRevision(): number {
    const row = db
      .prepare(
        `SELECT stream_revision AS revision FROM event_journal_stream_heads
          WHERE stream_type = ? AND stream_id = ?`,
      )
      .get(CAMPAIGN_STREAM_TYPE, CAMPAIGN_ID) as
      | { readonly revision: number }
      | undefined;
    return row?.revision ?? 0;
  }

  function headDigest(): string {
    const row = db
      .prepare(
        `SELECT event_digest AS digest FROM event_journal_stream_heads
          WHERE stream_type = ? AND stream_id = ?`,
      )
      .get(CAMPAIGN_STREAM_TYPE, CAMPAIGN_ID) as
      | { readonly digest: string }
      | undefined;
    if (row === undefined) throw new Error(`no head for ${CAMPAIGN_ID}`);
    return row.digest;
  }

  /** WHAT: hold the real correction lease a GM rewind holds. WHY: the live door must consult the same SQLite rows the pipeline reads. */
  function acquireLease(): void {
    new SQLiteEventHistoryCorrectionLeaseStore(
      db,
      new SQLiteEventHistoryBranchStore(db),
    ).acquireCorrectionLease({
      streamType: CAMPAIGN_STREAM_TYPE,
      streamId: CAMPAIGN_ID,
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'authorized rewind to the prior contract',
      ttlMs: TTL_MS,
      expectedBranchId: 'root',
      expectedRevision: streamRevision(),
      expectedDigest: headDigest(),
      expectedGeneration: 1,
    });
  }

  async function openHost(
    arbitrationMode: 'auto-approve' | 'host-review' = 'auto-approve',
  ): Promise<{
    readonly socket: MockWireSocket;
    readonly registry: CampaignHostRegistry;
  }> {
    const registry = new CampaignHostRegistry();
    await registry.register(MATCH_ID, {
      campaignId: CAMPAIGN_ID,
      hostPlayerId: 'pid_host',
      roomCode: 'ABC234',
      arbitrationMode,
      state: {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance: 1_000_000,
      },
    });
    const socket = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: MATCH_ID,
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    socket.sent.length = 0;
    return { socket, registry };
  }

  /** WHAT: the typed rebuild Error the three arms must answer. WHY: one matcher so a missing head cannot hide behind a code-only assertion. */
  function expectRebuildRefusal(
    socket: MockWireSocket,
    revision: number,
  ): void {
    const refusal = socket.sent.find(
      (message) =>
        message.kind === 'Error' && message.code === 'PROJECTION_REBUILDING',
    );
    expect(refusal).toEqual(
      expect.objectContaining({
        kind: 'Error',
        matchId: MATCH_ID,
        code: 'PROJECTION_REBUILDING',
        recoveryAction: 'retry-after-rebuild',
        conflictHead: { branchId: 'root', revision },
        activeHead: { branchId: 'root', revision },
      }),
    );
  }

  it('refuses CampaignHostIntent with PROJECTION_REBUILDING and appends nothing', async () => {
    const { socket, registry } = await openHost();
    const before = streamRevision();
    acquireLease();

    socket.inbound({
      kind: 'CampaignHostIntent',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: {
        kind: 'SpendFunds',
        campaignId: CAMPAIGN_ID,
        intentId: 'host-during-rebuild',
        payload: { amount: 250_000, reason: 'repairs' },
      },
    });
    await flushAsyncHandlers();

    expectRebuildRefusal(socket, before);
    expect(streamRevision()).toBe(before);
    expect(registry.get(MATCH_ID)?.host.getState().balance).toBe(1_000_000);
  });

  it('refuses CampaignProposal with PROJECTION_REBUILDING and appends nothing', async () => {
    const { socket } = await openHost();
    const before = streamRevision();
    acquireLease();

    socket.inbound({
      kind: 'CampaignProposal',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'pid_host',
      proposal: {
        proposalId: 'proposal-during-rebuild',
        campaignId: CAMPAIGN_ID,
        proposingPlayerId: 'pid_host',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: CAMPAIGN_ID,
          intentId: 'intent-during-rebuild',
          payload: { amount: 1_000, reason: 'Ammo' },
        },
      },
    });
    await flushAsyncHandlers();

    expectRebuildRefusal(socket, before);
    expect(streamRevision()).toBe(before);
    expect(
      socket.sent.some((message) => message.kind === 'CampaignDecision'),
    ).toBe(false);
  });

  it('refuses CampaignDecision with PROJECTION_REBUILDING and appends nothing', async () => {
    const { socket, registry } = await openHost('host-review');
    socket.inbound({
      kind: 'CampaignProposal',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'pid_host',
      proposal: {
        proposalId: 'proposal-then-rebuild',
        campaignId: CAMPAIGN_ID,
        proposingPlayerId: 'pid_host',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: CAMPAIGN_ID,
          intentId: 'intent-then-rebuild',
          payload: { amount: 1_000, reason: 'Ammo' },
        },
      },
    });
    await flushAsyncHandlers();
    expect(registry.get(MATCH_ID)?.arbiter.getPendingProposals().length).toBe(1);
    socket.sent.length = 0;
    const before = streamRevision();
    acquireLease();

    socket.inbound({
      kind: 'CampaignDecision',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'pid_host',
      proposalId: 'proposal-then-rebuild',
      decision: 'approve',
    });
    await flushAsyncHandlers();

    expectRebuildRefusal(socket, before);
    expect(streamRevision()).toBe(before);
    expect(registry.get(MATCH_ID)?.arbiter.getPendingProposals().length).toBe(1);
    expect(registry.get(MATCH_ID)?.host.getState().balance).toBe(1_000_000);
  });

  it('dispatches the same three frames when no rebuild lease is held', async () => {
    const { socket, registry } = await openHost();

    socket.inbound({
      kind: 'CampaignHostIntent',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: {
        kind: 'SpendFunds',
        campaignId: CAMPAIGN_ID,
        intentId: 'host-no-lease',
        payload: { amount: 250_000, reason: 'repairs' },
      },
    });
    await flushAsyncHandlers();
    expect(registry.get(MATCH_ID)?.host.getState().balance).toBe(750_000);

    socket.inbound({
      kind: 'CampaignProposal',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'pid_host',
      proposal: {
        proposalId: 'proposal-no-lease',
        campaignId: CAMPAIGN_ID,
        proposingPlayerId: 'pid_host',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: CAMPAIGN_ID,
          intentId: 'intent-no-lease',
          payload: { amount: 1_000, reason: 'Ammo' },
        },
      },
    });
    await flushAsyncHandlers();
    expect(
      socket.sent.some((message) => message.kind === 'CampaignDecision'),
    ).toBe(true);

    socket.inbound({
      kind: 'CampaignDecision',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: 'pid_host',
      proposalId: 'unknown-proposal',
      decision: 'approve',
    });
    await flushAsyncHandlers();
    expect(
      socket.sent.some(
        (message) =>
          message.kind === 'Error' &&
          message.code === 'BAD_ENVELOPE' &&
          message.reason === 'unknown-proposal',
      ),
    ).toBe(true);
    expect(
      socket.sent.some(
        (message) =>
          message.kind === 'Error' && message.code === 'PROJECTION_REBUILDING',
      ),
    ).toBe(false);
  });
});
