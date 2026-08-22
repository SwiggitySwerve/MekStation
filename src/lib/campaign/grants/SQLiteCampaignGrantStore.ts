/**
 * SQLite campaign-grant store (design D5, task 2.1).
 *
 * Borrowed-handle adapter over the v14 `campaign_grant` table. Grant
 * ids are minted here from crypto randomness. Scopes are canonicalized
 * before INSERT so the stored JSON is the same serialization the token
 * signer puts in the signed payload.
 *
 * Revoke is one-way: an already-revoked grant is a typed already-revoked
 * error and does not rewrite revoked_at (the first stamp is the audit
 * fact). DELETE is never issued; the trigger would ABORT it anyway.
 *
 * Times come from the caller. This module never reads the system clock.
 * Server-internal only. Share UI is 2.2, replica store is 2.3, and the
 * campaign-sync channel is 3.3.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D5)
 */

import type Database from 'better-sqlite3';

import {
  assertIssueGrantInput,
  canonicalizeGrantScopes,
  generateOpaqueGrantId,
  hydrateCampaignGrantRow,
  isNonempty,
  isOpaqueGrantId,
  isUniqueViolation,
  serializeGrantScopes,
  MAX_GRANT_ID_ATTEMPTS,
  type ICampaignGrantRow,
} from './campaignGrantGuards';
import {
  CampaignGrantError,
  type ICampaignGrant,
  type ICampaignGrantStore,
  type IIssueCampaignGrant,
} from './ICampaignGrantStore';

const ROW_COLUMNS = `grant_id, campaign_id, participant_id, issuer_public_key, scopes, issued_at, expires_at, revoked_at, created_at`;

const INSERT_SQL = `INSERT INTO campaign_grant (
  grant_id, campaign_id, participant_id, issuer_public_key, scopes,
  issued_at, expires_at, revoked_at, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`;

const REVOKE_SQL = `UPDATE campaign_grant SET revoked_at = ? WHERE grant_id = ?`;

export class SQLiteCampaignGrantStore implements ICampaignGrantStore {
  /**
   * Binds a borrowed SQLite handle. The adapter does not own the
   * connection lifetime and does not open a second database.
   */
  public constructor(private readonly db: Database.Database) {}

  /**
   * Mints an opaque grant id, canonicalizes scopes, and inserts an
   * active row. Empty or invalid scope sets fail typed before SQL.
   */
  public issueGrant(input: IIssueCampaignGrant): ICampaignGrant {
    assertIssueGrantInput(input);
    const scopes = canonicalizeGrantScopes(input.scopes);
    const scopesJson = serializeGrantScopes(scopes);
    return this.db.transaction((): ICampaignGrant => {
      const grantId = this.insertWithFreshId(input, scopesJson);
      const created = this.load(grantId);
      if (created === null) {
        throw new CampaignGrantError(
          'invalid-record',
          'Campaign grant insert did not persist',
        );
      }
      return created;
    })();
  }

  /**
   * Active and revoked grants for a campaign, oldest-issued first then
   * grant id, so the share surface (task 2.2) can show history.
   */
  public listGrants(campaignId: string): readonly ICampaignGrant[] {
    if (!isNonempty(campaignId)) return [];
    const rows = this.db
      .prepare(
        `SELECT ${ROW_COLUMNS} FROM campaign_grant
         WHERE campaign_id = ?
         ORDER BY issued_at ASC, grant_id ASC`,
      )
      .all(campaignId) as ICampaignGrantRow[];
    return Object.freeze(rows.map((row) => hydrateCampaignGrantRow(row)));
  }

  /**
   * One-way revoke. Unknown ids throw unknown-grant. Already-revoked
   * throws already-revoked without UPDATE so the original timestamp
   * stays the audit fact (re-revoke is typed, not a second write).
   */
  public revokeGrant(grantId: string, revokedAt: string): ICampaignGrant {
    if (!isOpaqueGrantId(grantId)) {
      throw new CampaignGrantError(
        'unknown-grant',
        'No campaign grant exists for this grant id',
      );
    }
    if (!isNonempty(revokedAt) || !Number.isFinite(Date.parse(revokedAt))) {
      throw new CampaignGrantError(
        'invalid-identity',
        'Grant revokedAt must be a nonempty parseable timestamp',
      );
    }
    return this.db.transaction((): ICampaignGrant => {
      const existing = this.load(grantId);
      if (existing === null) {
        throw new CampaignGrantError(
          'unknown-grant',
          'No campaign grant exists for this grant id',
        );
      }
      if (existing.revokedAt !== null) {
        throw new CampaignGrantError(
          'already-revoked',
          'Campaign grant is already revoked',
        );
      }
      this.db.prepare(REVOKE_SQL).run(revokedAt, grantId);
      const revoked = this.load(grantId);
      if (revoked === null) {
        throw new CampaignGrantError(
          'invalid-record',
          'Campaign grant revoke did not persist',
        );
      }
      return revoked;
    })();
  }

  /** Loads one grant by opaque id, or null when absent. */
  public getGrant(grantId: string): ICampaignGrant | null {
    if (!isOpaqueGrantId(grantId)) return null;
    return this.load(grantId);
  }

  /** SELECT by primary key; returns null when the identity is absent. */
  private load(grantId: string): ICampaignGrant | null {
    const row = this.db
      .prepare(`SELECT ${ROW_COLUMNS} FROM campaign_grant WHERE grant_id = ?`)
      .get(grantId) as ICampaignGrantRow | undefined;
    return row === undefined ? null : hydrateCampaignGrantRow(row);
  }

  /**
   * Inserts with a fresh opaque id, retrying only on primary-key unique
   * collisions. Other constraint failures propagate.
   */
  private insertWithFreshId(
    input: IIssueCampaignGrant,
    scopesJson: string,
  ): string {
    for (let attempt = 0; attempt < MAX_GRANT_ID_ATTEMPTS; attempt += 1) {
      const grantId = generateOpaqueGrantId();
      try {
        this.db
          .prepare(INSERT_SQL)
          .run(
            grantId,
            input.campaignId,
            input.participantId,
            input.issuerPublicKey,
            scopesJson,
            input.issuedAt,
            input.expiresAt,
            input.issuedAt,
          );
        return grantId;
      } catch (error) {
        if (
          !isUniqueViolation(error) ||
          attempt === MAX_GRANT_ID_ATTEMPTS - 1
        ) {
          throw error;
        }
      }
    }
    throw new CampaignGrantError(
      'invalid-record',
      'Campaign grant id allocation exhausted',
    );
  }
}
