/**
 * Two-key law for the combat journal-authority fixture resolver (U15a).
 *
 * The combat mode is the literal 'off' in matchJournalAuthority.ts with
 * only a jest-scoped override, so an e2e process had no way to arm it.
 * This pin is the law of the arm that fixes that: BOTH
 * NEXT_PUBLIC_E2E_MODE==='true' and an explicit mode key holding exactly
 * 'shadow' or 'enabled'. Either key alone, or any other value, is 'off'.
 *
 * Predicted red before the resolver existed: the import of
 * '../combatJournalAuthorityEnabled' fails because the module has no
 * such file. Predicted red after a stub whose resolver always answers
 * 'off': every armed expectation ('shadow', 'enabled', and the getter
 * following the arm) fails, while the four fail-closed expectations
 * already pass, because a stub that never arms is trivially closed.
 */

import {
  COMBAT_JOURNAL_AUTHORITY_E2E_ENV,
  e2eCombatJournalAuthorityMode,
  resolveCombatJournalAuthorityMode,
} from '../combatJournalAuthorityEnabled';
import {
  COMBAT_JOURNAL_AUTHORITY_ENABLED,
  COMBAT_JOURNAL_AUTHORITY_MODE,
  _setCombatJournalAuthorityModeForTests,
  getCombatJournalAuthorityMode,
} from '../matchJournalAuthority';
import { resolveBootstrapJournalAuthority } from '../ServerMatchHost';

describe('combat journal-authority e2e arm', () => {
  const savedE2eMode = process.env.NEXT_PUBLIC_E2E_MODE;
  const savedArm = process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV];

  afterEach(() => {
    // Restore BOTH keys and the jest override so no later suite in this
    // process inherits the arm. The arm is process-wide by design.
    restoreEnv('NEXT_PUBLIC_E2E_MODE', savedE2eMode);
    restoreEnv(COMBAT_JOURNAL_AUTHORITY_E2E_ENV, savedArm);
    _setCombatJournalAuthorityModeForTests(null);
  });

  it('keeps the production constant at off so this unit is the arm, not the cutover', () => {
    // Falsification: expect(COMBAT_JOURNAL_AUTHORITY_MODE).toBe('enabled')
    expect(COMBAT_JOURNAL_AUTHORITY_MODE).toBe('off');
    expect(COMBAT_JOURNAL_AUTHORITY_ENABLED).toBe(false);
  });

  it('refuses the mode key alone', () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'false';
    process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV] = 'enabled';
    expect(e2eCombatJournalAuthorityMode()).toBeNull();
    expect(resolveCombatJournalAuthorityMode()).toBe('off');
  });

  it('refuses e2e mode alone', () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    delete process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV];
    expect(e2eCombatJournalAuthorityMode()).toBeNull();
    expect(resolveCombatJournalAuthorityMode()).toBe('off');
  });

  it('arms shadow when both keys agree on shadow', () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV] = 'shadow';
    expect(e2eCombatJournalAuthorityMode()).toBe('shadow');
    expect(resolveCombatJournalAuthorityMode()).toBe('shadow');
  });

  it('arms enabled when both keys agree on enabled', () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV] = 'enabled';
    expect(e2eCombatJournalAuthorityMode()).toBe('enabled');
    expect(resolveCombatJournalAuthorityMode()).toBe('enabled');
  });

  it('refuses an unknown value, including the plausible ones', () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    for (const value of ['on', '1', 'true', 'off', 'ENABLED', '']) {
      process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV] = value;
      expect(e2eCombatJournalAuthorityMode()).toBeNull();
      expect(resolveCombatJournalAuthorityMode()).toBe('off');
    }
  });

  it('follows the arm through getCombatJournalAuthorityMode when no override is set', () => {
    _setCombatJournalAuthorityModeForTests(null);
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV] = 'shadow';
    expect(getCombatJournalAuthorityMode()).toBe('shadow');

    process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV] = 'enabled';
    expect(getCombatJournalAuthorityMode()).toBe('enabled');

    delete process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV];
    expect(getCombatJournalAuthorityMode()).toBe('off');
  });

  it('lets the jest override beat the arm in both directions', () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV] = 'enabled';
    _setCombatJournalAuthorityModeForTests('off');
    expect(getCombatJournalAuthorityMode()).toBe('off');

    delete process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV];
    _setCombatJournalAuthorityModeForTests('enabled');
    expect(getCombatJournalAuthorityMode()).toBe('enabled');
  });

  it('derives the host bootstrap default from the getter, not the constant', () => {
    // The expression this asserts is the one that lived inline at
    // ServerMatchHost.ts:452 as `?? COMBAT_JOURNAL_AUTHORITY_ENABLED`.
    // With the constant hardcoded false, only a getter read can ever
    // answer true here.
    _setCombatJournalAuthorityModeForTests('enabled');
    expect(resolveBootstrapJournalAuthority(undefined)).toBe(true);

    _setCombatJournalAuthorityModeForTests('shadow');
    expect(resolveBootstrapJournalAuthority(undefined)).toBe(false);

    _setCombatJournalAuthorityModeForTests(null);
    process.env.NEXT_PUBLIC_E2E_MODE = 'true';
    process.env[COMBAT_JOURNAL_AUTHORITY_E2E_ENV] = 'enabled';
    expect(resolveBootstrapJournalAuthority(undefined)).toBe(true);
  });

  it('lets an explicit bootstrap request win over the arm in both directions', () => {
    _setCombatJournalAuthorityModeForTests('enabled');
    expect(resolveBootstrapJournalAuthority(false)).toBe(false);

    _setCombatJournalAuthorityModeForTests('off');
    expect(resolveBootstrapJournalAuthority(true)).toBe(true);
  });
});

/** Restores one process env key, deleting it when it was unset. */
function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
