## 1. Regression coverage

- [x] 1.1 Record failing server-hydrate, campaign-switch, applied-guard, salvage-round-trip, and per-unit-error tests.
- [x] 1.2 Normalize battle state and share the applied guard without changing serialized formats.
- [x] 1.3 Surface partial errors through existing event and UI contracts without replaying committed effects.
- [x] 1.4 Deliberately discard the embedded processed ledger on hydrate and record the failing regression test, then restore the fix.

## 2. Validation and delivery

- [x] 2.1 Run focused suites, both TypeScript configs, lint:units and its Jest suite, root lint at or below 63 warnings, formatting, and OpenSpec validation.
- [ ] 2.2 Open one draft PR and report its head and hosted checks to Root. Only Root merges.

## Local evidence (2026-11-07)

Base: fetched origin/main `38f14080326540ce1a1137f828a9857c65f1aedd`.
The test-first run failed 13 tests across five suites before runtime edits.
The deliberate hydrate mutation replaced embedded processed IDs with an empty
array; the server-hydration regression failed on the missing `match-server` ID.
The mutation was removed before the final checks.

Final focused run: 13 suites, 188 tests passed, including
`scripts/__tests__/lint-units.test.ts`. Both TypeScript configs passed through
`npm run typecheck`. `npm run lint:units` passed at 17,084/17,085 findings;
no ceilings changed. Root lint reported 63 warnings and zero errors.
Changed-file `npx oxfmt --check`, strict validation of this change, and
`validate-openspec-ci-quality.mjs` passed. Hosted CI remains a delivery gate;
these local results do not establish a hosted CI result.
