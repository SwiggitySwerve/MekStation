/**
 * Who may administer a campaign's sharing (finding #21).
 *
 * `requireSourceCampaign` answers a question about the CAMPAIGN - does
 * this server execute commands for it - and every browser this server
 * serves reads that same `role: 'source'`, co-op guests included. It was
 * being used as though it answered "is the caller the owner", which it
 * never did: the share surface listed every grantee's principal id, and
 * offered a working Revoke, to any caller who knew a campaign id.
 *
 * Measured in Chromium by `e2e/authority-privacy-three-context.spec.ts`:
 * Player 1's post-reload page content carried Player 2's `pid_...`,
 * rendered by `CampaignSharePanel`'s grant roster.
 *
 * The authorization these rows pin is the campaign's ACTIVE `gm` seat
 * from `campaign_session_participant` - the same durable membership the
 * campaign socket admits on, not a second parallel rule.
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { sourceCampaignAuthority } from '@/lib/campaign/authority/campaignAuthority';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import type { ICampaignGrant } from '../ICampaignGrantStore';

import {
  issueShareGrant,
  listShareGrants,
  revokeShareGrant,
} from '../campaignShareService';

const CAMPAIGN_ID = 'campaign-share-authority';
const NO_GM_CAMPAIGN_ID = 'campaign-share-authority-no-gm';
const SESSION_ID = 'session-share-authority';
/**
 * The player is still bound BEFORE the GM, and the row order is still
 * load-bearing evidence even though `isActiveCampaignGm` no longer reads
 * one row out of the campaign. It pins the regression: an earlier
 * fetch-then-compare gate returned whichever active row sorted first, so
 * a seat filter widened to accept players refused a seated player anyway
 * whenever the GM sorted first - measured, all 24 rows green under that
 * mutant. Keeping the adversarial ordering means a return to that shape
 * fails here rather than passing on fixture luck.
 */
const PLAYER_BOUND_AT = '2026-08-22T00:00:00.000Z';
const GM_BOUND_AT = '2026-08-23T00:00:00.000Z';
const GM_ID = 'pid-gm';
const PLAYER_ID = 'pid-player';
const OUTSIDER_ID = 'pid-outsider';
const ISSUED_AT = '2026-08-23T00:00:00.000Z';
const EXPIRES_AT = '2026-09-23T00:00:00.000Z';

/** Writes a SOURCE campaign row straight to storage. */
function storeSourceCampaign(campaignId: string): void {
  const db = getSQLiteService().getDatabase();
  const base = buildSerializedCampaign(
    { ...buildPopulatedCampaign(), id: campaignId },
    'device-test',
    1,
  );
  const record: SerializedCampaign = {
    ...base,
    instanceId: 'local-host-instance',
    authority: sourceCampaignAuthority(),
  };
  db.prepare(
    `INSERT OR REPLACE INTO campaigns
       (id, version, schema_version, name, faction_id, campaign_date,
        balance, origin_device_id, saved_at, payload)
     VALUES (?, 1, 2, ?, 'mercenary', '3025-01-01T00:00:00.000Z',
             0, 'device-test', ?, ?)`,
  ).run(campaignId, campaignId, ISSUED_AT, JSON.stringify(record));
}

/** Binds one durable seat on a campaign's co-op session. */
function seat(
  participantId: string,
  role: 'gm' | 'player',
  options: { readonly boundAt?: string; readonly campaignId?: string } = {},
): void {
  const campaignId = options.campaignId ?? CAMPAIGN_ID;
  const bound = bindCampaignSessionParticipant({
    campaignId,
    sessionId:
      campaignId === CAMPAIGN_ID ? SESSION_ID : `session-${campaignId}`,
    participantId,
    seat: role,
    boundAt: options.boundAt ?? GM_BOUND_AT,
  });
  if (bound.kind !== 'bound') {
    throw new Error(`could not seat ${participantId}: ${bound.kind}`);
  }
}

