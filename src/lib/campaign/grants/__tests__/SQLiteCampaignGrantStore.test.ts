/**
 * SQLite campaign-grant store contract (design D5, task 2.1), against
 * REAL SQLite files.
 *
 * Pins: issue canonicalizes scopes; empty sets are typed-rejected;
 * list includes active and revoked history; revoke is one-way and
 * typed on unknown/already-revoked; grants survive close/reopen with
 * identical canonical scopes; grant ids are opaque 32-hex and are not
 * derived from participant or campaign identity.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import { serializeGrantScopes } from '../campaignGrantGuards';
import {
  CAMPAIGN_GRANT_ID_PATTERN,
  CampaignGrantError,
} from '../ICampaignGrantStore';
import { SQLiteCampaignGrantStore } from '../SQLiteCampaignGrantStore';

const CAMPAIGN_ID = 'campaign-alpha';
const PARTICIPANT_ID = 'participant-1';
/** Stand-in issuing identity key; the store only pins the string. */
const ISSUER_PUBLIC_KEY = 'aXNzdWVyLXB1YmxpYy1rZXktZml4dHVyZQ==';
const ISSUED_AT = '2026-08-22T16:00:00.000Z';
const EXPIRES_AT = '2026-08-22T20:00:00.000Z';
const REVOKED_AT = '2026-08-22T17:00:00.000Z';

describe('SQLite campaign grant store', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-grant-store-'));
    dbPath = path.join(dir, 'campaign-grants.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /** Opens a file-backed store after running migrations. */
  function store(): SQLiteCampaignGrantStore {
    getSQLiteService({ path: dbPath }).initialize();
    return new SQLiteCampaignGrantStore(getSQLiteService().getDatabase());
  }

  it('canonicalizes unsorted duplicated scopes and rejects an empty set', () => {
    const grants = store();
    const issued = grants.issueGrant({
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_ID,
      issuerPublicKey: ISSUER_PUBLIC_KEY,
      scopes: ['gm', 'campaign', 'gm', 'campaign'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    expect(issued.scopes).toEqual(['campaign', 'gm']);
    expect(serializeGrantScopes(issued.scopes)).toBe('["campaign","gm"]');
    expect(issued.grantId).toMatch(CAMPAIGN_GRANT_ID_PATTERN);
    expect(issued.grantId.includes(CAMPAIGN_ID)).toBe(false);
    expect(issued.grantId.includes(PARTICIPANT_ID)).toBe(false);
    expect(issued.revokedAt).toBeNull();
    try {
      grants.issueGrant({
        campaignId: CAMPAIGN_ID,
        participantId: PARTICIPANT_ID,
        issuerPublicKey: ISSUER_PUBLIC_KEY,
        scopes: [],
        issuedAt: ISSUED_AT,
        expiresAt: EXPIRES_AT,
      });
      throw new Error('expected empty-scopes');
    } catch (error) {
      expect(error).toBeInstanceOf(CampaignGrantError);
      if (error instanceof CampaignGrantError) {
        expect(error.code).toBe('empty-scopes');
      }
    }
  });

  it('two grants with the same logical set persist byte-identical scopes', () => {
    const grants = store();
    const first = grants.issueGrant({
      campaignId: CAMPAIGN_ID,
      participantId: 'participant-a',
      issuerPublicKey: ISSUER_PUBLIC_KEY,
      scopes: ['player:bob', 'team:alpha', 'campaign'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    const second = grants.issueGrant({
      campaignId: CAMPAIGN_ID,
      participantId: 'participant-b',
      issuerPublicKey: ISSUER_PUBLIC_KEY,
      scopes: ['campaign', 'team:alpha', 'player:bob', 'team:alpha'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    expect(serializeGrantScopes(first.scopes)).toBe(
      serializeGrantScopes(second.scopes),
    );
    const db = getSQLiteService().getDatabase();
    const rows = db
      .prepare('SELECT scopes FROM campaign_grant ORDER BY participant_id')
      .all() as { scopes: string }[];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.scopes).toBe(rows[1]?.scopes);
    expect(rows[0]?.scopes).toBe('["campaign","player:bob","team:alpha"]');
  });

  it('lists active and revoked history; revoke is one-way and typed', () => {
    const grants = store();
    const active = grants.issueGrant({
      campaignId: CAMPAIGN_ID,
      participantId: 'participant-a',
      issuerPublicKey: ISSUER_PUBLIC_KEY,
      scopes: ['campaign'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    const toRevoke = grants.issueGrant({
      campaignId: CAMPAIGN_ID,
      participantId: 'participant-b',
      issuerPublicKey: ISSUER_PUBLIC_KEY,
      scopes: ['gm', 'campaign'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    const revoked = grants.revokeGrant(toRevoke.grantId, REVOKED_AT);
    expect(revoked.revokedAt).toBe(REVOKED_AT);
    expect(revoked.scopes).toEqual(['campaign', 'gm']);
    const listed = grants.listGrants(CAMPAIGN_ID);
    expect(listed.map((grant) => grant.grantId).sort()).toEqual(
      [active.grantId, toRevoke.grantId].sort(),
    );
    expect(
      listed.find((grant) => grant.grantId === toRevoke.grantId)?.revokedAt,
    ).toBe(REVOKED_AT);
    try {
      grants.revokeGrant(toRevoke.grantId, '2026-08-22T18:00:00.000Z');
      throw new Error('expected already-revoked');
    } catch (error) {
      expect(error).toBeInstanceOf(CampaignGrantError);
      if (error instanceof CampaignGrantError) {
        expect(error.code).toBe('already-revoked');
      }
    }
    expect(grants.getGrant(toRevoke.grantId)?.revokedAt).toBe(REVOKED_AT);
    try {
      grants.revokeGrant('c'.repeat(32), REVOKED_AT);
      throw new Error('expected unknown-grant');
    } catch (error) {
      expect(error).toBeInstanceOf(CampaignGrantError);
      if (error instanceof CampaignGrantError) {
        expect(error.code).toBe('unknown-grant');
      }
    }
    const db = getSQLiteService().getDatabase();
    expect(() =>
      db
        .prepare('DELETE FROM campaign_grant WHERE grant_id = ?')
        .run(toRevoke.grantId),
    ).toThrow(/audit facts/);
    expect(
      db.prepare('SELECT COUNT(*) AS c FROM campaign_grant').get(),
    ).toEqual({
      c: 2,
    });
  });

  it('grants survive a database close/reopen with identical canonical scopes', () => {
    const first = store();
    const issued = first.issueGrant({
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_ID,
      issuerPublicKey: ISSUER_PUBLIC_KEY,
      scopes: ['gm', 'team:alpha', 'campaign', 'team:alpha'],
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
    const scopesJson = serializeGrantScopes(issued.scopes);
    resetSQLiteService();
    const reopened = store();
    const loaded = reopened.getGrant(issued.grantId);
    expect(loaded).not.toBeNull();
    if (loaded === null) return;
    expect(loaded.scopes).toEqual(['campaign', 'gm', 'team:alpha']);
    expect(serializeGrantScopes(loaded.scopes)).toBe(scopesJson);
    expect(reopened.listGrants(CAMPAIGN_ID)).toHaveLength(1);
  });
});
