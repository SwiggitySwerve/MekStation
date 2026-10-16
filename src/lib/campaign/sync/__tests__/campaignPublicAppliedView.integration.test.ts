import type Database from 'better-sqlite3';

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type {
  CampaignEventScope,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { replayCampaignReplacement } from '@/lib/campaign/rebuild/CampaignReplacementReplay';
import { activateCandidateBranch } from '@/lib/events/journal/EventHistoryActivation';
import { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { createDurableCampaignLaunchView } from '@/lib/multiplayer/server/campaignProgressionReaders.durable';
import { _resetDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import {
  activeCampaignSessionMembership,
  bindCampaignSessionParticipant,
  listActiveCampaignSessionParticipants,
  revokeCampaignSessionParticipant,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import {
  CampaignPublicAppliedViewStore,
  campaignViewerAuthorityFingerprint,
  readCampaignPublicAppliedView,
  type CampaignLaunchView,
  type ICampaignApplicationOffer,
  type ICampaignApplicationContext,
  type ICampaignApplicationPorts,
} from '../campaignPublicAppliedView';
import {
  appendCampaignCommandBatch,
  type ICampaignJournalEnvelope,
} from '../JournalCampaignEventStore';

describe('durable public applied view', () => {
  const key = {
    campaignId: 'campaign',
    sessionId: 'session',
    participantId: 'player',
  };
  let dir: string;
  let dbPath: string;
  let db: Database.Database;
  let store: CampaignPublicAppliedViewStore;
  let offer: ICampaignApplicationOffer | null;
  let context: ICampaignApplicationContext;
  let ports: ICampaignApplicationPorts;
  const rows = () =>
    db.prepare('SELECT * FROM campaign_public_applied_view').all();
  const apply = (receiptId = offer!.receiptId) =>
    store.accept({ ...key, receiptId });

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'p2ca-'));
    dbPath = path.join(dir, 'campaign.db');
    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
    db = getSQLiteService().getDatabase();
    bindCampaignSessionParticipant({
      ...key,
      seat: 'player',
      boundAt: '2026-10-16',
    });
    offer = {
      ...key,
      receiptId: 'receipt-4',
      branchId: 'root',
      effectiveGeneration: 0,
      acknowledgedJournalCut: 4,
      viewerAuthorityFingerprint: campaignViewerAuthorityFingerprint(
        activeCampaignSessionMembership(
          key.campaignId,
          key.sessionId,
          key.participantId,
        )!,
        { participantId: key.participantId, isGm: false },
      ),
      kind: 'baseline',
      predecessorReceiptId: null,
    };
    context = {
      branchId: 'root',
      effectiveGeneration: 0,
      headRevision: 6,
      viewer: { participantId: key.participantId, isGm: false },
      participantRemoved: false,
      membership: activeCampaignSessionMembership(
        key.campaignId,
        key.sessionId,
        key.participantId,
      ),
    };
    ports = {
      resolveDeliveredOffer: (handle, request) => {
        expect(handle).toBe(db);
        expect(handle.inTransaction).toBe(true);
        return request.receiptId === offer?.receiptId ? offer : null;
      },
      readCurrentContext: (handle) => {
        expect(handle).toBe(db);
        expect(handle.inTransaction).toBe(true);
        return {
          ...context,
          membership: activeCampaignSessionMembership(
            key.campaignId,
            key.sessionId,
            key.participantId,
          ),
        };
      },
    };
    store = new CampaignPublicAppliedViewStore(db, ports);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    resetSQLiteService();
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not infer application from membership or a zero cut; a real baseline may acknowledge zero', () => {
    expect(store.read(key)).toBeNull();
    expect(rows()).toEqual([]);
    offer = { ...offer!, acknowledgedJournalCut: 0 };
    expect(apply()).toEqual({ kind: 'accepted' });
    expect(store.read(key)?.acknowledgedJournalCut).toBe(0);
  });

  it('preserves exact duplicate bytes and monotone receipt/time across older tabs', () => {
    expect(apply()).toEqual({ kind: 'accepted' });
    const original = rows();
    expect(apply()).toEqual({ kind: 'duplicate' });
    expect(rows()).toEqual(original);
    offer = { ...offer!, receiptId: 'receipt-6', acknowledgedJournalCut: 6 };
    expect(apply()).toEqual({ kind: 'accepted' });
    const newer = rows();
    offer = { ...offer!, receiptId: 'old-tab', acknowledgedJournalCut: 5 };
    expect(apply()).toEqual({ kind: 'stale' });
    expect(rows()).toEqual(newer);
    offer = { ...offer!, receiptId: 'equal-cut', acknowledgedJournalCut: 6 };
    expect(apply()).toEqual({ kind: 'stale' });
    expect(rows()).toEqual(newer);
  });

  it('revalidates the actual public viewer and membership incarnation for duplicates', () => {
    apply();
    const before = rows();
    context = { ...context, viewer: { participantId: null, isGm: false } };
    expect(apply()).toEqual({ kind: 'refused', reason: 'not-admitted' });
    context = {
      ...context,
      viewer: { participantId: key.participantId, isGm: true },
    };
    expect(apply()).toEqual({ kind: 'refused', reason: 'current-authority' });
    context = {
      ...context,
      viewer: { participantId: key.participantId, isGm: false },
    };
    db.prepare('UPDATE campaign_session_participant SET bound_at = ?').run(
      'new-incarnation',
    );
    expect(apply()).toEqual({ kind: 'refused', reason: 'current-authority' });
    expect(rows()).toEqual(before);
  });

  it.each(['branchId', 'viewerAuthorityFingerprint'] as const)(
    'rejects empty %s',
    (field) => {
      offer = { ...offer!, [field]: ' ' };
      expect(apply()).toEqual({ kind: 'refused', reason: 'invalid-offer' });
      expect(rows()).toEqual([]);
    },
  );

  it('rejects conflicting receipt reuse', () => {
    apply();
    const before = rows();
    offer = { ...offer!, acknowledgedJournalCut: 5 };
    expect(apply()).toEqual({ kind: 'refused', reason: 'receipt-conflict' });
    expect(rows()).toEqual(before);
  });

  it.each(['campaignId', 'sessionId', 'participantId'] as const)(
    'refuses a foreign %s without creating another key',
    (field) => {
      offer = { ...offer!, [field]: 'foreign' };
      expect(apply()).toEqual({ kind: 'refused', reason: 'offer-binding' });
      expect(rows()).toEqual([]);
    },
  );

  it.each(['branchId', 'effectiveGeneration'] as const)(
    'refuses stale %s after current transaction revalidation',
    (field) => {
      apply();
      const before = rows();
      context = {
        ...context,
        [field]: field === 'effectiveGeneration' ? 1 : 'changed',
      };
      expect(apply()).toEqual({ kind: 'refused', reason: 'current-authority' });
      expect(rows()).toEqual(before);
    },
  );

  it('refuses unknown, forged-ahead and revoked evidence including duplicate revalidation', () => {
    expect(apply('unknown')).toEqual({
      kind: 'refused',
      reason: 'unknown-receipt',
    });
    offer = { ...offer!, acknowledgedJournalCut: 7 };
    expect(apply()).toEqual({ kind: 'refused', reason: 'current-authority' });
    expect(rows()).toEqual([]);
    offer = { ...offer!, acknowledgedJournalCut: 4 };
    apply();
    const before = rows();
    context = { ...context, participantRemoved: true };
    expect(apply()).toEqual({ kind: 'refused', reason: 'not-admitted' });
    context = { ...context, participantRemoved: false };
    db.prepare('UPDATE campaign_session_participant SET revoked_at = ?').run(
      '2026-10-16',
    );
    expect(apply()).toEqual({ kind: 'refused', reason: 'not-admitted' });
    expect(rows()).toEqual(before);
  });

  it('requires an exact predecessor-bound replacement for lineage or authority changes, even at lower cuts', () => {
    apply();
    const before = rows();
    context = {
      ...context,
      branchId: 'child',
      effectiveGeneration: 1,
      viewer: { ...context.viewer, isGm: true },
    };
    offer = {
      ...offer!,
      ...context,
      viewerAuthorityFingerprint: campaignViewerAuthorityFingerprint(
        context.membership!,
        context.viewer,
      ),
      receiptId: 'replacement',
      acknowledgedJournalCut: 1,
    };
    expect(apply()).toEqual({
      kind: 'refused',
      reason: 'replacement-required',
    });
    expect(rows()).toEqual(before);
    offer = { ...offer!, kind: 'replacement', predecessorReceiptId: 'wrong' };
    expect(apply()).toEqual({
      kind: 'refused',
      reason: 'replacement-required',
    });
    offer = { ...offer!, predecessorReceiptId: 'receipt-4' };
    expect(apply()).toEqual({ kind: 'accepted' });
    expect(store.read(key)).toMatchObject({
      branchId: 'child',
      acknowledgedJournalCut: 1,
    });
  });

  it('requires baseline evidence for the first row', () => {
    offer = { ...offer!, kind: 'delta' };
    expect(apply()).toEqual({ kind: 'refused', reason: 'baseline-required' });
    expect(rows()).toEqual([]);
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN])(
    'rejects invalid numeric evidence %s',
    (value) => {
      offer = { ...offer!, acknowledgedJournalCut: value };
      expect(apply()).toEqual({ kind: 'refused', reason: 'invalid-offer' });
      expect(rows()).toEqual([]);
    },
  );

  it('rolls back an actual write followed by a driver error and propagates preparation errors', () => {
    apply();
    offer = { ...offer!, receiptId: 'next', acknowledgedJournalCut: 6 };
    const before = rows();
    const prepare = db.prepare.bind(db);
    jest.spyOn(db, 'prepare').mockImplementation((sql: string) => {
      const statement = prepare(sql);
      if (sql.includes('INSERT INTO campaign_public_applied_view')) {
        const run = statement.run.bind(statement);
        statement.run = (...args: unknown[]) => {
          run(...args);
          throw new Error('after real write');
        };
      }
      return statement;
    });
    expect(() => apply()).toThrow('after real write');
    expect(rows()).toEqual(before);
    jest.restoreAllMocks();
    jest.spyOn(ports, 'readCurrentContext').mockImplementation(() => {
      throw new Error('authority unavailable');
    });
    expect(() => apply()).toThrow('authority unavailable');
    expect(rows()).toEqual(before);
  });

  it('survives a cold reopen without turning expired outstanding offers into credit', () => {
    apply();
    const before = rows();
    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
    db = getSQLiteService().getDatabase();
    offer = null;
    store = new CampaignPublicAppliedViewStore(db, ports);
    expect(rows()).toEqual(before);
    expect(apply('receipt-4')).toEqual({
      kind: 'refused',
      reason: 'unknown-receipt',
    });
    expect(store.read({ ...key, sessionId: 'another' })).toBeNull();
    expect(rows()).toEqual(before);
  });
});

