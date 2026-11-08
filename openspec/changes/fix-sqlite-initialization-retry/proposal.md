## Why

A migration-version read failure is currently treated as version zero, so
initialization can replay an applied migration and hide the original error.
Failed initialization also retains the open handle, causing later calls in the
same process to skip pending migrations.

## What Changes

- Rethrow the original migration-version read error without applying migrations.
- Clear the in-process handle and attempt to close the failed connection when
  initialization fails; preserve the original error even if cleanup fails.
- Allow the same service instance to initialize again after the fault is removed.
- Pin recovery and database preservation with file-backed regression tests.

## Impact

Affected capability: persistence-services. SQLiteService owns this lifecycle;
the Next API bundle and server.js have separate singleton instances of the same
class, so both receive the fix without caller changes. Vault repositories,
match-log persistence, campaign fast-forward, maintenance scripts and the
Electron embedded server inherit the same behavior.

Reset means clearing only the in-process connection handle/state. Recovery MUST
NOT delete, truncate or recreate the user's database file. Existing user data,
committed migrations, schemas and persisted formats remain unchanged. An
individual failed migration still rolls back atomically; prior successful
migrations remain committed and the retry resumes from their recorded version.

## Non-goals

Lazy-table migration consolidation, new schema versions, changes to callers,
singleton factories, gameplay rules, replay payloads, catalogs and database-file
repair or replacement. Equipment availability and tech base rules do not apply.
