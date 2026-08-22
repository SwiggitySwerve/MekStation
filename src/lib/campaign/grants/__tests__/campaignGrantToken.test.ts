/**
 * Campaign grant token mint/verify (design D5, task 2.1).
 *
 * Security crux: scopes are inside the signed payload. Widening them
 * without a matching signature fails bad-signature. Re-signing with a
 * different key can pass the signature check and still fail the store
 * comparison (scope-mismatch). Revocation is a store fact; an unavailable
 * store is store-unavailable, never an authorization verdict.
 *
 * Time is injected. Production grant modules never read the system clock.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair, toBase64 } from '@/services/vault/IdentityService';

import type {
  ICampaignGrant,
  ICampaignGrantReadStore,
  ICampaignGrantSigner,
  ICampaignGrantToken,
} from '../ICampaignGrantStore';

import {
  canonicalizeGrantScopes,
  serializeGrantScopes,
} from '../campaignGrantGuards';
import {
  canonicalGrantTokenPayload,
  signCampaignGrantToken,
  verifyCampaignGrantToken,
} from '../campaignGrantToken';
import { SQLiteCampaignGrantStore } from '../SQLiteCampaignGrantStore';

const CAMPAIGN_ID = 'campaign-alpha';
const PARTICIPANT_ID = 'participant-1';
const ISSUED_AT = '2026-08-22T16:00:00.000Z';
const EXPIRES_AT = '2026-08-22T20:00:00.000Z';
const REVOKED_AT = '2026-08-22T17:00:00.000Z';
const NOW_ACTIVE_MS = Date.parse('2026-08-22T16:30:00.000Z');
const NOW_EXPIRED_MS = Date.parse('2026-08-22T20:00:00.000Z');

describe('campaign grant tokens', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-grant-token-'));
    dbPath = path.join(dir, 'campaign-grants.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /** Opens a file-backed grant store after running migrations. */
  function store(): SQLiteCampaignGrantStore {
    getSQLiteService({ path: dbPath }).initialize();
    return new SQLiteCampaignGrantStore(getSQLiteService().getDatabase());
  }

  /** Unlocked vault keypair in the shape unlockIdentity returns. */
  async function mintSigner(): Promise<ICampaignGrantSigner> {
    const keyPair = await generateKeyPair();
    return {
      publicKey: toBase64(keyPair.publicKey),
      privateKey: toBase64(keyPair.privateKey),
    };
  }

  /** Issues a campaign-only grant and a valid token for it. */
  async function issueSignedGrant(grants: SQLiteCampaignGrantStore): Promise<{
    grant: ICampaignGrant;
    token: ICampaignGrantToken;
    signer: ICampaignGrantSigner;
  }> {
    const signer = await mintSigner();
    const grant = grants.issueGrant({
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_ID,
      // The trust anchor: the issuing identity's key is pinned on the
      // row, and that is what verification checks against.
      issuerPublicKey: signer.publicKey,
      scopes: ['campaign'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    const token = await signCampaignGrantToken(grant, signer);
    return { grant, token, signer };
  }

  it('canonical payload uses lexicographic keys and canonical scopes', () => {
    const scopes = canonicalizeGrantScopes(['gm', 'campaign']);
    const payload = canonicalGrantTokenPayload({
      grantId: 'a'.repeat(32),
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_ID,
      scopes,
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    expect(payload).toBe(
      '{"campaignId":"campaign-alpha","expiresAt":"2026-08-22T20:00:00.000Z","grantId":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","issuedAt":"2026-08-22T16:00:00.000Z","participantId":"participant-1","scopes":["campaign","gm"]}',
    );
    expect(payload.indexOf('campaignId')).toBeLessThan(
      payload.indexOf('expiresAt'),
    );
    expect(payload.indexOf('expiresAt')).toBeLessThan(
      payload.indexOf('grantId'),
    );
    expect(payload.indexOf('grantId')).toBeLessThan(
      payload.indexOf('issuedAt'),
    );
    expect(payload.indexOf('issuedAt')).toBeLessThan(
      payload.indexOf('participantId'),
    );
    expect(payload.indexOf('participantId')).toBeLessThan(
      payload.indexOf('scopes'),
    );
  });

  it('accepts a freshly signed token against the issuing store', async () => {
    const grants = store();
    const { grant, token } = await issueSignedGrant(grants);
    const result = await verifyCampaignGrantToken(token, grants, NOW_ACTIVE_MS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.grant.grantId).toBe(grant.grantId);
      expect(result.token.scopes).toEqual(['campaign']);
    }
  });

  it('rejects a widened scope set as bad-signature without a new signature', async () => {
    const grants = store();
    const { token } = await issueSignedGrant(grants);
    const widened: ICampaignGrantToken = {
      ...token,
      scopes: canonicalizeGrantScopes(['campaign', 'gm']),
    };
    const result = await verifyCampaignGrantToken(
      widened,
      grants,
      NOW_ACTIVE_MS,
    );
    expect(result).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('a different-key re-sign never reaches the store comparison', async () => {
    // The trust anchor is the issuer key pinned on the stored grant, so
    // an attacker who knows a grant id and re-signs widened scopes with
    // their OWN keypair is stopped at the signature, not by the later
    // claims comparison. If this ever regresses to scope-mismatch, the
    // signature has stopped being anchored and the grant id has become
    // a bearer secret.
    const grants = store();
    const { grant } = await issueSignedGrant(grants);
    const attacker = await mintSigner();
    const reSigned = await signCampaignGrantToken(
      {
        ...grant,
        scopes: canonicalizeGrantScopes(['campaign', 'gm']),
      },
      attacker,
    );
    const result = await verifyCampaignGrantToken(
      reSigned,
      grants,
      NOW_ACTIVE_MS,
    );
    expect(result).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('widened scopes signed by the REAL issuer key still fail the store comparison', async () => {
    // Defence in depth behind the anchored signature: even a token the
    // issuing key vouches for is refused when its signed claims do not
    // equal the stored row, which is what catches a row edited around
    // the schema trigger.
    const grants = store();
    const { grant, signer } = await issueSignedGrant(grants);
    const widened = await signCampaignGrantToken(
      {
        ...grant,
        scopes: canonicalizeGrantScopes(['campaign', 'gm']),
      },
      signer,
    );
    const result = await verifyCampaignGrantToken(
      widened,
      grants,
      NOW_ACTIVE_MS,
    );
    expect(result).toEqual({ ok: false, reason: 'scope-mismatch' });
  });

  it('rejects a token whose signed scopes do not equal the stored row', async () => {
    const grants = store();
    const { grant, signer } = await issueSignedGrant(grants);
    const token = await signCampaignGrantToken(grant, signer);
    const mismatched: ICampaignGrantReadStore = {
      getGrant: () => ({
        ...grant,
        scopes: canonicalizeGrantScopes(['campaign', 'gm']),
      }),
    };
    const result = await verifyCampaignGrantToken(
      token,
      mismatched,
      NOW_ACTIVE_MS,
    );
    expect(result).toEqual({ ok: false, reason: 'scope-mismatch' });
    expect(serializeGrantScopes(token.scopes)).not.toBe(
      serializeGrantScopes(mismatched.getGrant(grant.grantId)?.scopes ?? []),
    );
  });

  it('rejects a cryptographically valid token for a revoked grant as revoked', async () => {
    const grants = store();
    const { grant, token } = await issueSignedGrant(grants);
    grants.revokeGrant(grant.grantId, REVOKED_AT);
    const result = await verifyCampaignGrantToken(token, grants, NOW_ACTIVE_MS);
    expect(result).toEqual({ ok: false, reason: 'revoked' });
    expect(
      getSQLiteService()
        .getDatabase()
        .prepare('SELECT COUNT(*) AS c FROM campaign_grant')
        .get(),
    ).toEqual({ c: 1 });
  });

  it('rejects an expired token using injected time, not the system clock', async () => {
    const grants = store();
    const { token } = await issueSignedGrant(grants);
    const result = await verifyCampaignGrantToken(
      token,
      grants,
      NOW_EXPIRED_MS,
    );
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('maps a broken store to store-unavailable, never an authorization verdict', async () => {
    const grants = store();
    const { token } = await issueSignedGrant(grants);
    const broken: ICampaignGrantReadStore = {
      getGrant: () => {
        throw new Error('disk failed');
      },
    };
    const result = await verifyCampaignGrantToken(token, broken, NOW_ACTIVE_MS);
    expect(result).toEqual({ ok: false, reason: 'store-unavailable' });
    expect(result).not.toEqual({ ok: false, reason: 'revoked' });
    expect(result).not.toEqual({ ok: false, reason: 'unknown-grant' });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown grant ids after a valid signature', async () => {
    const grants = store();
    const { grant, signer } = await issueSignedGrant(grants);
    const token = await signCampaignGrantToken(
      { ...grant, grantId: 'd'.repeat(32) },
      signer,
    );
    const result = await verifyCampaignGrantToken(token, grants, NOW_ACTIVE_MS);
    expect(result).toEqual({ ok: false, reason: 'unknown-grant' });
  });

  it('rejects malformed tokens before signature or store lookup', async () => {
    const grants = store();
    const { token } = await issueSignedGrant(grants);
    const missing = await verifyCampaignGrantToken(null, grants, NOW_ACTIVE_MS);
    expect(missing).toEqual({ ok: false, reason: 'malformed' });
    const unsorted = await verifyCampaignGrantToken(
      { ...token, scopes: ['gm', 'campaign'] },
      grants,
      NOW_ACTIVE_MS,
    );
    expect(unsorted).toEqual({ ok: false, reason: 'malformed' });
  });
});
