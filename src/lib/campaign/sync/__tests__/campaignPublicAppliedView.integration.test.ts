import type Database from 'better-sqlite3';

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  activeCampaignSessionMembership,
  bindCampaignSessionParticipant,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  CampaignPublicAppliedViewStore,
  campaignViewerAuthorityFingerprint,
  type ICampaignApplicationOffer,
  type ICampaignApplicationContext,
  type ICampaignApplicationPorts,
} from '../campaignPublicAppliedView';

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
