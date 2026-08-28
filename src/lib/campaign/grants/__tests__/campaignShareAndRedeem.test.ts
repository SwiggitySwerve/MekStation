/**
 * Share and redeem (task 2.2).
 *
 * Two halves of one flow, each with a property that matters more than
 * its happy path:
 *
 * - SHARE: only a source may hand out access. A replica minting grants
 *   would create a second authority for a campaign it does not own and
 *   could hand out access wider than its own grant.
 * - REDEEM: this is the only flow that produces a `role: 'replica'`
 *   record, so it is the only place a device can be told what it is a
 *   copy of. A token whose scopes were widened in transit, or that names
 *   this very host as its source, must not produce one.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D2)
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair, signData } from '@/services/vault/IdentityService';

import type { ICampaignGrant } from '../ICampaignGrantStore';

import { canonicalGrantTokenPayload } from '../campaignGrantToken';
import {
  issueShareGrant,
  listShareGrants,
  revokeShareGrant,
} from '../campaignShareService';
import { redeemCampaignGrant } from '../redeemCampaignGrant';

const CAMPAIGN_ID = 'campaign-share-subject';
const ISSUED_AT = '2026-08-23T00:00:00.000Z';
const EXPIRES_AT = '2026-09-23T00:00:00.000Z';
const NOW_MS = Date.parse('2026-08-24T00:00:00.000Z');

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

/** Writes a campaign row with the given authority straight to storage. */
function storeCampaign(
  campaignId: string,
  authority: SerializedCampaign['authority'],
): void {
  const db = getSQLiteService().getDatabase();
  const base = buildSerializedCampaign(
    { ...buildPopulatedCampaign(), id: campaignId },
    'device-test',
    1,
  );
  const record: SerializedCampaign = {
    ...base,
    instanceId: 'local-host-instance',
    authority,
  };
  db.prepare(
    `INSERT OR REPLACE INTO campaigns
       (id, version, schema_version, name, faction_id, campaign_date,
        balance, origin_device_id, saved_at, payload)
     VALUES (?, 1, 2, ?, 'mercenary', '3025-01-01T00:00:00.000Z',
             0, 'device-test', ?, ?)`,
  ).run(campaignId, campaignId, ISSUED_AT, JSON.stringify(record));
}

/** Signs a token for `grant` with `keys`, optionally widening scopes. */
async function signTokenFor(
  grant: ICampaignGrant,
  keys: { publicKey: Uint8Array; privateKey: Uint8Array },
  overrides: { scopes?: readonly string[] } = {},
): Promise<Record<string, unknown>> {
  const signedScopes = grant.scopes;
  const payload = canonicalGrantTokenPayload({
    grantId: grant.grantId,
    campaignId: grant.campaignId,
    participantId: grant.participantId,
    scopes: signedScopes,
    issuedAt: grant.issuedAt,
    expiresAt: grant.expiresAt,
  });
  const signature = await signData(
    new TextEncoder().encode(payload),
    keys.privateKey,
  );
  return {
    grantId: grant.grantId,
    campaignId: grant.campaignId,
    participantId: grant.participantId,
    // The WIRE scopes may differ from what was signed - that is the
    // tamper case the signature has to catch.
    scopes: overrides.scopes ?? signedScopes,
    issuedAt: grant.issuedAt,
    expiresAt: grant.expiresAt,
    publicKey: toBase64(keys.publicKey),
    signature: toBase64(signature),
  };
}

