/**
 * Gated-absent manifest of the GM two-player acceptance run (roadmap unit
 * U29): the data behind the requirement 'Acceptance Run Excludes Only
 * Named-Gate Rows' in the e2e-testing delta of
 * openspec/changes/harden-gm-two-player-campaign-sessions. This file only
 * lists; scripts/__tests__/gm-two-player-acceptance-gates.test.ts decides.
 *
 * Each catalogue id E2E-01..80 resolves exactly once: to its authored rows
 * (test titles carrying @E2E-NN in a spec file the runner's `all` plan runs),
 * to EXACT_MAIN_CONTRACT, or to one GATED_ABSENT entry. An id that gains a
 * row leaves GATED_ABSENT in the same change; the pin fails it as doubly
 * resolved until it does.
 */

// E2E-80 is proven by the exact-main regression ladder, not by a row.
const EXACT_MAIN_CONTRACT = Object.freeze({
  id: 'E2E-80',
  path: 'scripts/qc/validate-exact-main-regression-ladder.mjs',
});

// Gate tags a strict test.fail may carry, each with the holder whose change
// removes it (council 2026-09-21 decision 7; U25 ungates the rewind rows).
const NAMED_GATES = Object.freeze({
  '@until-journal-cutover': 'adopt-combat-journal-cutover-and-gm-rewind',
});

/** One frozen entry per id, all sharing a gate tag, a holder and a source. */
const absent = (ids, gateTag, holder, source) =>
  ids.map((id) => Object.freeze({ id, gateTag, holder, source }));

// Catalogue ids with no authored row, each named with the ledger holder of
// its tasks.md row (units.json on the baseline ae7b6fc80).
const GATED_ABSENT = Object.freeze([
  ...absent(
    ['E2E-33', 'E2E-35', 'E2E-36', 'E2E-37', 'E2E-38', 'E2E-39', 'E2E-45'],
    '@until-U54',
    'U54',
    'tasks.md 21.3; units.json U54 holds harden-gm-two-player-campaign-sessions#21.3@559',
  ),
  ...absent(
    [
      'E2E-46',
      'E2E-47',
      'E2E-48',
      'E2E-49',
      'E2E-50',
      'E2E-51',
      'E2E-52',
      'E2E-53',
      'E2E-54',
      'E2E-55',
      'E2E-56',
      'E2E-57',
      'E2E-58',
      'E2E-59',
      'E2E-60',
    ],
    '@until-DF-branch-and-time-cascade',
    'DF-branch-and-time-cascade (R6.B7)',
    'tasks.md 22.1; units.json DF-branch-and-time-cascade holds harden-gm-two-player-campaign-sessions#22.1@574',
  ),
  ...absent(
    ['E2E-64', 'E2E-65', 'E2E-67', 'E2E-68', 'E2E-69'],
    '@until-U52',
    'U52',
    'tasks.md 22.2; units.json U52 holds harden-gm-two-player-campaign-sessions#22.2@575',
  ),
]);

// Skip marks that cannot fire in the run: every plan buildRunPlan returns
// sets PLAYWRIGHT_E2E_RUN_ID, and each mark reads runId bound to it on the
// line above. `count` is exact; the pin fails on more or fewer.
const RUNNER_GUARDED_SKIPS = Object.freeze([
  Object.freeze({
    file: 'e2e/gm-two-player-cleanup-ownership.spec.ts',
    mark: "test.skip(!runId, 'sandbox fixture requires PLAYWRIGHT_E2E_RUN_ID')",
    count: 2,
    env: 'PLAYWRIGHT_E2E_RUN_ID',
  }),
]);

module.exports = {
  EXACT_MAIN_CONTRACT,
  GATED_ABSENT,
  NAMED_GATES,
  RUNNER_GUARDED_SKIPS,
};
