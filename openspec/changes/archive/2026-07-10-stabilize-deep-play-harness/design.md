# Design: stabilize-deep-play-harness

## Context

Four independent harness defects surfaced during wave-3 deep-play scoping. They share one property — each corrupts the *evidence signal* rather than the product — so they are bundled into a single stabilization change. Two touch the Playwright execution environment (rate limiter, project matrix → `e2e-testing`); two touch the deep-play journey's observation and output (guest-ledger probe, evidence persistence → `journey-qc`). None changes co-op transport, campaign authority, or combat rules.

## Architecture Decisions

### Decision: D1 — e2e-only server-side rate-limit bypass, NOT a harness retry loop

**Choice**: In `src/lib/api/security.ts`, short-circuit the rate limiter when the Playwright harness env pair is present. Prefer an exported predicate `shouldBypassRateLimitForE2E()` consulted inside `rateLimit()` over an inline guard, so the condition is testable and reused if other limited routes appear. The predicate returns true only when `process.env.NEXT_PUBLIC_E2E_MODE === 'true'` AND `process.env.PLAYWRIGHT_E2E_RUN_ID` is set — the exact pair `playwright.config.ts` sets on its launched `webServer` and nowhere else.

**Rationale**:
- **Retry is worse than bypass here.** `Retry-After` can be up to the full 60s window remainder. Retry loops inside the 540s-budget journeys balloon wall time, must re-click UI buttons through error states, and would have to be replicated at every mint / create / unlock call site. The mint request is fired by the *app's own browser fetch* on a button click, so the harness cannot cleanly attach a per-request bypass header — an env-gated server guard is the only single-point fix.
- **One guard, uniform coverage.** A predicate in `rateLimit()` covers token mint, match create, and vault unlock identically, matching the "simplest solution + uniform application" bar rather than special-casing the token route.
- **Precedent exists.** `src/pages/api/e2e/vault-identity.ts` already gates e2e-only behavior on `NEXT_PUBLIC_E2E_MODE` + `PLAYWRIGHT_E2E_RUN_ID` (plus a header). This reuses the same env signal minus the header, because browser-initiated fetches carry no custom header.

**Alternatives rejected**:
- **Harness retry / backoff loop** — balloons wall time, per-callsite duplication, cannot attach headers to app-initiated fetches (above).
- **Raise the 5/60s cap** — masks the bucket-sharing root cause and still flaps at higher run cadence.
- **Per-context IP spoofing** — all Playwright contexts are `127.0.0.1` by construction; not controllable.

**Jest-safety constraint (must verify in implementation).** The scoping flagged as **UNVERIFIED** whether the 429-asserting jest suites (`src/__tests__/api/securityBoundary.test.ts` and siblings) set `NEXT_PUBLIC_E2E_MODE` / `PLAYWRIGHT_E2E_RUN_ID` globally. `src/__tests__/unit/api/e2eVaultIdentity.test.ts` is known to set `PLAYWRIGHT_E2E_RUN_ID`. If any 429-asserting suite sets *both* env vars in shared jest setup, the bypass would silently disable the limiter under jest and those assertions would vacuously pass. Mitigation: the implementer MUST grep the jest suites for both env vars; if the pair can leak, `shouldBypassRateLimitForE2E()` additionally requires `!process.env.JEST_WORKER_ID`, so jest always exercises the real limiter. Acceptance is that the 429-asserting suites stay green *and* still hit the limiter (not skipped).

**Accepted trade-off**: e2e can no longer catch a real 429-handling UX regression. Accepted — no journey asserts 429 behavior today. A stray local process started with both env vars would also skip limits; dev-only, negligible.

### Decision: D2 — Declarative project scoping via `testIgnore`, NOT an in-spec skip

**Choice**: Add `testIgnore: ['**/ux-deep-play-audit.spec.ts', '**/ux-walkthrough-audit.spec.ts']` to the three responsive projects (`Mobile Chrome`, `Tablet Portrait`, `Tablet Landscape`) in `playwright.config.ts`. The chromium project keeps the specs; the responsive projects drop them. Deep-play and its sibling walkthrough spec then run only under chromium regardless of how they are invoked.

