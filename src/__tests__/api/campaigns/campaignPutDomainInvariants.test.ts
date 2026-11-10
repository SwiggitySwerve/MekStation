/** @spec openspec/changes/campaign-refit-domain-invariants/specs/campaign-persistence/spec.md */
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { getOrCreateHostInstanceId } from '@/lib/campaign/authority/campaignHostInstance';
import { saveCampaignRecordThroughJournal } from '@/lib/campaign/authority/campaignRecordJournalSave';
import { rewriteCampaignRecordAfterCommand } from '@/lib/campaign/authority/campaignRecordJournalState';
import { authoritativeStateFromSerializedCampaign } from '@/lib/campaign/authority/campaignSourceGenesis';
import { refitOrders } from '@/lib/campaign/persistence/__tests__/refitInvariantTestHelpers';
import * as invariants from '@/lib/campaign/persistence/campaignDomainInvariants';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';
import {
  campaignRecordRow,
  readCampaign,
} from '@/services/campaignPersistence/CampaignPersistenceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { logger } from '@/utils/logger';

import {
  bearerOf,
  callId,
  createJournalNative,
  disjointCampaign,
  envelopeOf,
  journal,
  mintIdentity,
  NOW,
  useTempCampaignDatabase,
} from './campaignJournalEffectsFixture';

jest.mock('@/lib/campaign/persistence/campaignDomainInvariants', () => {
  const actual = jest.requireActual<
    typeof import('@/lib/campaign/persistence/campaignDomainInvariants')
  >('@/lib/campaign/persistence/campaignDomainInvariants');
  return {
    ...actual,
    checkCampaignDomainInvariants: jest.fn(
      actual.checkCampaignDomainInvariants,
    ),
  };
});

function withOrders(
  record: SerializedCampaign,
  count: number,
): SerializedCampaign {
  return {
    ...record,
    body: { ...record.body, refitOrders: refitOrders(count) },
  };
}
function observe(id: string) {
  const db = getSQLiteService().getDatabase();
  return {
    row: db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id),
    events: db
      .prepare(
        'SELECT * FROM event_journal_events WHERE stream_id = ? ORDER BY stream_revision',
      )
      .all(id),
    heads: db
      .prepare('SELECT * FROM event_journal_stream_heads WHERE stream_id = ?')
      .all(id),
    receipts: db.prepare('SELECT * FROM event_journal_batches').all(),
    highWater: db.prepare('SELECT * FROM event_journal_store_state').all(),
  };
}

