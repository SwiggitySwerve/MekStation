/**
 * Fixture-scoped combat journal-authority resolver (U15a).
 *
 * Production stays on `COMBAT_JOURNAL_AUTHORITY_MODE` (hardcoded 'off').
 * The only other path to 'shadow' or 'enabled' is an e2e process that
 * opted in with BOTH NEXT_PUBLIC_E2E_MODE==='true' and an explicit
 * MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE naming the mode. Both
 * keys are required so a production process can never arm this and a
 * default e2e run cannot either.
 *
 * This is the arm, not the cutover: it makes the two genesis clauses
 * reachable by the ladder once U15b forwards the keys. It does not move
 * the production default and it does not enable journal authority
 * anywhere by itself.
 */

import {
  COMBAT_JOURNAL_AUTHORITY_MODE,
  type CombatJournalAuthorityMode,
} from './matchJournalAuthority';

/** Env key the combat-journal e2e group sets on the e2e server. */
export const COMBAT_JOURNAL_AUTHORITY_E2E_ENV =
  'MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE' as const;

/** The only two modes the fixture arm may name. 'off' is not an arm. */
const ARMABLE_MODES: readonly CombatJournalAuthorityMode[] = [
  'shadow',
  'enabled',
];

/**
 * The mode this process was armed to, or null when it was not armed.
 *
 * Null unless Playwright e2e mode is on (NEXT_PUBLIC_E2E_MODE==='true',
 * its own check: the campaign resolver has no e2e arm) AND the
 * opt-in key holds exactly 'shadow' or 'enabled'. Either key alone, an
 * absent key, and any other value all fail closed, so a typo silently
 * leaves the process at 'off' rather than half-arming it.
 */
export function e2eCombatJournalAuthorityMode(): CombatJournalAuthorityMode | null {
  if (process.env.NEXT_PUBLIC_E2E_MODE !== 'true') return null;
  const requested = process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV];
  return ARMABLE_MODES.find((mode) => mode === requested) ?? null;
}

/**
 * The process-wide combat journal-authority mode before the jest
 * override is applied. Reads the production constant FIRST so a future
 * cutover flip stays one switch and cannot be weakened by an unset or
 * hostile environment; only when that constant is still 'off' does the
 * e2e fixture arm get a say.
 */
export function resolveCombatJournalAuthorityMode(): CombatJournalAuthorityMode {
  if (COMBAT_JOURNAL_AUTHORITY_MODE !== 'off') {
    return COMBAT_JOURNAL_AUTHORITY_MODE;
  }
  return e2eCombatJournalAuthorityMode() ?? 'off';
}