**Rationale**:
- **In-spec `browserName` skip is unusable** — all four projects use the Desktop Chrome engine, so a `browserName`-based skip cannot distinguish them. The only in-spec restriction precedent in the repo (`tactical-map-visual-smoke.spec.ts`) is `browserName`-based and does not apply.
- **Matches the repo's existing pattern** of restricting at the *scheduling* level, not in-spec: the walkthrough runner already passes `--project=chromium --workers=1`, CI passes `--project=chromium`, and every `qc:`/`verify:` npm script does the same. Config-side scoping makes the bare `npx playwright test` path consistent with the scripted paths.
- **The responsive runs add zero coverage** — the deep-play spec forces `viewport 1440x1000` via `test.use`, overriding every project viewport, so the 3 responsive runs are pixel-identical to chromium.

**Alternatives rejected**:
- **`test.describe.configure` / tag-gating in-spec** — more surface, and still needs the config to know the tag; the runner already selects by project.
- **Leave as-is and rely on scripts** — bare local `npx playwright test` remains a footgun that 429-storms and interferes across the shared DB.

**Accepted trade-off**: if a future wave wants genuine responsive deep-play captures, the `testIgnore` must be lifted per-wave (documented). Today the `test.use` viewport override makes responsive runs meaningless anyway. `testIgnore` also silently drops these specs from any hypothetical future workflow assuming all specs run in all projects — low risk, since every existing entry point already scopes to chromium.

### Decision: D3 — Hydration-aware observation with an inverse GM-surface check, NOT a bare wait

**Choice**: In `observeGuestLedger` (`e2e/ux-deep-play-audit.spec.ts`), after `page.reload()` + the title `expect`: (1) `await waitBrieflyForVisible(page.getByTestId('gm-ledger-player-only-view'), 10_000)` using the existing waiting helper; (2) take a one-shot count of `gm-ledger-control-plane` (and optionally the `gm-ledger-*-btn` testids) as a new `gmSurfaceAfterReload` sub-fact; (3) `survivedReload = playerViewBack && gmSurfaceAfterReloadAbsent`. Add the new sub-fact to `GuestLedgerObservation` and the `recordGuestLedgerFinding` summary string. Harden the pre-reload 7-fact battery the same way — gate it behind `waitBrieflyForVisible('gm-ledger-player-only-view')` since it carries the identical latent race.

**Rationale**:
- **A bare wait alone could mask a real regression** — if the GM control plane appeared for a guest after a delay, waiting only for *something* to render would hide it. Pairing the wait with an explicit assertion that the GM control-plane surface is ABSENT keeps genuine authority-flip leak detection intact while removing the pre-hydration false positive.
- **The pre-hydration shell is the exact trap** — `PageLayout` stamps `data-testid="page-title"` on the loading shell whose title is also `"GM Ledger"`, so the title `expect` passes before hydration flips `isClient` and mounts the authority branch. The one-shot `isVisible()` races that window; a hydration-anchored wait removes the race.
- **No product code change** — the product-side reload survival is real (zustand persist round-trips `coopSession` mode:'guest'; `preserveGuestCoopSession` keeps guest mode on the server-refresh; a jest regression already covers it). This is purely an observation-timing fix in the harness.

**Alternatives rejected**:
- **Poll-and-hope longer sleep** — non-deterministic, still one-shot at the end, and hides delayed flips.
- **Assert on the persisted store directly** — would bypass the rendered-UI honesty bar the deep-play journeys hold; the observation must read what the user sees.

**Out-of-scope note carried forward**: the report flagged a *separate, latent* product-side caveat — campaign authority is client-resident and `GET /api/campaigns/[id]` serves the full record with no authorization, and `resolveCampaignAuthorityFromSession` fail-opens to GM when `coopSession` is absent — so a guest on a cleared-storage device hitting the direct gm-ledger URL could load the host's record and render full GM controls. This run never exercised that path (storage intact). It is NOT fixed here; it deserves its own scoping item and MUST NOT be silently folded into this harness change.

