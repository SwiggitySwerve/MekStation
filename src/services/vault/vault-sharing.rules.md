# Vault sharing expiry and use limits

The vault service package owns these rules. `vaultExpiry.ts` provides write
normalization, service validity checks, and the shared SQL access predicate.

- Share-link creation, expiry updates (including PATCH), permission grants, and
  permission expiry updates store `new Date(input).toISOString()`. Explicit null
  expiry means unlimited time. Creation preserves its existing treatment of an
  omitted or empty expiry as null; updates reject empty and invalid strings.
- Redemption and permission checks compare parsed instants with SQLite
  `julianday`, using one bound UTC ISO timestamp per operation. An expiry equal
  to now is expired. SQLite NULL results from unparseable stored values fail
  closed. The redemption predicate remains inside the atomic use-count UPDATE.
- Existing ISO strings with timezone offsets work without a migration. Legacy
  non-ISO formats SQLite cannot parse, including `Nov 8 2026`, are denied until
  explicitly normalized, even when JavaScript accepts that format. New writes
  accepting those inputs store their canonical ISO representation.
- In-memory validity checks also reject invalid and empty stored dates and use
  the same exclusive expiry boundary. SQL remains authoritative for access.
- Updating max uses may set null (unlimited) or a limit at least equal to the
  current use count. The comparison belongs in the UPDATE predicate so a stale
  management-page count cannot violate the invariant. A failed update leaves
  the limit and use count unchanged.

## Proposed one-off normalization of existing rows

This procedure is documented for a separately authorized maintenance operation;
the fix does not execute a backfill or change the schema.

1. Stop application writers and back up the SQLite database, including a
   consistent WAL checkpoint. Record the application runtime timezone: legacy
   timezone-free inputs such as `Nov 8 2026` use that timezone under JavaScript
   Date parsing. Resolve any unknown original timezone before applying changes.
2. Dry-run all non-null `expires_at` values in `vault_share_links` and
   `vault_permissions` through `normalizeVaultExpiry`. Report unchanged,
   changed, and invalid counts and the affected row IDs. Avoid printing link
   tokens or other credentials. Never replace an invalid value with null.
3. If any input is invalid or its intended instant is uncertain, stop before
   writing. Have the owner explicitly correct or revoke the affected entry,
   then repeat the dry run. Unsupported legacy values remain denied meanwhile.
4. Apply only changed expiry values in one transaction through the owning
   repositories' expiry-update methods. Preserve every other column. Abort and
   roll back on any error, row-count mismatch, or unexpected original value.
5. Verify all remaining non-null values equal their normalized representations,
   compare counts, and repeat the dry run to prove idempotence before resuming
   writers. Retain the backup and summary for rollback and audit.

Authorization, vault-lock behavior, page-load use consumption, and cleanup
retention policy are outside this change.