describe('P2CB captured launch view', () => {
  const CAMPAIGN = 'campaign-launch';
  const SESSION = 'session-launch';
  const TS = '2026-10-16T00:00:00.000Z';
  const stream = { streamType: 'campaign', streamId: CAMPAIGN } as const;
  const launchKey = { campaignId: CAMPAIGN, sessionId: SESSION };
  const READY = { kind: 'ready' } as const;
  const FRESH = { kind: 'not-converged', reason: 'fresh-request' } as const;
  const behind = (...participantIds: string[]) => ({
    kind: 'not-converged',
    reason: 'participants-behind',
    participantIds,
  });
  let dir: string;
  let db: Database.Database;
  let journal: SQLiteEventJournal<ICampaignJournalEnvelope>;
  let view: CampaignLaunchView;
  let commands = 0;
  let receipts = 0;

  const base = (sequence: number, scope: CampaignEventScope) => ({
    sequence,
    campaignId: CAMPAIGN,
    ts: TS,
    authorPlayerId: 'gm',
    scope,
  });
  const fact = (
    sequence: number,
    scope: CampaignEventScope = 'campaign',
    balance = sequence * 100,
  ): ICampaignEvent => ({
    ...base(sequence, scope),
    type: 'FundsChanged',
    payload: { delta: 100, reason: `fact-${sequence}`, balance },
  });
  const launch = (sequence: number): ICampaignEvent => ({
    ...base(sequence, 'campaign'),
    type: 'CampaignMissionLaunched',
    payload: {
      missionId: `mission-${sequence}`,
      missionMatchId: `match-${sequence}`,
      acceptedHead: {
        branchId: 'root',
        revision: sequence,
        effectiveGeneration: 1,
      },
      deployingPlayerIds: ['p1'],
    },
  });
  const removal = (
    sequence: number,
    participantId: string,
  ): ICampaignEvent => ({
    ...base(sequence, 'campaign'),
    type: 'ParticipantRemoved',
    payload: { participantId },
  });
  const checkpoint = (sequence: number, balance: number): ICampaignEvent => ({
    ...base(sequence, 'campaign'),
    type: 'CampaignSnapshotPublished',
    payload: { state: { ...createEmptyCampaignState(CAMPAIGN), balance } },
  });

  function head() {
    const branches = new SQLiteEventHistoryBranchStore(db);
    return {
      ...readEffectiveStreamHead(db, branches, stream),
      generation: branches.readEffectiveHead(stream)?.effectiveGeneration ?? 1,
    };
  }

  async function commit(event: ICampaignEvent): Promise<void> {
    const at = head();
    const result = await appendCampaignCommandBatch(journal, {
      campaignId: CAMPAIGN,
      commandId: `command-${++commands}`,
      events: [event],
      expectedPostStateDigest: null,
      branchId: at.branchId,
      expectedRevision: at.revision,
    });
    expect(result.kind).toBe('committed');
  }

  /** A real candidate build, replay, sealed manifest and atomic activation. */
  async function activateChild(
    baseRevision: number,
    events: readonly ICampaignEvent[],
  ): Promise<string> {
    const branches = new SQLiteEventHistoryBranchStore(db);
    const leases = new SQLiteEventHistoryCorrectionLeaseStore(db, branches, {
      nowMs: () => Date.parse(TS),
    });
    const manifests = new SQLiteEventHistoryArtifactManifestStore(db);
    const at = head();
    const lease = leases.acquireCorrectionLease({
      ...stream,
      owner: 'host',
      actor: 'gm',
      reason: 'p2cb',
      ttlMs: 60_000,
      expectedBranchId: at.branchId,
      expectedRevision: at.revision,
      expectedDigest: at.digest,
      expectedGeneration: at.generation,
    });
    const held = {
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
    };
    const candidate = createCorrectionCandidateBranch(db, leases, {
      ...stream,
      ...held,
      createdAt: TS,
      baseRevision,
    });
    await replayCampaignReplacement(journal, db, {
      campaignId: CAMPAIGN,
      candidateBranchId: candidate.branchId,
      events: events.map((event) => ({
        commandId: `replay-${event.sequence}`,
        event,
      })),
    });
    manifests.sealArtifactManifest(
      stream,
      candidate.branchId,
      [{ artifactKind: 'projection', artifactId: CAMPAIGN, sourceRevision: 1 }],
      TS,
    );
    activateCandidateBranch(db, branches, leases, manifests, {
      stream,
      candidateBranchId: candidate.branchId,
      held,
      reason: 'p2cb',
      activatedAt: TS,
    });
    return candidate.branchId;
  }

  /** Genuine P2CA acceptance of a delivered offer at the current authority. */
  function ack(participantId: string, cut: number) {
    const key = { ...launchKey, participantId };
    const context = (
      handle: Database.Database,
    ): ICampaignApplicationContext => {
      const branches = new SQLiteEventHistoryBranchStore(handle);
      const effective = branches.requireEffectiveHead(stream);
      const membership = activeCampaignSessionMembership(
        CAMPAIGN,
        SESSION,
        participantId,
      );
      return {
        branchId: effective.branchId,
        effectiveGeneration: effective.effectiveGeneration,
        headRevision: readEffectiveStreamHead(handle, branches, stream)
          .revision,
        viewer: { participantId, isGm: membership?.seat === 'gm' },
        membership,
        participantRemoved: false,
      };
    };
    const current = context(db);
    const previous = readCampaignPublicAppliedView(db, key);
    const offer: ICampaignApplicationOffer = {
      ...key,
      receiptId: `receipt-${++receipts}`,
      branchId: current.branchId,
      effectiveGeneration: current.effectiveGeneration,
      acknowledgedJournalCut: cut,
      viewerAuthorityFingerprint: campaignViewerAuthorityFingerprint(
        current.membership!,
        current.viewer,
      ),
      kind:
        previous === null
          ? 'baseline'
          : previous.branchId === current.branchId &&
              previous.effectiveGeneration === current.effectiveGeneration
            ? 'delta'
            : 'replacement',
      predecessorReceiptId: previous?.receiptId ?? null,
    };
    return new CampaignPublicAppliedViewStore(db, {
      resolveDeliveredOffer: (_handle, request) =>
        request.receiptId === offer.receiptId ? offer : null,
      readCurrentContext: (handle) => context(handle),
    }).accept({ ...key, receiptId: offer.receiptId });
  }

  type Preparation = Parameters<CampaignLaunchView['revalidate']>[1];
  const appliedRows = () =>
    db.prepare('SELECT * FROM campaign_public_applied_view').all();
  const inTransaction = <T>(fn: () => T): T => db.transaction(fn)();
  const revalidate = (preparation: Preparation) =>
    inTransaction(() => view.revalidate(db, preparation));
  const revoke = (participantId: string) =>
    revokeCampaignSessionParticipant({
      ...launchKey,
      participantId,
      revokedAt: TS,
    });

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'p2cb-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'campaign.db') }).initialize();
    db = getSQLiteService().getDatabase();
    journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => TS);
    for (const [participantId, seat] of [
      ['gm', 'gm'],
      ['p1', 'player'],
      ['p2', 'player'],
    ] as const) {
      bindCampaignSessionParticipant({
        ...launchKey,
        participantId,
        seat,
        boundAt: TS,
      });
    }
    view = createDurableCampaignLaunchView()!;
  });
  afterEach(() => {
    resetSQLiteService();
    _resetDefaultMatchStore();
    rmSync(dir, { recursive: true, force: true });
  });

  it('materializes a verified parent prefix and child suffix and requires the GM and every durable retained player', async () => {
    await commit(fact(1));
    await commit(fact(2));
    await commit(launch(3));
    // The child drops root revision 3 and replays with sequences that are
    // not journal revisions (5 at revision 3, 6 at revision 4).
    const child = await activateChild(2, [fact(5), launch(6)]);

    const pending = await view.prepare(launchKey);
    expect(pending.verdict).toEqual(behind('gm', 'p1', 'p2'));

    // p2 has no socket in this test: durable membership alone retains it.
    for (const participantId of ['gm', 'p1', 'p2']) {
      expect(ack(participantId, 4)).toEqual({ kind: 'accepted' });
    }
    const prepared = await view.prepare(launchKey);
    expect(prepared.verdict).toEqual(READY);
    expect(revalidate(prepared)).toEqual(READY);
    expect(prepared.hydration.map((entry) => entry.participantId)).toEqual([
      'gm',
      'p1',
      'p2',
    ]);
    for (const entry of prepared.hydration) {
      expect(entry.state.balance).toBe(500);
      // Only the child's launch: the dropped root launch is not in this cut.
      expect(entry.missionLaunches).toEqual([launch(6)]);
    }
    expect(
      readCampaignPublicAppliedView(db, { ...launchKey, participantId: 'p1' }),
    ).toMatchObject({
      branchId: child,
      effectiveGeneration: 2,
      acknowledgedJournalCut: 4,
    });
  });

  it('treats a missing row as no credit even with nothing visible, but accepts a genuine zero-cut row', async () => {
    await commit(fact(1, 'gm'));
    expect(ack('gm', 1)).toEqual({ kind: 'accepted' });
    expect((await view.prepare(launchKey)).verdict).toEqual(behind('p1', 'p2'));

    expect(ack('p1', 0)).toEqual({ kind: 'accepted' });
    const prepared = await view.prepare(launchKey);
    expect(prepared.verdict).toEqual(behind('p2'));
    const p1 = prepared.hydration.find((entry) => entry.participantId === 'p1');
    expect(p1?.state).toEqual(createEmptyCampaignState(CAMPAIGN));
    expect(p1?.missionLaunches).toEqual([]);
  });

  it('keeps the withholding latch and the visible no-op obligation, and a hidden-only suffix adds no credit or disclosure', async () => {
    await commit(fact(1));
    await commit(fact(2, 'gm', 900));
    await commit(checkpoint(3, 5000));
    await commit(removal(4, 'p2'));
    expect(ack('gm', 4)).toEqual({ kind: 'accepted' });
    expect(ack('p1', 1)).toEqual({ kind: 'accepted' });

    // p1's state is unchanged by the removal, yet it still owes revision 4.
    // p2 is removed by committed history before its seat is healed.
    const owed = await view.prepare(launchKey);
    expect(owed.verdict).toEqual(behind('p1'));
    expect(
      listActiveCampaignSessionParticipants(CAMPAIGN, SESSION).map(
        (member) => member.participantId,
      ),
    ).toEqual(['gm', 'p1', 'p2']);
    expect(
      owed.hydration.find((entry) => entry.participantId === 'p1')?.state
        .balance,
    ).toBe(100);

    expect(ack('p1', 4)).toEqual({ kind: 'accepted' });
    await commit(fact(5, 'gm', 950));
    expect(ack('gm', 5)).toEqual({ kind: 'accepted' });
    const rowsBefore = appliedRows();
    const prepared = await view.prepare(launchKey);
    expect(prepared.verdict).toEqual(READY);
    expect(revalidate(prepared)).toEqual(READY);
    expect(appliedRows()).toEqual(rowsBefore);
    expect(
      readCampaignPublicAppliedView(db, { ...launchKey, participantId: 'p1' })
        ?.acknowledgedJournalCut,
    ).toBe(4);

    expect(Object.keys(prepared)).toEqual(['verdict', 'hydration']);
    expect(prepared.hydration.map((entry) => entry.participantId)).toEqual([
      'gm',
      'p1',
    ]);
    const [gm, p1] = prepared.hydration;
    expect(gm.state.balance).toBe(950);
    expect(Object.keys(p1)).toEqual([
      'participantId',
      'state',
      'missionLaunches',
    ]);
    const p1Bytes = JSON.stringify(p1);
    expect(p1.state.balance).toBe(100);
    for (const hidden of ['900', '5000', '950', 'sourcePrivate']) {
      expect(p1Bytes).not.toContain(hidden);
    }
    expect(JSON.stringify(prepared)).not.toContain(head().digest);
  });

  it.each([
    ['an ordinary hidden append', (): Promise<void> => commit(fact(3, 'gm'))],
    [
      'a retained seat revocation',
      async (): Promise<void> => void revoke('p2'),
    ],
    [
      'a branch and generation change',
      (): Promise<void> => activateChild(2, []).then(() => undefined),
    ],
  ] as const)(
    'returns a fresh request when %s changes a captured input',
    async (_label, mutate) => {
      await commit(fact(1));
      await commit(fact(2));
      for (const participantId of ['gm', 'p1', 'p2']) ack(participantId, 2);
      const prepared = await view.prepare(launchKey);
      expect(prepared.verdict).toEqual(READY);
      expect(view.revalidate(db, prepared)).toEqual({
        kind: 'refused',
        reason: 'context-mismatch',
      });
      await mutate();
      const rowsBefore = appliedRows();
      expect(revalidate(prepared)).toEqual(FRESH);
      expect(appliedRows()).toEqual(rowsBefore);
    },
  );

  it('keeps an older receipt prefix valid while the strict launch snapshot goes stale', async () => {
    await commit(fact(1));
    await commit(fact(2));
    ack('gm', 2);
    ack('p1', 2);
    ack('p2', 1);
    const prepared = await view.prepare(launchKey);
    expect(prepared.verdict).toEqual(behind('p2'));

    await commit(fact(3));
    expect(ack('gm', 3)).toEqual({ kind: 'accepted' });
    expect(ack('p2', 2)).toEqual({ kind: 'accepted' });
    expect(revalidate(prepared)).toEqual(FRESH);
    expect(ack('p2', 1)).toEqual({ kind: 'stale' });
    expect((await view.prepare(launchKey)).verdict).toEqual(behind('p1', 'p2'));
  });

  it('sees its own uncommitted seat and row changes inside the launch transaction and keeps nothing after rollback', async () => {
    await commit(fact(1));
    ack('gm', 1);
    ack('p1', 0);
    ack('p2', 1);
    const prepared = await view.prepare(launchKey);
    expect(prepared.verdict).toEqual(behind('p1'));
    const rowsBefore = appliedRows();

    expect(() =>
      inTransaction(() => {
        expect(revoke('p2')).toBe(true);
        expect(view.revalidate(db, prepared)).toEqual(FRESH);
        throw new Error('rollback seat');
      }),
    ).toThrow('rollback seat');
    expect(() =>
      inTransaction(() => {
        expect(ack('p1', 1)).toEqual({ kind: 'accepted' });
        expect(view.revalidate(db, prepared)).toEqual(FRESH);
        throw new Error('rollback row');
      }),
    ).toThrow('rollback row');
    expect(revalidate(prepared)).toEqual(behind('p1'));
    expect(appliedRows()).toEqual(rowsBefore);
    expect(
      activeCampaignSessionMembership(CAMPAIGN, SESSION, 'p2'),
    ).not.toBeNull();

    inTransaction(() => ack('p1', 1));
    expect(revalidate(prepared)).toEqual(FRESH);
    expect((await view.prepare(launchKey)).verdict).toEqual(READY);
  });

  it('gives no credit to a row from an older membership incarnation', async () => {
    await commit(fact(1));
    for (const participantId of ['gm', 'p1', 'p2']) ack(participantId, 1);
    expect((await view.prepare(launchKey)).verdict).toEqual(READY);
    db.prepare(
      'UPDATE campaign_session_participant SET bound_at = ? WHERE participant_id = ?',
    ).run('new-incarnation', 'p1');
    expect((await view.prepare(launchKey)).verdict).toEqual(behind('p1'));
  });

  it('refuses a handle the graph replaced after preparation', async () => {
    await commit(fact(1));
    for (const participantId of ['gm', 'p1', 'p2']) ack(participantId, 1);
    const prepared = await view.prepare(launchKey);
    expect(prepared.verdict).toEqual(READY);
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'campaign.db') }).initialize();
    db = getSQLiteService().getDatabase();
    expect(revalidate(prepared)).toEqual({
      kind: 'refused',
      reason: 'context-mismatch',
    });
    expect((await view.prepare(launchKey)).verdict).toEqual({
      kind: 'refused',
      reason: 'context-mismatch',
    });
  });

  it('refuses without an active session GM and on a head its verified history does not reach', async () => {
    await commit(fact(1));
    revoke('gm');
    expect((await view.prepare(launchKey)).verdict).toEqual({
      kind: 'refused',
      reason: 'gm-required',
    });

    db.prepare(
      `UPDATE event_journal_stream_heads SET event_digest = ? WHERE stream_id = ?`,
    ).run('f'.repeat(64), CAMPAIGN);
    expect((await view.prepare(launchKey)).verdict).toEqual({
      kind: 'refused',
      reason: 'history-integrity',
    });
  });
});