### Decision: D4 — Double `.gitignore` edit is mandatory (git's parent-directory-exclusion rule)

**Choice**: Persist review text, keep pixels ignored, via TWO edits that are BOTH required:
1. **Line 185**: change `/.sisyphus*` → `/.sisyphus?*`. Still catches misplaced root artifacts (e.g. `.sisyphus-foo.png`), but no longer matches the `.sisyphus` directory itself — the `?` requires at least one character after `.sisyphus`, so the bare directory name escapes the catch-all and its child negations can take effect.
2. **Line 174**: replace `.sisyphus/` with a negation ladder that re-includes only the text artifacts:
   ```gitignore
   .sisyphus/*
   !.sisyphus/evidence/
   .sisyphus/evidence/*
   !.sisyphus/evidence/ux-walkthrough/
   .sisyphus/evidence/ux-walkthrough/*
   !.sisyphus/evidence/ux-walkthrough/*/
   .sisyphus/evidence/ux-walkthrough/*/*
   !.sisyphus/evidence/ux-walkthrough/*/REVIEW.md
   !.sisyphus/evidence/ux-walkthrough/*/manifest.json
   !.sisyphus/evidence/ux-walkthrough/*/journeys/
   !.sisyphus/evidence/playtest/
   .sisyphus/evidence/playtest/*
   !.sisyphus/evidence/playtest/*/
   .sisyphus/evidence/playtest/*/*
   !.sisyphus/evidence/playtest/*/*.md
   !.sisyphus/evidence/playtest/*/*.json
   ```

**Rationale**:
- **git's hard rule**: *"It is not possible to re-include a file if a parent directory of that file is excluded."* A single directory-level `.sisyphus/` (line 174) OR the catch-all `/.sisyphus*` (line 185) excludes the parent, so any `!`-negation of a child is inert. Both edits are needed: the ladder re-includes children *and* line 185 must stop matching the directory so the ladder's parent negations are honored.
- **Per-journey screenshot dirs stay ignored** — paths like `<run>/09-coop-.../foo.png` are matched by the depth-4 `*/*` exclude and never negated. `journeys/*.json` re-includes because its parent dir is negated and a gitignore `*` does not cross `/`.
- **Commit text, ignore pixels** — `REVIEW.md`, `manifest.json`, `journeys/*.json` (written by `run-ux-walkthrough.mjs`) are review-grade and small; the 143 MB of screenshots stay out of git.

**Alternatives rejected**:
- **Collapse to a single rule / drop line 185** — breaks the misplaced-root-artifact catch and, alone, cannot re-include children under an excluded parent.
- **Force-add text files with `git add -f` per run** — manual, unenforced, and not a durable policy.

**Accepted trade-offs / guardrails**:
- Every future run auto-stages its `REVIEW.md`/`manifest.json` — the repo accretes small text files (10+ run dirs already exist on disk). Companion convention: prune superseded run dirs or commit only reviewed runs. A short comment block above the ladder MUST explain git's parent-dir rule so a future "cleanup" collapsing the ladder back to `.sisyphus/` does not silently re-hide evidence.
- The 36 legacy tracked `.sisyphus` files stay tracked (tracked files bypass gitignore) — no behavior change.

## Verification Anchors

| Item | Command / check | Pass condition |
|---|---|---|
| 429 bypass | back-to-back journey-09 re-run | both runs green; no `HTTP 429` journey error |
| 429 jest-safety | grep 429-asserting suites for env pair; run them | suites green AND still hit the limiter (not vacuously skipped) |
| project scoping | `npx playwright test --list e2e/ux-deep-play-audit.spec.ts` | 3 tests listed, not 12 |
| ledger-leak | journey-09 step 3 record | `read-only=true`; 7 redaction facts TRUE; `gmSurfaceAfterReload` absent |
| evidence policy | `git check-ignore -v` per path class + `git status` | only `REVIEW.md`/`manifest.json`/`journeys/*.json` untracked; screenshots ignored |
| change validity | `npx openspec validate stabilize-deep-play-harness --strict` | passes |
