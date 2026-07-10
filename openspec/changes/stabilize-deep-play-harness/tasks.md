# Tasks: stabilize-deep-play-harness

> Execution is **Codex-first and strictly sequential** — one bounded task at a time, each landing with its own verification before the next begins. Three of four task groups are test-harness-only; the one product-code touch (group 1) is env-gated. After any spec/validator edit, run oxfmt + the affected validator + its jest wrapper (formatter/oxfmt quote race). Pre-commit runs a full `next build` (~3-5 min) — commit via background shell.

## 1. e2e-only rate-limit isolation (429 flap)

- [x] 1.1 Add an exported `shouldBypassRateLimitForE2E()` predicate in `src/lib/api/security.ts` and consult it at the top of `rateLimit()` so a true result returns `{ ok: true }` before any bucket accounting. The predicate returns true only when `process.env.NEXT_PUBLIC_E2E_MODE === 'true'` AND `process.env.PLAYWRIGHT_E2E_RUN_ID` is truthy. Mirror the existing `src/pages/api/e2e/vault-identity.ts` env gate (minus the custom header — browser-initiated fetches carry none).
  - Files: `src/lib/api/security.ts` (and confirm `src/pages/api/multiplayer/auth/token.ts` inherits the guard through `rateLimit()`, no per-route edit needed)
  - Acceptance: with both env vars set, `rateLimit()` returns ok without incrementing the bucket for `multiplayer-auth-token`, match create, and vault unlock uniformly; with either unset, the 5/60s limiter behaves exactly as before
  - QA: `npm run typecheck` clean; a focused unit assertion (or node REPL) confirming the predicate's truth table
- [x] 1.2 Jest-safety guard. Grep the 429-asserting jest suites (`src/__tests__/api/securityBoundary.test.ts` and any sibling that asserts status 429 / "Too many requests") for `NEXT_PUBLIC_E2E_MODE` and `PLAYWRIGHT_E2E_RUN_ID`. Note: `src/__tests__/unit/api/e2eVaultIdentity.test.ts` is known to set `PLAYWRIGHT_E2E_RUN_ID`. If any 429-asserting suite sets BOTH env vars in shared setup, extend `shouldBypassRateLimitForE2E()` to also require `!process.env.JEST_WORKER_ID` so jest always exercises the real limiter.
  - Files: `src/lib/api/security.ts` (only if the jest env leaks the pair)
  - Acceptance: the 429-asserting suites stay green AND still hit the limiter (assertions execute, not vacuously skipped); document in the task note whether the `JEST_WORKER_ID` clause was needed and why
  - QA: `npm.cmd test -- --watchAll=false --runTestsByPath src/__tests__/api/securityBoundary.test.ts --runInBand` green (adjust path if the grep finds the 429 assertions elsewhere)

## 2. Deep-play Playwright project scoping (matrix contention)

- [x] 2.1 Add `testIgnore: ['**/ux-deep-play-audit.spec.ts', '**/ux-walkthrough-audit.spec.ts']` to the three responsive projects (`Mobile Chrome`, `Tablet Portrait`, `Tablet Landscape`) in `playwright.config.ts`. Leave the chromium project and the grep-gated `smoke` project untouched. Do NOT add an in-spec `browserName` skip (all four projects use the Chrome engine — it cannot distinguish them).
  - Files: `playwright.config.ts`
  - Acceptance: a bare `npx playwright test --list e2e/ux-deep-play-audit.spec.ts` lists 3 tests (chromium only), not 12; scripted entry points (`run-ux-walkthrough.mjs`, CI, `qc:`/`verify:` scripts — already `--project=chromium`) are unchanged
  - QA: `npx playwright test --list e2e/ux-deep-play-audit.spec.ts` shows 3 tests; `npx playwright test --list e2e/ux-walkthrough-audit.spec.ts` no longer multiplies across responsive projects

## 3. Hydration-aware guest-ledger observation (COOP-GUEST-LEDGER-LEAK false positive)

