/**
 * SQLite constraint-error detection.
 *
 * The regression these tests exist for: the previous guards gated on
 * `error instanceof Error` before reading the message. A constraint
 * error constructed in a different realm - which a large Jest run
 * produces routinely, because the native binding can be loaded under
 * more than one module registry - fails that identity check while
 * carrying a perfectly usable message and code. The guard therefore
 * dropped through and a raw driver error escaped instead of the typed
 * conflict callers handle. It surfaced as an intermittent
 * `SqliteError: UNIQUE constraint failed` in the full unit run that
 * never reproduced when the suite ran alone.
 */

import { runInNewContext } from 'node:vm';

import {
  isSqliteUniqueConstraintError,
  sqliteConstraintMessage,
} from '../sqliteConstraintErrors';

/**
 * Builds an Error in a FOREIGN realm: a real error object with a real
 * message whose prototype chain is not this realm's `Error`.
 */
function foreignRealmError(message: string, code?: string): unknown {
  const error = runInNewContext('new Error(globalThis.__message)', {
    __message: message,
  }) as { code?: string };
  if (code !== undefined) error.code = code;
  return error;
}

describe('sqlite constraint error detection', () => {
  it('a foreign-realm unique violation is detected even though instanceof fails', () => {
    const error = foreignRealmError(
      'UNIQUE constraint failed: replay_checkpoints.stream_id, replay_checkpoints.revision',
    );

    // The precondition that broke the old guards.
    expect(error instanceof Error).toBe(false);
    expect(isSqliteUniqueConstraintError(error)).toBe(true);
    expect(sqliteConstraintMessage(error)).toContain('replay_checkpoints');
  });

  it('detects same-realm violations by message and by driver code', () => {
    expect(
      isSqliteUniqueConstraintError(
        new Error('UNIQUE constraint failed: action_audit.command_id'),
      ),
    ).toBe(true);
    expect(
      isSqliteUniqueConstraintError(new Error('PRIMARY KEY must be unique')),
    ).toBe(true);

    // A driver build whose message is phrased differently still carries
    // the code, so detection must not depend on message wording alone.
    const coded = Object.assign(new Error('constraint violated'), {
      code: 'SQLITE_CONSTRAINT_UNIQUE',
    });
    expect(isSqliteUniqueConstraintError(coded)).toBe(true);
    expect(
      isSqliteUniqueConstraintError(
        foreignRealmError('x', 'SQLITE_CONSTRAINT'),
      ),
    ).toBe(true);
  });

  it('does not claim unrelated failures', () => {
    expect(isSqliteUniqueConstraintError(new Error('disk I/O error'))).toBe(
      false,
    );
    expect(isSqliteUniqueConstraintError(null)).toBe(false);
    expect(isSqliteUniqueConstraintError(undefined)).toBe(false);
    expect(isSqliteUniqueConstraintError('UNIQUE constraint failed')).toBe(
      false,
    );
    expect(isSqliteUniqueConstraintError({ code: 'SQLITE_BUSY' })).toBe(false);
    expect(sqliteConstraintMessage(null)).toBe('');
  });
});
