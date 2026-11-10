/**
 * S1b reader gate on GET and PUT /api/campaigns/[id] (matrix rows A, B, C).
 *
 * A reader that cannot process a contract rules level newer than its own must
 * be refused 426 - and must never be handed that contract through the 409
 * conflict path. Auth comes first: an unauthenticated caller learns only that
 * it must authenticate.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { authoritativeStateFromSerializedCampaign } from '@/lib/campaign/authority/campaignSourceGenesis';
import { _resetActiveCoopHosts } from '@/lib/campaign/coop/coopHostRegistry';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';
import idHandler from '@/pages/api/campaigns/[id]';

import {
  bearerOf,
  createJournalNative,
  mintIdentity,
  useTempCampaignDatabase,
} from './campaignJournalEffectsFixture';
import {
  callGated,
  envelopeHolding,
  injectContractsIntoStoredRow,
  rowBytes,
  seedRow,
  storedContract,
} from './campaignLifecycleGateFixture';

const UNSUPPORTED = 'CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED';
const UNREADABLE = 'CAMPAIGN_LIFECYCLE_RULES_UNREADABLE';
const NEWER_SENTENCE =
  'This campaign uses contract rules newer than this copy of MekStation reads (it needs rules 2; this copy reads rules 1). Reload this page to update, then try again. Nothing was changed.';

function putEnvelope(
  record: SerializedCampaign,
  baseVersion = record.version,
  contracts: readonly Record<string, unknown>[] = [],
) {
  const next = envelopeHolding(record.campaignId, contracts, baseVersion + 1);
  return { envelope: next, baseVersion };
}

describe('S1b reader gate: GET /api/campaigns/[id] (row A)', () => {
  useTempCampaignDatabase('s1b-gate-get-');

  const ID = 's1b-get';
  beforeEach(() => {
    seedRow(envelopeHolding(ID, [storedContract('v2', 2)]));
  });

  it('refuses a header-less reader with 426 and exactly the approved body', async () => {
    const answer = await callGated(idHandler, 'GET', ID);
    expect(answer.status).toBe(426);
    expect(answer.json).toEqual({
      kind: 'refused',
      code: UNSUPPORTED,
      reason: 'lifecycle-rules-unsupported',
      error: NEWER_SENTENCE,
      requiredLifecycleRules: 2,
      readerLifecycleRules: 1,
      source: 'stored',
    });
    expect(answer.headers['upgrade']).toBe('MekStation-Lifecycle-Rules/2');
    expect(answer.headers['cache-control']).toBe('no-store');
    expect(String(answer.headers['vary'])).toContain(
      'X-MekStation-Lifecycle-Rules',
    );
  });

  it('never puts the stored body in a refusal', async () => {
    const answer = await callGated(idHandler, 'GET', ID);
    expect(JSON.stringify(answer.json)).not.toContain('lifecycleRulesVersion');
    expect(JSON.stringify(answer.json)).not.toContain('"missions"');
  });

  it('reads absent as level 1: identical to an explicit 1', async () => {
    const absent = await callGated(idHandler, 'GET', ID);
    const one = await callGated(idHandler, 'GET', ID, { reader: '1' });
    expect(one.status).toBe(426);
    expect(one.json).toEqual(absent.json);
  });

  it.each([
    ['empty', ''],
    ['zero', '0'],
    ['leading zero', '02'],
    ['not a number', 'two'],
    ['repeated (joined)', '2, 2'],
    ['repeated (array)', ['2', '2']],
    ['padded', ' 2'],
    ['negative', '-2'],
  ])('reads a %s header as level 1, never as the maximum', async (_n, raw) => {
    const answer = await callGated(idHandler, 'GET', ID, { reader: raw });
    expect(answer.status).toBe(426);
    expect(answer.json).toMatchObject({
      readerLifecycleRules: 1,
      requiredLifecycleRules: 2,
    });
  });

  it('serves a reader that declares it reads the stored rules, byte for byte', async () => {
    const answer = await callGated(idHandler, 'GET', ID, { reader: '2' });
    expect(answer.status).toBe(200);
    const stored = JSON.parse(
      rowBytes(ID)?.payload ?? '{}',
    ) as SerializedCampaign;
    expect(answer.json.body).toEqual(stored.body);
    expect(String(answer.headers['vary'])).toContain(
      'X-MekStation-Lifecycle-Rules',
    );
  });

  it('serves a legacy campaign to a header-less reader, still varying by the header', async () => {
    seedRow(envelopeHolding('s1b-legacy', [storedContract('old')]));
    const answer = await callGated(idHandler, 'GET', 's1b-legacy');
    expect(answer.status).toBe(200);
    expect(String(answer.headers['vary'])).toContain(
      'X-MekStation-Lifecycle-Rules',
    );
  });

  it('keeps 404 ahead of the gate', async () => {
    expect((await callGated(idHandler, 'GET', 'missing')).status).toBe(404);
  });

  describe('an unreadable version value (answer 7)', () => {
    const UID = 's1b-unreadable';
    beforeEach(() => {
      seedRow(envelopeHolding(UID, [storedContract('odd', 'two')]));
    });

    it('is read-only for a reader that declares itself, with a named diagnostic', async () => {
      const answer = await callGated(idHandler, 'GET', UID, { reader: '1' });
      expect(answer.status).toBe(200);
      expect(answer.headers['x-mekstation-lifecycle-diagnostic']).toBe(
        'unreadable-contract-version',
      );
    });

    it('is a 426 only for a reader that cannot display it', async () => {
      const answer = await callGated(idHandler, 'GET', UID);
      expect(answer.status).toBe(426);
      expect(answer.json).toMatchObject({
        code: UNSUPPORTED,
        requiredLifecycleRules: null,
      });
      expect(answer.headers['upgrade']).toBeUndefined();
    });

    it('refuses a write from every reader and leaves the row untouched', async () => {
      const before = rowBytes(UID);
      const record = JSON.parse(before?.payload ?? '{}') as SerializedCampaign;
      const declared = await callGated(idHandler, 'PUT', UID, {
        reader: '1',
        body: putEnvelope(record),
      });
      expect(declared.status).toBe(422);
      expect(declared.json).toMatchObject({
        kind: 'refused',
        code: UNREADABLE,
        requiredLifecycleRules: null,
      });
      const old = await callGated(idHandler, 'PUT', UID, {
        body: putEnvelope(record),
      });
      expect(old.status).toBe(426);
      expect(rowBytes(UID)).toEqual(before);
    });
  });
});

describe('S1b reader gate: PUT /api/campaigns/[id] (row B)', () => {
  useTempCampaignDatabase('s1b-gate-put-');

  const ID = 's1b-put';

  it('refuses an incoming v2 body and leaves the row byte-identical', async () => {
    seedRow(envelopeHolding(ID, []));
    const before = rowBytes(ID);
    const record = JSON.parse(before?.payload ?? '{}') as SerializedCampaign;
    const answer = await callGated(idHandler, 'PUT', ID, {
      reader: '1',
      body: putEnvelope(record, record.version, [storedContract('v2', 2)]),
    });
    expect(answer.status).toBe(426);
    expect(answer.json).toMatchObject({
      code: UNSUPPORTED,
      source: 'incoming',
    });
    expect(rowBytes(ID)).toEqual(before);
  });

  it('refuses a legacy write over a stored v2 row', async () => {
    seedRow(envelopeHolding(ID, [storedContract('v2', 2)]));
    const before = rowBytes(ID);
    const record = JSON.parse(before?.payload ?? '{}') as SerializedCampaign;
    const answer = await callGated(idHandler, 'PUT', ID, {
      body: putEnvelope(record),
    });
    expect(answer.status).toBe(426);
    expect(answer.json).toMatchObject({ code: UNSUPPORTED, source: 'stored' });
    expect(rowBytes(ID)).toEqual(before);
  });

  it('answers 426, not 409, to a stale baseVersion against a v2 row, and carries no current record', async () => {
    seedRow(envelopeHolding(ID, [storedContract('v2', 2)], 3));
    const before = rowBytes(ID);
    const record = JSON.parse(before?.payload ?? '{}') as SerializedCampaign;
    const stale = await callGated(idHandler, 'PUT', ID, {
      body: putEnvelope(record, 1),
    });
    expect(stale.status).toBe(426);
    expect(stale.json).not.toHaveProperty('current');
    expect(JSON.stringify(stale.json)).not.toContain('lifecycleRulesVersion');
    expect(rowBytes(ID)).toEqual(before);
  });

  it('control: a reader that covers the rules still gets the ordinary 409 with the record', async () => {
    seedRow(envelopeHolding(ID, [storedContract('v2', 2)], 3));
    const record = JSON.parse(
      rowBytes(ID)?.payload ?? '{}',
    ) as SerializedCampaign;
    const stale = await callGated(idHandler, 'PUT', ID, {
      reader: '2',
      body: putEnvelope(record, 1, [storedContract('v2', 2)]),
    });
    expect(stale.status).toBe(409);
    expect(stale.json).toMatchObject({ kind: 'conflict' });
    expect(JSON.stringify(stale.json.current)).toContain(
      'lifecycleRulesVersion',
    );
  });

  it('control: a legacy campaign saves exactly as before', async () => {
    seedRow(envelopeHolding(ID, [storedContract('old')], 1));
    const record = JSON.parse(
      rowBytes(ID)?.payload ?? '{}',
    ) as SerializedCampaign;
    const saved = await callGated(idHandler, 'PUT', ID, {
      body: putEnvelope(record, 1, [storedContract('old')]),
    });
    expect(saved.status).toBe(200);
  });

  it('keeps the 400 for a malformed body ahead of the gate', async () => {
    seedRow(envelopeHolding(ID, [storedContract('v2', 2)]));
    const answer = await callGated(idHandler, 'PUT', ID, { body: { nope: 1 } });
    expect(answer.status).toBe(400);
  });
});

describe('S1b reader gate: auth before the gate (row C)', () => {
  useTempCampaignDatabase('s1b-gate-auth-');

  let host: Awaited<ReturnType<typeof bearerOf>>;
  let member: Awaited<ReturnType<typeof bearerOf>>;

  beforeAll(async () => {
    host = await bearerOf(await mintIdentity('s1b-host'));
    member = await bearerOf(await mintIdentity('s1b-member'));
  });
  afterEach(() => {
    _resetCampaignHostRegistry();
    _resetActiveCoopHosts();
  });

  async function liveV2Campaign(id: string) {
    const { record } = await createJournalNative(id);
    injectContractsIntoStoredRow(id, [storedContract('v2', 2)]);
    await getCampaignHostRegistry().register(`match-${id}`, {
      campaignId: id,
      hostPlayerId: host.playerId,
      roomCode: 'ABC234',
      state: authoritativeStateFromSerializedCampaign(record),
    });
    return record;
  }

  it('answers an unauthenticated caller 401, never 426', async () => {
    const record = await liveV2Campaign('s1b-live-anon');
    const answer = await callGated(idHandler, 'PUT', record.campaignId, {
      body: putEnvelope(record),
    });
    expect(answer.status).toBe(401);
    expect(answer.json).toMatchObject({ code: 'HOST_SESSION_REQUIRED' });
  });

  it('withholds the member 409 (and its stored record) from a reader that cannot take it', async () => {
    const record = await liveV2Campaign('s1b-live-member');
    const before = rowBytes(record.campaignId);
    const answer = await callGated(idHandler, 'PUT', record.campaignId, {
      wire: member.wire,
      body: putEnvelope(record),
    });
    expect(answer.status).toBe(426);
    expect(answer.json).not.toHaveProperty('current');
    expect(rowBytes(record.campaignId)).toEqual(before);
  });

  it('control: a member whose reader covers the rules still gets the live-session 409', async () => {
    const record = await liveV2Campaign('s1b-live-member2');
    const answer = await callGated(idHandler, 'PUT', record.campaignId, {
      wire: member.wire,
      reader: '2',
      body: putEnvelope(record),
    });
    expect(answer.status).toBe(409);
    expect(answer.json).toMatchObject({ reason: 'live-coop-session' });
  });

  it('refuses the host with 426 when its reader is too old', async () => {
    const record = await liveV2Campaign('s1b-live-host');
    const before = rowBytes(record.campaignId);
    const answer = await callGated(idHandler, 'PUT', record.campaignId, {
      wire: host.wire,
      body: putEnvelope(record),
    });
    expect(answer.status).toBe(426);
    expect(rowBytes(record.campaignId)).toEqual(before);
  });
});