- [x] 3.1 Harden `observeGuestLedger` in `e2e/ux-deep-play-audit.spec.ts`. Replace the one-shot zero-wait `survivedReload` probe: after `page.reload()` + the title `expect`, (a) `await waitBrieflyForVisible(page.getByTestId('gm-ledger-player-only-view'), 10_000)` using the existing waiting helper; (b) take a one-shot count of `gm-ledger-control-plane` (and optionally the `gm-ledger-*-btn` testids) as a new `gmSurfaceAfterReload` sub-fact; (c) set `survivedReload = playerViewBack && gmSurfaceAfterReloadAbsent`. Add the new sub-fact to `GuestLedgerObservation` and to the `recordGuestLedgerFinding` summary string so a genuine post-reload authority flip stays distinguishable from a slow mount.
  - Files: `e2e/ux-deep-play-audit.spec.ts`
  - Acceptance: on a run where guest redaction holds, step 3 records `read-only=true`; a synthetic GM-control-plane-visible-after-reload condition still flips the finding to a leak
  - QA: journey-09 re-run records the guest ledger read-only with all redaction facts TRUE (see group 5)
- [x] 3.2 Harden the pre-reload 7-fact battery in the same `observeGuestLedger` block: gate the battery behind `waitBrieflyForVisible('gm-ledger-player-only-view')` before reading the 7 redaction facts, so a slow first mount cannot produce the mirror-image false positive (e.g. `notice=false`).
  - Files: `e2e/ux-deep-play-audit.spec.ts`
  - Acceptance: the 7 pre-reload facts are read only after the player-only view is visible; no product code change
  - QA: covered by the journey-09 re-run in group 5

## 4. Evidence-persistence policy (.gitignore negation ladder)

- [x] 4.1 Apply BOTH required `.gitignore` edits (git cannot re-include a file under an excluded parent — one edit alone is inert):
  - Line 185: change `/.sisyphus*` → `/.sisyphus?*` (still catches misplaced root artifacts; no longer matches the `.sisyphus` directory itself).
  - Line 174: replace `.sisyphus/` with the negation ladder from design.md D4 (re-includes `REVIEW.md`, `manifest.json`, `journeys/` for `ux-walkthrough`, and `*.md` + `*.json` for `playtest`; leaves per-journey screenshot dirs and `index.html` ignored).
  - Add a short comment block above the ladder explaining git's parent-directory-exclusion rule, so a future cleanup does not collapse it back to `.sisyphus/` and silently re-hide evidence.
  - Files: `.gitignore`
  - Acceptance: `git check-ignore -v` shows `REVIEW.md` / `manifest.json` / a `journeys/*.json` as NOT ignored (or attributes them to a `!`-negation line), while a `<run>/09-.../foo.png` screenshot and `index.html` remain ignored; `git status` lists only the text artifacts as untracked
  - QA: `git check-ignore -v` on one path of each class (REVIEW.md, manifest.json, journeys/*.json, a screenshot png, index.html); `git status --porcelain .sisyphus/evidence/`

## 5. Final verification

- [x] 5.1 Rate-limit jest compatibility confirmed: the 429-asserting suites are green and still exercise the limiter (group 1.2 acceptance), with the `JEST_WORKER_ID` clause added only if the grep proved the jest env leaks the pair.
  - QA: `npm.cmd test -- --watchAll=false --runTestsByPath src/__tests__/api/securityBoundary.test.ts --runInBand` (adjust path per group 1.2 grep)
- [x] 5.2 Project scoping confirmed: `npx playwright test --list e2e/ux-deep-play-audit.spec.ts` lists exactly 3 tests under chromium.
  - QA: `npx playwright test --list e2e/ux-deep-play-audit.spec.ts`
- [x] 5.3 Journey-09 re-run acceptance: run the two-client deep-play journey (chromium) back-to-back within one 60s window and confirm (a) no `HTTP 429` journey error appears on either run, and (b) step 3 records the guest GM ledger as `read-only=true` with the 7 redaction facts TRUE and `gmSurfaceAfterReload` absent.
  - QA: the deep-play-only walkthrough command scoped to journey-09 (chromium), run twice; inspect the run manifest / REVIEW.md for the absence of the 429 error and the corrected read-only finding
- [x] 5.4 Typecheck + lint + format clean across touched files: `npm run typecheck && npm run lint && npm run format:check`.
- [x] 5.5 `npx openspec validate stabilize-deep-play-harness --strict` passes, and each delta SHALL/MUST is backed by the verification anchors in design.md.
