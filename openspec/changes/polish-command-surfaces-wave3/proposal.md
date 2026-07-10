# Proposal: polish-command-surfaces-wave3

## Why

Three residual command-surface polish items surfaced by the wave-3 deep-play audit are all **display / UX-layer only** — none touch a store, pipeline, or transport, and each is independently shippable and verifiable. Bundling them keeps one small sequential change rather than three near-empty ones:

- **GM-TIME-CASCADE** — advancing multiple days (Advance Week / Advance Month) shows only an aggregate summary. The per-day data is fully intact: `advanceDays()` collects one `DayReport` per day and `DayReportPanel` receives the whole array — the panel just collapses everything into one aggregate when `reports.length > 1`, discarding per-day identity that is already present at render time. This is a **spec gap**, not a code bug: the `day-progression` "Day Report Panel UI" requirement explicitly requires only the aggregate, so the current behavior is spec-compliant and the missing per-day breakdown must be authorized by a spec delta before the display changes.
- **ForceCard custom-unit names** — force display surfaces resolve unit names from the canonical index only, so custom units (ids `custom-*`, which live in SQLite/IndexedDB and never in the static canonical JSON) miss the name map. The pre-battle force card falls back to a `Slot N` placeholder, and the force detail page renders an assigned custom unit as an empty `+ Select Unit` slot (misrepresenting assignment state). `UnitSearchService` already builds the correct merged canonical + custom map during `initialize()` but exposes no accessor for it — a **product bug** fixable by surfacing that existing merged map.
- **M5 co-op onboarding** — co-op campaign creation one-clicks with hardcoded defaults (Mercenary faction, Standard preset, empty roster) with no notice that name/faction/preset were defaulted, and vault-identity mint failures render as raw error strings with no affordance pointing at vault settings even though `/settings#vault` already deep-links there. A **spec gap**; the minimal variant (static skip-notice + gated vault-settings link) is scoped for this wave, with wizard parity deferred.

## What Changes

- **Per-day breakdown in the day report** — `DayReportPanel` keeps the aggregate totals for a multi-day advance AND adds a collapsible per-day list (each day's date, costs, healed personnel, expired contracts, turnover departures), compressing event-less days so a 30-day advance does not render 30 empty sections. Display-layer only; the per-day `DayReport[]` already flows to the component. Authorized by a MODIFIED `day-progression` requirement.
- **Merged unit lookup for names** — `UnitSearchService` exposes `getAllUnits()` / `getUnitById()` returning the merged canonical + custom index it already builds. `ForceDetailPage` and the pre-battle force-card name hook resolve assigned unit names (including `custom-*` ids) through that merged source, so custom units render their chassis + variant name and their assignment state, and appear in the assignable-unit picker.
- **Co-op creation onboarding affordances** — a static skip-notice under the Create Co-op button disclosing the applied defaults, and a link to `/settings#vault` on token-mint (vault-identity) failure, gated to the identity step so non-identity errors (invite lookup, match POST) keep generic copy.

## Scope

### In

- `day-progression` — MODIFIED "Day Report Panel UI" requirement (per-day breakdown alongside the aggregate).
- `unit-services` — ADDED merged-lookup accessor on `UnitSearchService`.
- `force-management` — ADDED custom-unit name resolution in force display surfaces.
- `coop-campaign-sync` — ADDED co-op creation onboarding affordances (skip-notice + gated vault-settings link).
- Jest coverage for each item and a GM-surfaces walkthrough re-run as acceptance.

### Out (Non-goals)

- **No store, pipeline, or transport changes.** The per-day `DayReport[]`, the merged unit map, and the co-op create flow all already exist — this wave is display/UX wiring on top of them.
- **Co-op create wizard parity** — running the single-player 5-step wizard for co-op is deferred as a follow-up (the create-before-match-POST ordering and failure rollback make it larger than this wave). Only the minimal skip-notice + error-link variant lands here.
- **Custom-unit BV / picker economics, roster editing, and any name-resolution outside the two named force-display surfaces** — untouched.
- **The other wave-3 items** (deep-play harness stabilization, co-op battle reconciliation routing, campaign economy reconciliation) — separate changes.

## Impact

- Affected specs: `day-progression` (MODIFIED), `unit-services` (ADDED), `force-management` (ADDED), `coop-campaign-sync` (ADDED).
- Affected code (indicative — the worker confirms exact paths):
  - `src/components/campaign/DayReportPanel.tsx`
  - `src/services/units/UnitSearchService.ts`, `src/components/gameplay/pages/forces/detail/ForceDetailPage.tsx`, `src/components/gameplay/pages/PreBattlePage.sections.tsx`
  - `src/pages-modules/gameplay/campaigns/CampaignCoopEntryPanel.tsx`
- Risk: low — pure display/UX changes over data that already flows. Watch the capture-tolerant degrade paths (custom-unit API hiccup → existing placeholder, not a crash) and the error-link gating (only the identity step, never network/match-POST errors).