describe('campaign share and redeem', () => {
  let dir: string;
  let keys: { publicKey: Uint8Array; privateKey: Uint8Array };

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-share-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'share.db') }).initialize();
    keys = await generateKeyPair();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function db(): Database.Database {
    return getSQLiteService().getDatabase();
  }

  function issue(): ICampaignGrant {
    const result = issueShareGrant(db(), {
      campaignId: CAMPAIGN_ID,
      participantId: 'participant-guest',
      issuerPublicKey: toBase64(keys.publicKey),
      scopes: ['campaign'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    if (result.kind !== 'ok') {
      throw new Error(`expected issue to succeed, got ${result.reason}`);
    }
    return result.value;
  }

  describe('share: only a source hands out access', () => {
    it('issues, lists with scopes, and revokes on an owned campaign', () => {
      storeCampaign(CAMPAIGN_ID, { role: 'source' });
      const grant = issue();
      expect(grant.scopes).toEqual(['campaign']);

      const listed = listShareGrants(db(), CAMPAIGN_ID);
      expect(listed.kind).toBe('ok');
      if (listed.kind !== 'ok') return;
      expect(listed.value.map((g) => g.grantId)).toEqual([grant.grantId]);
      expect(listed.value[0]?.scopes).toEqual(['campaign']);

      const revoked = revokeShareGrant(
        db(),
        CAMPAIGN_ID,
        grant.grantId,
        '2026-08-25T00:00:00.000Z',
      );
      expect(revoked.kind).toBe('ok');

      // A revoked grant stays listed and carries revokedAt: the owner
      // must be able to tell "never shared" from "shared and withdrawn".
      const after = listShareGrants(db(), CAMPAIGN_ID);
      expect(after.kind).toBe('ok');
      if (after.kind !== 'ok') return;
      expect(after.value[0]?.revokedAt).toBe('2026-08-25T00:00:00.000Z');
    });

    it('refuses to share a campaign this host only replicates', () => {
      storeCampaign(CAMPAIGN_ID, {
        role: 'replica',
        sourceInstanceId: 'other-host',
        grantId: 'grant-upstream',
        scopes: ['campaign'],
      });

      const issued = issueShareGrant(db(), {
        campaignId: CAMPAIGN_ID,
        participantId: 'participant-guest',
        issuerPublicKey: toBase64(keys.publicKey),
        scopes: ['campaign'],
        issuedAt: ISSUED_AT,
        expiresAt: EXPIRES_AT,
      });

      expect(issued).toEqual({ kind: 'refused', reason: 'not-source' });
      // Nothing was written: a refusal that still minted a row would be
      // worse than no gate at all.
      const listed = listShareGrants(db(), CAMPAIGN_ID);
      expect(listed).toEqual({ kind: 'refused', reason: 'not-source' });
    });

    it('refuses a campaign this host does not have', () => {
      expect(
        issueShareGrant(db(), {
          campaignId: 'campaign-absent',
          participantId: 'p',
          issuerPublicKey: toBase64(keys.publicKey),
          scopes: ['campaign'],
          issuedAt: ISSUED_AT,
          expiresAt: EXPIRES_AT,
        }),
      ).toEqual({ kind: 'refused', reason: 'campaign-not-found' });
    });

    it('does not revoke a grant belonging to another campaign', () => {
      storeCampaign(CAMPAIGN_ID, { role: 'source' });
      storeCampaign('campaign-other', { role: 'source' });
      const grant = issue();

      const refused = revokeShareGrant(
        db(),
        'campaign-other',
        grant.grantId,
        '2026-08-25T00:00:00.000Z',
      );
      expect(refused).toEqual({ kind: 'refused', reason: 'invalid-request' });

      // The check runs BEFORE the write, so the grant is still active.
      const listed = listShareGrants(db(), CAMPAIGN_ID);
      expect(listed.kind).toBe('ok');
      if (listed.kind !== 'ok') return;
      expect(listed.value[0]?.revokedAt ?? null).toBeNull();
    });
  });

  describe('redeem: the only path that mints a replica', () => {
    const body = buildSerializedCampaign(
      { ...buildPopulatedCampaign(), id: CAMPAIGN_ID },
      'device-test',
      1,
    ).body;

    async function redeem(
      token: unknown,
      overrides: {
        sourceInstanceId?: string;
        localInstanceId?: string;
        existing?: SerializedCampaign | null;
        nowMs?: number;
      } = {},
    ) {
      return redeemCampaignGrant(
        {
          token,
          sourceInstanceId: overrides.sourceInstanceId ?? 'source-host',
          localInstanceId: overrides.localInstanceId ?? 'consuming-host',
          body,
          redeemedAt: '2026-08-24T00:00:00.000Z',
          existing: overrides.existing ?? null,
        },
        overrides.nowMs ?? NOW_MS,
      );
    }

    it('produces a replica record carrying full provenance', async () => {
      storeCampaign(CAMPAIGN_ID, { role: 'source' });
      const grant = issue();
      const token = await signTokenFor(grant, keys);

      const result = await redeem(token);

      expect(result.kind).toBe('ok');
      if (result.kind !== 'ok') return;
      // The replica KNOWS what it is a copy of - it never has to infer
      // its role from whether a socket happens to be connected.
      expect(result.record.authority).toEqual({
        role: 'replica',
        sourceInstanceId: 'source-host',
        grantId: grant.grantId,
        scopes: ['campaign'],
      });
      expect(result.record.instanceId).toBe('consuming-host');
      expect(result.record.campaignId).toBe(CAMPAIGN_ID);
    });

    it('refuses a token whose scopes were widened in transit', async () => {
      storeCampaign(CAMPAIGN_ID, { role: 'source' });
      const grant = issue();
      // Signed for `campaign`, presented claiming `gm` as well.
      const tampered = await signTokenFor(grant, keys, {
        scopes: ['campaign', 'gm'],
      });

      const result = await redeem(tampered);

      // Scopes live inside the signed payload precisely so this fails.
      expect(result).toEqual({ kind: 'refused', reason: 'bad-signature' });
    });

    it('refuses a token signed by a different key', async () => {
      storeCampaign(CAMPAIGN_ID, { role: 'source' });
      const grant = issue();
      const attacker = await generateKeyPair();
      const forged = await signTokenFor(grant, {
        publicKey: keys.publicKey,
        privateKey: attacker.privateKey,
      });

      expect(await redeem(forged)).toEqual({
        kind: 'refused',
        reason: 'bad-signature',
      });
    });

    it('refuses an expired token', async () => {
      storeCampaign(CAMPAIGN_ID, { role: 'source' });
      const grant = issue();
      const token = await signTokenFor(grant, keys);

      expect(
        await redeem(token, { nowMs: Date.parse('2026-10-01T00:00:00.000Z') }),
      ).toEqual({ kind: 'refused', reason: 'expired' });
    });

    it('refuses to turn a campaign this host sources into a replica', async () => {
      storeCampaign(CAMPAIGN_ID, { role: 'source' });
      const grant = issue();
      const token = await signTokenFor(grant, keys);
      const existing = JSON.parse(
        (
          getSQLiteService()
            .getDatabase()
            .prepare('SELECT payload FROM campaigns WHERE id = ?')
            .get(CAMPAIGN_ID) as { payload: string }
        ).payload,
      ) as SerializedCampaign;

      expect(await redeem(token, { existing })).toEqual({
        kind: 'refused',
        reason: 'already-redeemed',
      });
    });

    it('refuses a share that names this very host as its source', async () => {
      storeCampaign(CAMPAIGN_ID, { role: 'source' });
      const grant = issue();
      const token = await signTokenFor(grant, keys);

      expect(
        await redeem(token, {
          sourceInstanceId: 'consuming-host',
          localInstanceId: 'consuming-host',
        }),
      ).toEqual({ kind: 'refused', reason: 'missing-source-instance' });
    });

    it('refuses a malformed token without throwing', async () => {
      for (const bad of [null, 42, {}, { grantId: '' }]) {
        expect(await redeem(bad)).toEqual({
          kind: 'refused',
          reason: 'malformed-token',
        });
      }
    });
  });
});
