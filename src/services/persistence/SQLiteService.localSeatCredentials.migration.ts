/**
 * Local seat credentials schema (LSC-1DB).
 *
 * Operator-managed guest seat credentials for the same-host co-op
 * session. These rows are NOT vault identities: they never enter
 * `vault_identities`, never become the active row and never sign vault
 * content. A seat stores its public key and its password-encrypted
 * private key only; plaintext passwords and decrypted keys are never
 * persisted. CF-LSC0-6: the key column only accepts the vault
 * IdentityService ciphertext envelope and operation fingerprints only
 * accept a sha256 hex digest, so no password can land in either table.
 *
 * `generation` is the fencing token: provision, re-provision and revoke
 * bump it, so a mint that began under an older generation must not
 * sign. Failure/lockout state is durable so a restart does not reopen a
 * brute-force window. Operation rows make operator retries idempotent.
 * ADDITIVE ONLY: no foreign keys into vault or campaign tables.
 */

const SEAT_IDS = "('local-seat-1', 'local-seat-2')";
const nonempty = (column: string): string => `length(trim(${column})) > 0`;

export const LOCAL_SEAT_CREDENTIALS_MIGRATION = {
  version: 33,
  name: 'local_seat_credentials_schema',
  up: `
    CREATE TABLE IF NOT EXISTS local_seat_credentials (
      seat_id TEXT PRIMARY KEY NOT NULL CHECK (seat_id IN ${SEAT_IDS}),
      label TEXT NOT NULL CHECK (${nonempty('label')} AND length(label) <= 64),
      public_key TEXT NOT NULL CHECK (${nonempty('public_key')}),
      encrypted_private_key TEXT NOT NULL CHECK (
        json_valid(encrypted_private_key)
        AND json_type(encrypted_private_key, '$.ciphertext') IS 'text'
        AND json_type(encrypted_private_key, '$.iv') IS 'text'
        AND json_type(encrypted_private_key, '$.salt') IS 'text'
      ),
      generation INTEGER NOT NULL CHECK (generation > 0),
      revoked_at TEXT,
      failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
      locked_until_ms INTEGER NOT NULL DEFAULT 0 CHECK (locked_until_ms >= 0),
      updated_at TEXT NOT NULL CHECK (${nonempty('updated_at')})
    );

    CREATE TABLE IF NOT EXISTS local_seat_credential_operations (
      operation_id TEXT PRIMARY KEY NOT NULL
        CHECK (${nonempty('operation_id')} AND length(operation_id) <= 128),
      seat_id TEXT NOT NULL CHECK (seat_id IN ${SEAT_IDS}),
      kind TEXT NOT NULL CHECK (kind IN ('provision', 'revoke')),
      fingerprint TEXT NOT NULL
        CHECK (length(fingerprint) = 64 AND fingerprint NOT GLOB '*[^0-9a-f]*'),
      result_generation INTEGER NOT NULL CHECK (result_generation > 0),
      created_at TEXT NOT NULL CHECK (${nonempty('created_at')})
    );
  `,
};
