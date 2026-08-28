/**
 * SQLite constraint-error detection.
 *
 * better-sqlite3 signals a constraint violation with a `SqliteError`
 * carrying a `.code` (`SQLITE_CONSTRAINT_UNIQUE`,
 * `SQLITE_CONSTRAINT_PRIMARYKEY`, or the broader `SQLITE_CONSTRAINT`)
 * and a message of the form "UNIQUE constraint failed: table.column".
 *
 * These predicates deliberately DUCK-TYPE instead of testing
 * `instanceof Error`. A cross-realm error object - the native binding
 * loaded under a different module registry, which a large Jest run
 * produces routinely - fails `instanceof` while carrying a perfectly
 * good `message` and `code`. Gating on `instanceof` therefore lets a
 * genuine constraint violation escape as an untyped raw error at
 * random, which is exactly the intermittent failure this module was
 * extracted to stop. Matching on either `.code` or the message also
 * survives message-phrasing differences between a CI runner's
 * prebuilt binary and a locally compiled one.
 */

/** Reads `error.message` from any shape without assuming a realm. */
function messageOf(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const { message } = error as { message?: unknown };
  return typeof message === 'string' ? message : '';
}

/** Reads `error.code` from any shape without assuming a realm. */
function codeOf(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const { code } = error as { code?: unknown };
  return typeof code === 'string' ? code : '';
}

/**
 * True for any SQLite constraint violation, unique or primary key.
 * Callers that need to distinguish which key collided should pair this
 * with `sqliteConstraintMessage`.
 */
export function isSqliteUniqueConstraintError(error: unknown): boolean {
  if (codeOf(error).startsWith('SQLITE_CONSTRAINT')) return true;
  return /UNIQUE constraint failed|PRIMARY KEY/i.test(messageOf(error));
}

/**
 * The violation's message, for callers that key on the colliding
 * column (for example telling a duplicate-identity collision apart
 * from a sequence-slot collision). Empty string when absent.
 */
export function sqliteConstraintMessage(error: unknown): string {
  return messageOf(error);
}
