# Proposal: stabilize-deep-play-harness

## Why

The UX deep-play audit harness (`e2e/ux-deep-play-audit.spec.ts` + the `ux-walkthrough-audit` runner) is our primary evidence engine for live-play regressions, but four harness-level defects make its verdicts unreliable — a green run can hide a real blocker and a red run can flag a phantom one. Wave-3 scoping isolated four root causes, all in the harness rather than the product:

- **429 flap (harness-bug, P1).** The token route enforces a fixed in-memory rate limit of 5 requests / 60s keyed by route + client IP (`src/lib/api/security.ts`). Every Playwright context is `127.0.0.1`, so all journeys share one bucket, and the bucket `Map` is module-scoped in a dev server that Playwright reuses (`reuseExistingServer: true`). Back-to-back runs enter the second run with the window already partially spent; journey-09 alone mints 3+ tokens (host + guest contexts, lobby connect, match create), so two runs inside one 60s window exceed the cap and a 429 surfaces as a hard journey error — `"Lobby token mint failed with HTTP 429"` — not a finding. `resetApiRateLimitersForTests` exists but is jest-only; there is no e2e reset or bypass path.
- **COOP-GUEST-LEDGER-LEAK false positive (harness-bug, P2).** Journey-09 step 3 (`observeGuestLedger`) recorded the guest GM ledger as `read-only=false` — a `major` finding with id `COOP-GUEST-LEDGER-LEAK` — solely because its `survivedReload` sub-fact failed. All 7 redaction facts were TRUE; guest redaction held. `survivedReload` is a one-shot, zero-wait `isVisible()` fired immediately after `page.reload()`, racing React hydration + zustand-persist rehydration. `PageLayout` stamps `data-testid="page-title"` on the pre-hydration loading shell whose title is also `"GM Ledger"`, so the title `expect` passes on the SSR frame before the authority branch mounts — a timing coin-flip that fabricates an authorization leak.
- **4-project matrix contention (harness-bug, P2).** `playwright.config.ts` defines 4 unrestricted projects (chromium + 3 responsive). The deep-play spec's 3 tests carry no project restriction, so a bare `npx playwright test` schedules 12 deep-play tests with `fullyParallel: true` against ONE webServer, ONE durable SQLite pair, and the single IP-keyed 5/min bucket — guaranteed 429 storms and cross-test state interference. Worse, the spec forces `viewport 1440x1000` via `test.use`, so the 3 responsive runs are pixel-identical duplicates of chromium — pure waste with zero responsive coverage. Every scripted entry point already scopes to `--project=chromium`; only bare local runs hit the contention.
- **.sisyphus evidence not persisted (partial-adopt, P2).** Nothing under `.sisyphus/evidence/` is committed — two `.gitignore` rules both cover it (`.sisyphus/` at line 174 and `/.sisyphus*` at line 185). Review-grade text artifacts (`REVIEW.md`, `manifest.json`, `journeys/*.json`) are lost to reviewers and CI, while the 143 MB of screenshots that should stay ignored are treated identically. The premise "walkthrough runs are gitignored" is correct in spirit; the fix is a negation-ladder policy that commits the text and keeps the pixels ignored.

## What Changes

- **e2e-only server-side rate-limit isolation.** Under the Playwright harness env pair (`NEXT_PUBLIC_E2E_MODE === 'true'` AND `PLAYWRIGHT_E2E_RUN_ID` set — only ever set on the Playwright-launched server), the API KDF rate limiter bypasses uniformly across token mint, match create, and vault unlock, so back-to-back deep-play runs never flap on 429. The bypass never engages in production, in a manually-started dev server, or in the jest suites that assert real 429 behavior.
- **Declarative deep-play project scoping.** The deep-play and UX-walkthrough specs are scheduled under exactly one desktop (chromium) project via `testIgnore` on the 3 responsive projects in `playwright.config.ts`, so a bare `npx playwright test` no longer fans them out 4x into the shared webServer / DB / rate bucket. Scripted entry points are unchanged (already chromium-scoped).
- **Hydration-aware guest-ledger observation.** `observeGuestLedger` waits for the guest player-only view to become visible before probing, and `survivedReload` becomes a conjunction of (a) the player-only view reappearing after reload within a bounded wait AND (b) the GM control-plane surface being ABSENT after reload — so a slow mount is distinguished from a real guest-to-GM authority flip. The pre-reload 7-fact battery is hardened behind the same hydration wait so it cannot produce the mirror-image false positive. No product code changes.
- **Evidence-persistence policy.** A `.gitignore` negation ladder commits the review text (`REVIEW.md`, `manifest.json`, `journeys/*.json` for walkthrough; `*.md` + `*.json` for playtest) and keeps screenshots / videos / `index.html` ignored — requiring BOTH the ladder AND changing the catch-all root pattern `/.sisyphus*` → `/.sisyphus?*`, because git cannot re-include a file whose parent directory is excluded.

## Impact

- **Specs:** `journey-qc` (MODIFIED the two-client deep-play journey's read-only-ledger scenario to be hydration-aware + inverse-checked; ADDED a deep-play evidence-persistence requirement). `e2e-testing` (ADDED harness rate-limit isolation; ADDED deep-play Playwright project scoping).
- **Code (implementation wave, not this change):** `src/lib/api/security.ts`, `src/pages/api/multiplayer/auth/token.ts`, `playwright.config.ts`, `e2e/ux-deep-play-audit.spec.ts`, `.gitignore`, `scripts/qc/run-ux-walkthrough.mjs`. Jest compatibility check on the 429-asserting suites (`src/__tests__/api/securityBoundary.test.ts` and siblings).
- **Risk profile:** Low. Three of four items are test-harness-only; the one product-code touch (the rate-limit guard) is gated behind an env pair that only the Playwright webServer ever sets. The accepted trade-off is that e2e can no longer catch a real 429-handling UX regression (no journey asserts 429 today), and responsive deep-play captures are dropped (the `test.use` viewport override already made them meaningless).

## Scope

### In

- Server-side e2e rate-limit bypass (env-pair gated, jest-safe).
- `testIgnore` scoping of deep-play + walkthrough specs to chromium.
- Hydration-aware `observeGuestLedger` with inverse GM-surface sub-fact + hardened pre-reload battery.
- `.gitignore` negation-ladder evidence-persistence policy (both required edits).
- Jest compatibility verification for the 429-asserting suites; `playwright --list` and journey-09 re-run acceptance.

### Out

- Any change to the co-op transport, campaign authority, or the product-side `GET /api/campaigns/[id]` authorization gap (a separate latent architectural item the ledger-leak report flagged for its own scoping).
- Broadening responsive deep-play coverage (deferred; the viewport override makes it inert today).
- Server-side `lastSeq` tail replay / duplicate-event detection, the strict gameplay-proof portfolio, and the CI-cadence program (separate scoping items, explicitly not bundled here).

## Test Strategy

Three of four items are verified by the harness itself: the 429 fix by a back-to-back journey-09 re-run staying green, the project scoping by `npx playwright test --list e2e/ux-deep-play-audit.spec.ts` showing 3 tests (not 12), and the evidence policy by `git check-ignore -v` on one path of each class + `git status` showing only text artifacts untracked. The ledger-leak fix is verified by journey-09 recording `read-only=true` with the redaction battery still intact. The one product-code touch is guarded by confirming the jest 429-asserting suites still exercise the limiter (they must not set the bypass env pair, or the bypass predicate must additionally require absence of `JEST_WORKER_ID`).