describe('campaign share caller authority', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-share-auth-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'share-auth.db') }).initialize();
    storeSourceCampaign(CAMPAIGN_ID);
    seat(PLAYER_ID, 'player', { boundAt: PLAYER_BOUND_AT });
    seat(GM_ID, 'gm', { boundAt: GM_BOUND_AT });
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function db(): Database.Database {
    return getSQLiteService().getDatabase();
  }

  /** One grant on the campaign, issued by the GM. */
  function issueAsGm(): ICampaignGrant {
    const result = issueShareGrant(db(), {
      campaignId: CAMPAIGN_ID,
      callerId: GM_ID,
      participantId: PLAYER_ID,
      issuerPublicKey: 'AAAA',
      scopes: ['campaign'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    if (result.kind !== 'ok') {
      throw new Error(`expected the GM to issue, got ${result.reason}`);
    }
    return result.value;
  }

  it('lists grants for the campaign GM', () => {
    issueAsGm();
    const listed = listShareGrants(db(), CAMPAIGN_ID, GM_ID);
    expect(listed.kind).toBe('ok');
    if (listed.kind !== 'ok') return;
    expect(listed.value).toHaveLength(1);
  });

  it('refuses to list grants for a seated player - the leak finding #21 measured', () => {
    issueAsGm();
    const listed = listShareGrants(db(), CAMPAIGN_ID, PLAYER_ID);
    // The refusal itself, and NOT a filtered-but-successful list: an
    // empty `ok` would still tell the caller the campaign exists and is
    // shareable here, and would hand the surface an affordance it may
    // not have.
    expect(listed).toEqual({ kind: 'refused', reason: 'not-campaign-gm' });
  });

  it('refuses to list grants for a principal with no seat at all', () => {
    issueAsGm();
    expect(listShareGrants(db(), CAMPAIGN_ID, OUTSIDER_ID)).toEqual({
      kind: 'refused',
      reason: 'not-campaign-gm',
    });
  });

  it('refuses a player-issued grant, and writes nothing', () => {
    const issued = issueShareGrant(db(), {
      campaignId: CAMPAIGN_ID,
      callerId: PLAYER_ID,
      participantId: OUTSIDER_ID,
      issuerPublicKey: 'AAAA',
      scopes: ['campaign'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    expect(issued).toEqual({ kind: 'refused', reason: 'not-campaign-gm' });
    const listed = listShareGrants(db(), CAMPAIGN_ID, GM_ID);
    expect(listed.kind === 'ok' ? listed.value : null).toEqual([]);
  });

  it('refuses a player-driven revoke, and leaves the grant standing', () => {
    const grant = issueAsGm();
    const revoked = revokeShareGrant(
      db(),
      CAMPAIGN_ID,
      grant.grantId,
      '2026-08-25T00:00:00.000Z',
      PLAYER_ID,
    );
    expect(revoked).toEqual({ kind: 'refused', reason: 'not-campaign-gm' });
    // The refusal has to precede the write, not report one that already
    // landed: a revoked grant would already have withdrawn the other
    // player's access.
    const listed = listShareGrants(db(), CAMPAIGN_ID, GM_ID);
    const still = listed.kind === 'ok' ? listed.value[0] : null;
    expect(still?.grantId).toBe(grant.grantId);
    expect(still?.revokedAt ?? null).toBeNull();
  });

  it('refuses an ACTIVE seated player every verb, and the roster survives it', () => {
    const grant = issueAsGm();

    // The finding #21 population exactly: a co-op guest with a LIVE
    // `campaign_session_participant` row on this campaign's session -
    // not an outsider, not a revoked member. Every verb, because the
    // read is the leak and the two writes are the escalation.
    expect(listShareGrants(db(), CAMPAIGN_ID, PLAYER_ID)).toEqual({
      kind: 'refused',
      reason: 'not-campaign-gm',
    });
    expect(
      issueShareGrant(db(), {
        campaignId: CAMPAIGN_ID,
        callerId: PLAYER_ID,
        participantId: OUTSIDER_ID,
        issuerPublicKey: 'AAAA',
        scopes: ['campaign'],
        issuedAt: ISSUED_AT,
        expiresAt: EXPIRES_AT,
      }),
    ).toEqual({ kind: 'refused', reason: 'not-campaign-gm' });
    expect(
      revokeShareGrant(
        db(),
        CAMPAIGN_ID,
        grant.grantId,
        '2026-08-25T00:00:00.000Z',
        PLAYER_ID,
      ),
    ).toEqual({ kind: 'refused', reason: 'not-campaign-gm' });

    // The roster is exactly as the GM left it: one grant, unrevoked,
    // and nothing minted by the refused issue.
    const listed = listShareGrants(db(), CAMPAIGN_ID, GM_ID);
    expect(listed.kind).toBe('ok');
    if (listed.kind !== 'ok') return;
    expect(listed.value.map((entry) => entry.grantId)).toEqual([grant.grantId]);
    expect(listed.value[0]?.revokedAt ?? null).toBeNull();
  });

  it('refuses an active player on a campaign whose GM seat was never bound', () => {
    // Order cannot rescue a widened seat filter here: the player's row
    // is the ONLY membership on this campaign, so a gate that accepts
    // any seat accepts this one.
    storeSourceCampaign(NO_GM_CAMPAIGN_ID);
    seat(PLAYER_ID, 'player', {
      campaignId: NO_GM_CAMPAIGN_ID,
      boundAt: PLAYER_BOUND_AT,
    });

    expect(listShareGrants(db(), NO_GM_CAMPAIGN_ID, PLAYER_ID)).toEqual({
      kind: 'refused',
      reason: 'not-campaign-gm',
    });
    expect(
      issueShareGrant(db(), {
        campaignId: NO_GM_CAMPAIGN_ID,
        callerId: PLAYER_ID,
        participantId: OUTSIDER_ID,
        issuerPublicKey: 'AAAA',
        scopes: ['campaign'],
        issuedAt: ISSUED_AT,
        expiresAt: EXPIRES_AT,
      }),
    ).toEqual({ kind: 'refused', reason: 'not-campaign-gm' });
  });

  it('refuses a GM whose own seat has been revoked', () => {
    issueAsGm();
    getSQLiteService()
      .getDatabase()
      .prepare(
        `UPDATE campaign_session_participant SET revoked_at = ?
         WHERE campaign_id = ? AND participant_id = ?`,
      )
      .run('2026-08-25T00:00:00.000Z', CAMPAIGN_ID, GM_ID);
    expect(listShareGrants(db(), CAMPAIGN_ID, GM_ID)).toEqual({
      kind: 'refused',
      reason: 'not-campaign-gm',
    });
  });
});
