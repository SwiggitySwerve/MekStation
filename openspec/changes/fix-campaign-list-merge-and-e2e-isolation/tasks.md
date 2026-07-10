# Tasks: fix-campaign-list-merge-and-e2e-isolation

> Execution is **strictly sequential** for ONE Codex worker — parallel agent
> fan-out has failed on this repo. Do the groups in order: 1 (product fix, with a
> failing-first jest test) → 2 (e2e isolation) → 3 (quick-play locators) →
> 4 (verification). Group 1 is the only one carrying a spec delta. **Do NOT touch
> `encounter-combat-continuity.spec.ts` — that regression is already fixed on
> main.** Pre-commit runs a full `next build` (~3–5 min) — commit via background
> shell. After any spec-delta edit run `oxfmt` (or `npm run format`) +
> `openspec validate --strict` (formatter/oxfmt quote race, design R3). Do NOT edit
> other change folders (`add-flow-audit-routines` is another session's).

## 1. Product fix — campaign list merge-dedupe (campaign-management)

- [x] 1.1 **Failing-first test.** Add a merge-dedupe test to the existing list-page
  suite (it already mocks `next/router`, `fetch`, and the three campaign stores).
  Extend `mockCampaignStoreState.campaign` to a store-only campaign object whose id
  is NOT in the mocked summaries, with `forces` and `missions` as `Map`s (or
  `{ size: n }` stand-ins — `campaignToEntry` reads `campaign.forces.size` /
  `campaign.missions.size`, design R2). Assert against the CURRENT XOR code:
  - a non-empty summaries fixture (e.g. `campaign-alpha`, `campaign-bravo`) PLUS an
    in-store campaign `campaign-local` (id absent from summaries) renders
    `campaign-card-campaign-alpha`, `campaign-card-campaign-bravo`, AND
    `campaign-card-campaign-local` — **this assertion fails today** (XOR hides the
    store card when summaries exist);
  - a summaries fixture that INCLUDES the in-store campaign's id renders exactly one
    card for that id (server summary wins — assert the summary's name/fields, not the
    store's);
  - an empty summaries fixture + an in-store campaign renders the store card
    (regression guard — must stay green through the fix).
  - Files: `src/__tests__/pages/gameplay/campaigns/index.multiCampaign.test.tsx`
    (extend; a new `index.merge.test.tsx` is also acceptable if cleaner).
  - Acceptance: the new merge assertions FAIL against the unmodified
    `index.tsx:110-115`; the empty-DB regression assertion passes.

- [x] 1.2 **Merge-dedupe implementation.** Replace the XOR at
  `src/pages/gameplay/campaigns/index.tsx:110-115` with a union: map
  `campaignSummaries` to entries, then include `campaignToEntry(campaign)` **iff**
  `campaign` is present AND its id is not already in `campaignSummaries`
  (`!campaignSummaries.some((s) => s.id === campaign.id)`). Preserve the existing
  reactive `campaign` subscription, the `summaryToEntry` / `campaignToEntry`
  helpers, the empty-state branch (`campaigns.length === 0`), and the
  `campaignListError` banner gate. Every card keeps its stable
  `data-testid={`campaign-card-${campaign.id}`}`.
  - Files: `src/pages/gameplay/campaigns/index.tsx`
  - Acceptance: the task 1.1 test is fully green; a store-only campaign renders a
    card whether or not the server DB is non-empty; a persisted-and-active campaign
    renders exactly one card sourced from the summary; no duplicate cards.
  - QA: `npm.cmd test -- --watchAll=false --runTestsByPath src/__tests__/pages/gameplay/campaigns/index.multiCampaign.test.tsx --runInBand`
    green; `npm run typecheck` clean.

## 2. E2E isolation — server-side cleanup + specific-card setup wait

- [x] 2.1 Wire the existing `deleteCampaign` fixture (`e2e/fixtures/campaign.ts:346-353`,
  issues `DELETE /api/campaigns/<id>`) into an `afterEach`/`finally` in each of the
  four persisting specs, deleting every campaign id the test persisted so each spec
  leaves the shared per-run SQLite DB clean. Track the created/persisted ids per test
  (or per describe) and delete them in cleanup; the cleanup MUST tolerate an
  already-deleted campaign (`try/catch`, and `deleteCampaign` already treats `404`
  as success) so it never turns a passing test red.
  - Files: `e2e/campaign-flow.spec.ts`, `e2e/campaign-subroute-recovery.spec.ts`,
    `e2e/campaign-starmap-logistics.spec.ts`, `e2e/campaign-customizer-handoff.spec.ts`
  - Acceptance: each of the four specs deletes its server-persisted campaign(s) after
    each test; running any of them leaves `GET /api/campaigns` with no leftover
    `E2E …` campaigns from that file.

- [x] 2.2 Tighten `campaign.spec.ts`'s Detail-Page `beforeEach` (currently
  `campaign.spec.ts:222-226`, waiting for **any** `[data-testid^="campaign-card-"]`)
  to wait for the **specific** `campaign-card-<campaignId>` created in that setup, so
  future pollution fails fast at the wait with a clear signal instead of passing on a
  stranger's card. Leave the existing `afterEach` `deleteCampaign` cleanup
  (`campaign.spec.ts:229-236`) in place.
  - Files: `e2e/campaign.spec.ts`
  - Acceptance: the Detail-Page `beforeEach` waits on the exact created id; the six
    previously-failing tests (`:75`, `:93`, `:243`, `:258`, `:282`, `:298`) no longer
    depend on pollution to pass.

## 3. Quick-play locators — track current labels (no product change)

- [x] 3.1 Update the "start battle" assertion (`quick-play.spec.ts:183-194`). The
  launch control is now three buttons (`QuickGameReview.tsx:386-409`):
  `watch-ai-battle-btn` / `interactive-skirmish-btn` / `start-game-btn` (relabeled
  "Auto-Resolve"). Replace `getByRole('button', { name: /start battle/i })` with
  `getByRole('button', { name: /auto-resolve/i })` (optionally also assert
  `getByTestId('watch-ai-battle-btn')` and `getByTestId('interactive-skirmish-btn')`);
  rename the test from "should show start battle button" to name the play options.
  Keep the `getByTestId('start-game-btn')` visibility assertion (`:189`) — that
  testid is unchanged.
  - Files: `e2e/quick-play.spec.ts`
  - Acceptance: the renamed test asserts the current labels and passes on the review
    screen.

- [x] 3.2 Disambiguate the "Turns Played" locator (`quick-play.spec.ts:227-236`). The
  results screen renders two "Turns Played" labels — Battle Statistics `<p>`
  (`QuickGameResultsSections.tsx`) and the `QuickGameResultExplanation` `<dt>`
  (added by `611daf06e`) — so `getByText(/turns played/i)` is a strict-mode
  violation. Fix by scoping to the Battle Statistics section, using `.first()`, or
  asserting `toHaveCount(2)` (mirroring `getAllByText('Turns Played')` already in
  `src/components/quickgame/__tests__/QuickGameResults.test.tsx`). Keep the
  `getByText(/battle statistics/i)` assertion. Rename the test if the assertion
  intent changes.
  - Files: `e2e/quick-play.spec.ts`
  - Acceptance: the auto-resolve statistics test passes with an unambiguous
    "Turns Played" assertion.

## 4. Verification

- [x] 4.1 Typecheck + lint + format clean across touched files:
  `npm run typecheck && npm run lint && npm run format:check`.
- [x] 4.2 Product-fix jest green: `npm.cmd test -- --watchAll=false --runTestsByPath
  src/__tests__/pages/gameplay/campaigns/index.multiCampaign.test.tsx --runInBand`.
- [x] 4.3 Targeted playwright — the six previously-failing `campaign.spec.ts` tests
  green locally: `npx playwright test e2e/campaign.spec.ts --project=chromium
  --workers=1` (all of `:75`, `:93`, `:243`, `:258`, `:282`, `:298` pass).
- [x] 4.4 Targeted playwright — the two previously-failing quick-play tests green
  locally: `npx playwright test e2e/quick-play.spec.ts --project=chromium
  --workers=1` (the renamed play-options test and the auto-resolve statistics test
  pass).
- [x] 4.5 **Pollution-gone proof (file order, single worker):** run
  `npx playwright test e2e/campaign-flow.spec.ts e2e/campaign.spec.ts
  --project=chromium --workers=1` **in this file order** — `campaign.spec.ts` MUST be
  green after `campaign-flow.spec.ts` has persisted-and-cleaned, proving the
  cross-file pollution that was red nightly is gone.
- [x] 4.6 `npx openspec validate fix-campaign-list-merge-and-e2e-isolation --strict`
  passes; the single ADDED `campaign-management` requirement carries backing jest +
  playwright evidence from tasks 1 and 4.

## 5. Scope addendum (orchestrator, 2026-07-10)

- [x] 5.1 Update the stale roster-text assertions in `e2e/campaign-flow.spec.ts` (~:114-117 and siblings): the spec expected "Light Mech"/"Atlas AS7-D" against a UI that now renders the representative-unit roster (Locust LCT-1V et al.). Same test-rot class as Group 3; discovered during the G4 file-order proof (7 pre-existing failures in the polluter spec — blocks nightly-green as surely as the pollution did). Pin the currently-rendered real values; no regex weakening.
  - Files: `e2e/campaign-flow.spec.ts`
  - Acceptance: the G4 file-order proof passes with BOTH specs green in file order
  - QA: `npx playwright test e2e/campaign-flow.spec.ts e2e/campaign.spec.ts --project=chromium --workers=1`
