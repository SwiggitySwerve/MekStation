/** @spec openspec/changes/campaign-refit-domain-invariants/specs/campaign-persistence/spec.md */
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { refitOrders } from '@/lib/campaign/persistence/__tests__/refitInvariantTestHelpers';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { logger } from '@/utils/logger';

import {
  campaignRecordRow,
  readCampaign,
  saveCampaign,
} from '../CampaignPersistenceService';

function envelope(count = 1) {
  return buildSerializedCampaign(
    {
      ...buildPopulatedCampaign(),
      id: 'ratchet',
      refitOrders: refitOrders(count),
    },
    'test',
    1,
  );
}
function row() {
  return getSQLiteService()
    .getDatabase()
    .prepare('SELECT * FROM campaigns WHERE id = ?')
    .get('ratchet');
}

describe('campaign invariant save transaction', () => {
  beforeEach(() => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    resetSQLiteService();
  });

  it('refuses create duplicates before any row and reports version zero', () => {
    expect(saveCampaign(envelope(2), 0)).toMatchObject({
      kind: 'invariant-violation',
      refusal: { currentVersion: 0 },
    });
    expect(readCampaign('ratchet').kind).toBe('not_found');
  });
  it('keeps row bytes, version and all indexed columns unchanged on refusal inside the transaction', () => {
    expect(saveCampaign(envelope(), 0).kind).toBe('ok');
    const before = row();
    const logging = jest.spyOn(logger, 'info').mockImplementation(() => {
      expect(getSQLiteService().getDatabase().inTransaction).toBe(true);
    });
    expect(saveCampaign(envelope(2), 1).kind).toBe('invariant-violation');
    expect(logging).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        campaignId: 'ratchet',
        violations: expect.any(Array),
      }),
    );
    expect(row()).toEqual(before);
  });
  it('version and replay fence conflicts win before invariants', () => {
    const saved = {
      ...envelope(),
      version: 4,
      sourceReplayFence: { rootPublicRevision: 7 },
    };
    campaignRecordRow.write(getSQLiteService().getDatabase(), saved);
    const before = row();
    expect(
      saveCampaign(
        { ...envelope(2), sourceReplayFence: saved.sourceReplayFence },
        3,
      ).kind,
    ).toBe('conflict');
    expect(saveCampaign(envelope(2), 4).kind).toBe('conflict');
    expect(row()).toEqual(before);
  });
  it('legacy duplicates allow unrelated edits and repair but cannot grow from two to three', () => {
    campaignRecordRow.write(getSQLiteService().getDatabase(), envelope(2));
    const legacy = envelope(2);
    const edit = {
      ...legacy,
      body: { ...legacy.body, name: 'Unrelated edit' },
    };
    const accepted = saveCampaign(edit, 1);
    expect(accepted).toMatchObject({
      kind: 'ok',
      record: {
        version: 2,
        body: { name: 'Unrelated edit', refitOrders: refitOrders(2) },
      },
    });
    const before = row();
    expect(saveCampaign(envelope(3), 2)).toMatchObject({
      kind: 'invariant-violation',
      refusal: {
        violations: [expect.objectContaining({ allowedMax: 2, openCount: 3 })],
      },
    });
    expect(row()).toEqual(before);
    expect(saveCampaign(envelope(1), 2).kind).toBe('ok');
  });
  it('adoption tolerance cannot bypass the ratchet on an existing row', () => {
    expect(saveCampaign(envelope(), 0).kind).toBe('ok');
    expect(
      saveCampaign(envelope(2), 1, { purpose: 'legacy-adoption' }).kind,
    ).toBe('invariant-violation');
  });
});