describe('campaign PUT domain invariant boundary', () => {
  useTempCampaignDatabase('campaign-invariants-');
  afterEach(() => {
    _resetCampaignHostRegistry();
  });

  it('returns the exact typed 422 and changes no row or journal on a checkpoint', async () => {
    const { record } = await createJournalNative('duplicate-put');
    const before = observe(record.campaignId);
    const answer = await callId('PUT', record.campaignId, {
      envelope: withOrders(record, 2),
      baseVersion: record.version,
    });
    expect(answer).toEqual({
      status: 422,
      json: {
        kind: 'refused',
        code: 'CAMPAIGN_INVARIANT_VIOLATION',
        reason: 'refit-one-open-per-unit',
        error:
          'A unit can have only one open refit order. Unit unit-0 would have 2 (unit-0-refit-0, unit-0-refit-1). Cancel the extra order and save again.',
        currentVersion: record.version,
        violations: [
          {
            invariant: 'refit-one-open-per-unit',
            unitId: 'unit-0',
            openCount: 2,
            allowedMax: 1,
            orderIds: ['unit-0-refit-0', 'unit-0-refit-1'],
          },
        ],
      },
    });
    expect(observe(record.campaignId)).toEqual(before);
  });
  it('allows unrelated legacy edits on PUT while refusing two to three', async () => {
    const { record } = await createJournalNative('legacy-put');
    campaignRecordRow.write(
      getSQLiteService().getDatabase(),
      withOrders(record, 2),
    );
    const legacy = withOrders(record, 2);
    const edited = {
      ...legacy,
      body: { ...legacy.body, name: 'Legacy unrelated edit' },
    };
    const saved = await callId('PUT', record.campaignId, {
      envelope: edited,
      baseVersion: record.version,
    });
    expect(saved.status).toBe(200);
    const current = readCampaign(record.campaignId);
    if (current.kind !== 'ok') throw new Error('Expected saved campaign');
    expect(current.record.body.name).toBe('Legacy unrelated edit');
    expect(current.record.body.refitOrders).toEqual(refitOrders(2));
    const before = observe(record.campaignId);
    const refused = await callId('PUT', record.campaignId, {
      envelope: withOrders(current.record, 3),
      baseVersion: current.record.version,
    });
    expect(refused.status).toBe(422);
    expect(refused.json).toMatchObject({
      violations: [expect.objectContaining({ openCount: 3, allowedMax: 2 })],
    });
    expect(observe(record.campaignId)).toEqual(before);
  });

  it('stale version returns 409 before inspecting the invalid refits', async () => {
    const { record } = await createJournalNative('stale-duplicate');
    const check = jest.mocked(invariants.checkCampaignDomainInvariants);
    check.mockClear();
    const before = observe(record.campaignId);
    expect(
      (
        await callId('PUT', record.campaignId, {
          envelope: withOrders(record, 2),
          baseVersion: 0,
        })
      ).status,
    ).toBe(409);
    expect(check).not.toHaveBeenCalled();
    expect(observe(record.campaignId)).toEqual(before);
  });
  it.each(['missing', 'session-changed', 'authorized'] as const)(
    'live host %s: auth wins and a refused host save appends nothing',
    async (mode) => {
      const { record } = await createJournalNative(`auth-${mode}`);
      const bearer = await bearerOf(await mintIdentity(`host-${mode}`));
      const registry = getCampaignHostRegistry();
      const entry = await registry.register(`match-${mode}`, {
        campaignId: record.campaignId,
        hostPlayerId: bearer.playerId,
        roomCode: 'ABC234',
        state: authoritativeStateFromSerializedCampaign(record),
      });
      const frames: unknown[] = [];
      entry.syncSession.attachLiveParticipant(
        (event) => frames.push(event),
        'guest-invariants',
      );
      if (mode === 'session-changed') {
        jest
          .spyOn(registry, 'liveEntryFor')
          .mockReturnValueOnce(entry)
          .mockReturnValue(null);
      }
      const before = observe(record.campaignId);
      const hostBefore = entry.host.getState();
      const check = jest.mocked(invariants.checkCampaignDomainInvariants);
      check.mockClear();
      const answer = await callId(
        'PUT',
        record.campaignId,
        { envelope: withOrders(record, 2), baseVersion: record.version },
        mode === 'missing' ? undefined : bearer.wire,
      );
      expect(answer.status).toBe(
        mode === 'missing' ? 401 : mode === 'session-changed' ? 403 : 422,
      );
      if (mode !== 'authorized') expect(check).not.toHaveBeenCalled();
      expect(observe(record.campaignId)).toEqual(before);
      expect(entry.host.getState()).toEqual(hostBefore);
      expect(frames).toEqual([]);
    },
  );
  it('refuses invalid genesis before any append, receipt, row or marker', async () => {
    const envelope = withOrders(
      envelopeOf(disjointCampaign('invalid-genesis'), 0),
      2,
    );
    const before = observe(envelope.campaignId);
    const result = await saveCampaignRecordThroughJournal(journal(), {
      purpose: 'genesis',
      envelope,
      baseVersion: 0,
      hostInstanceId: getOrCreateHostInstanceId(),
      occurredAt: NOW,
    });
    expect(result.kind).toBe('invariant-violation');
    expect(observe(envelope.campaignId)).toEqual(before);
    expect(
      getSQLiteService()
        .getDatabase()
        .prepare(
          'SELECT * FROM campaign_authority_migration WHERE campaign_id = ?',
        )
        .get(envelope.campaignId),
    ).toBeUndefined();
  });
  it('journal row materialization logs legacy duplicates but still writes the next version', async () => {
    const { record } = await createJournalNative('monitor-journal');
    const db = getSQLiteService().getDatabase();
    campaignRecordRow.write(db, withOrders(record, 2));
    const warning = jest.spyOn(logger, 'warn');
    db.transaction(() =>
      rewriteCampaignRecordAfterCommand(db, record.campaignId),
    )();
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining('monitor only'),
      expect.objectContaining({
        campaignId: record.campaignId,
        violations: [expect.objectContaining({ openCount: 2 })],
      }),
    );
    const saved = readCampaign(record.campaignId);
    expect(saved).toMatchObject({
      kind: 'ok',
      record: {
        version: record.version + 1,
        body: { refitOrders: refitOrders(2) },
      },
    });
  });
});
