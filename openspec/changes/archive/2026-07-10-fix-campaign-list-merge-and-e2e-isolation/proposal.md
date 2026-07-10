# Proposal: fix-campaign-list-merge-and-e2e-isolation

## Why

The `campaign.spec.ts` family fails every nightly (6 tests × 3 attempts ≈ 18 log
mentions) and `quick-play.spec.ts` fails 2 tests nightly. Triage traced these to
one real product bug plus test-isolation and locator rot — all independently
verified with file:line evidence.

- **Campaign list XOR (real UX bug + test failures).** `src/pages/gameplay/campaigns/index.tsx:110-115`
  renders server summaries **exclusively-or** the in-store campaign:
  `campaignSummaries.length > 0 ? campaignSummaries.map(summaryToEntry) : campaign ? [campaignToEntry(campaign)] : []`.
  Once the server database holds any campaign, a store-only (unsaved) campaign is
  invisible on the list. This is a genuine user-facing bug: a player with saved
  campaigns who creates a new unsaved one never sees it appear. It is also the
  root cause of six failing `campaign.spec.ts` tests — those create a store-only
  campaign via `createTestCampaign`, which under a polluted shared server DB
  (the summaries win the XOR) never renders the expected `campaign-card-<id>`.
  The merge-dedupe fix closes both the UX gap and the test failures.

- **E2E server-side pollution (test isolation).** Four specs persist campaigns to
  the per-run shared SQLite DB with **no server-side cleanup**: `campaign-flow`,
  `campaign-subroute-recovery`, `campaign-starmap-logistics`, and
  `campaign-customizer-handoff`. With `workers: 1` on CI, file order runs these
  before `campaign.spec.ts` (hyphen `0x2D` sorts before dot `0x2E`), so
  `campaign.spec` runs against a DB polluted by other files' leftover campaigns.
  The `deleteCampaign` fixture already exists (`e2e/fixtures/campaign.ts:346-353`,
  it issues `DELETE /api/campaigns/<id>`) but is not wired into these four specs.

- **Quick-play locator rot.** `e2e/quick-play.spec.ts` (untouched since 2026-05-10)
  asserts a `/start battle/i` button that no longer exists — commit `036bc798a`
  split launch into **Watch AI Battle / Interactive Skirmish / Auto-Resolve** and
  relabeled `start-game-btn` from "Start Battle" to "Auto-Resolve". Separately,
  commit `611daf06e` added `QuickGameResultExplanation.tsx`, which renders a second
  "Turns Played" label on the results screen, making the spec's ambiguous
  `getByText(/turns played/i)` a strict-mode violation. (The jest unit test was
  already updated to `getAllByText('Turns Played')` for the known duplication; only
  the e2e spec lagged.)

## What Changes

- **Product fix (campaign list merge-dedupe).** Replace the XOR at
  `src/pages/gameplay/campaigns/index.tsx:110-115` with a merge: map
  `campaignSummaries` to entries, then include the in-store campaign **iff** its id
  is absent from the summaries (dedupe by id, **server summary wins** on collision).
  This makes a store-created campaign visible regardless of server DB state, and is
  authorized by a new `campaign-management` requirement.

- **E2E isolation hardening.** Add server-side cleanup (the existing
  `deleteCampaign` fixture, in an `afterEach`/`finally`) to the four persisting
  specs. Tighten `campaign.spec.ts`'s Detail-Page `beforeEach` (currently waits for
  **any** `campaign-card-*`, `campaign.spec.ts:222-226`) to wait for the **specific**
  `campaign-card-<id>`, so future pollution fails fast at setup with a clear signal.

- **Quick-play locators.** Update the `/start battle/i` assertion for the
  three-action relabel (assert `Auto-Resolve` and the two new option buttons),
  disambiguate the "Turns Played" locator on the results screen, and rename the
  affected tests to match the current labels.

## Scope

### In

- `campaign-management` — ADDED "Campaign List Merges Server And Local Sources"
  requirement.
- Product code: `src/pages/gameplay/campaigns/index.tsx` (merge-dedupe only).
- Failing-first jest coverage for the merge on the list page, plus updated e2e
  isolation and quick-play specs.

### Out (Non-goals)

- **The `encounter-combat-continuity.spec.ts` regression is NOT in scope — it is
  already fixed on main.** Commit `611daf06e` (2026-07-05) restored the
  `WithdrawalTrailingActions` / `ConcedeButton` wiring in the action dock slot and
  pinned it with e2e assertions; nightlies from 2026-07-06 onward show zero
  failures for that spec. No action is taken on it here.
- **No new spec-delta for the e2e/quick-play changes.** Those are test-infrastructure
  and locator corrections — they assert existing, intentional product behavior and
  introduce no new product contract, so they carry no spec delta.
- **No changes to the campaign list's data sources, the `/api/campaigns` route, the
  campaign store, or the persistence pipeline** — the fix is a render-time merge over
  data that already flows into the component.
- **No new capability folders.** The merge behavior extends the existing
  `campaign-management` list-surface contract.

## Impact

- Affected specs: `campaign-management` (ADDED one requirement).
- Affected code (indicative — the worker confirms exact paths):
  - `src/pages/gameplay/campaigns/index.tsx` (merge-dedupe)
  - `src/__tests__/pages/gameplay/campaigns/index.multiCampaign.test.tsx` (merge test)
  - `e2e/campaign-flow.spec.ts`, `e2e/campaign-subroute-recovery.spec.ts`,
    `e2e/campaign-starmap-logistics.spec.ts`, `e2e/campaign-customizer-handoff.spec.ts`
    (server-side cleanup)
  - `e2e/campaign.spec.ts` (specific-card `beforeEach`)
  - `e2e/quick-play.spec.ts` (locators + test renames)
- Risk: low — the product change is a render-time list merge; the rest are test
  corrections. The merge preserves the reload-consistent behavior (server summaries
  remain authoritative for persisted campaigns), and the isolation/locator changes
  only make the nightly deterministic against current UI.
