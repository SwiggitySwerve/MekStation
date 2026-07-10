# Design: polish-command-surfaces-wave3

## Technical Approach

Three independent display/UX polish items over data and flows that already exist. None mutate a store, pipeline, or transport. Each is a single-surface change with its own jest coverage and can land in any order; the change is sequenced as three task groups plus a verification group for one Codex worker.

## Architecture Decisions

### Decision: D1 — Per-day cascade is a display-layer change over the existing `DayReport[]` (zero store/pipeline change)

**Choice**: Keep the entire day-advance pipeline untouched. `advanceDays()` already collects one `DayReport` per day (sync and async paths) and the dashboard hook already passes the full `DayReport[]` to `DayReportPanel`; the per-day date and event lists are present at render time and merely discarded when `reports.length > 1`. Extract the existing single-day body (costs grid / healed list / turnover / contracts) into a `DayReportDayBody` subcomponent, then in the `isMultiDay` branch keep the aggregate totals header AND render a collapsible per-day list mapping over `reports` keyed by `report.date`, compressing days with no events.

**Rationale**: The data contract is already per-day (the pipeline spec requires "7 DayReports … one for each day"); only the render aggregates. A display-only fix is the minimum that satisfies the audit finding, avoids any risk to the day pipeline, and is fully covered by a component test. The activity log already emits per-day entries, so no other surface needs to change.

**Spec obligation**: the current `day-progression` "Day Report Panel UI" requirement explicitly requires only the aggregate for week/month advances, so flipping the behavior without a spec delta would violate source-of-truth discipline. Hence a **MODIFIED** requirement, not a silent UI change.

**Guard**: a 30-day advance must default the per-day rows to collapsed / compress event-less days so the panel does not bloat; the aggregate header string is preserved verbatim as `` `Day Report — ${reports.length} days processed` `` (em dash), so existing tests asserting it stay valid because the aggregate is retained.

### Decision: D2 — Expose the merged map `UnitSearchService` already builds, rather than a second per-surface fetch

**Choice**: Add `getAllUnits(): readonly IUnitIndexEntry[]` and `getUnitById(id)` to `UnitSearchService`, returning entries from the merged canonical + custom map it already assembles in `initialize()` (canonical index ∪ `customUnitApiService.list()`, name = `${chassis} ${variant}`). Then `ForceDetailPage` seeds `allUnits` from that merged list instead of the canonical index only, and the pre-battle name hook resolves against the merged source.

**Rationale**: The correct combined source **already exists** inside the service but is private — surfacing it is strictly less code and less risk than each display surface independently re-querying `customUnitApiService.list()` and unioning it with the canonical index (duplicate fetch, duplicate merge logic, two places to drift). One accessor, two consumers, one merge.

**Constraints**: `initialize()` must be awaited before the accessor returns a populated map (its init latch already handles StrictMode double-mount); the pre-battle hook must keep its capture-tolerant behavior so a custom-unit API hiccup degrades to the existing `Slot N` placeholder rather than crashing.

### Decision: D3 — Minimal co-op onboarding variant (skip-notice + gated vault link), wizard parity deferred

**Choice**: Ship two contained affordances in `CampaignCoopEntryPanel.tsx`: (1) a static skip-notice under the Create Co-op button — "Creates a campaign with defaults (Mercenary faction, Standard preset, empty roster). Rename and configure from the campaign dashboard after creation."; (2) a `/settings#vault` link appended to the error notice **only** when the failing step is the vault-identity token mint, in both the create-error and join-error paths.

**Rationale**: The create-first ordering (the match POST needs the created campaign's authoritative state in its body) is what forced the one-click no-wizard flow; running the single-player 5-step wizard for co-op means handling create-before-POST ordering and created-but-unhosted rollback on POST failure — genuinely larger, and a follow-up. The minimal variant closes the two audit findings (undisclosed defaults, unhelpful identity errors) with zero flow restructuring.

**Gating**: only `mintToken` failures are identity-shaped. `resolveInviteCode` 404s and match-POST failures must keep generic copy, or the link trains users to change vault settings for network errors — so the link is bound to the token-mint step failing, not to any create/join error.

## Risks

- **R1 — Per-day panel bloat on long advances.** A 30-day advance with events on many days could still be long. Mitigation: collapse per-day rows by default and compress event-less days; the aggregate header remains the at-a-glance summary.
- **R2 — Accessor called before `initialize()`.** Returns an empty map → names fail to resolve. Mitigation: the accessors gate on `this.initialized` (task 2.1) and consumers await initialization. Note `initialize()` **rejects** when the custom-unit API is down (`customUnitApiService.list()` throws), and `ForceDetailPage`'s init effect has no catch today, so task 2.2 wraps the seeding to fall back to the canonical-index path and still flip `isInitialized(true)` rather than hang on `ForceLoadingState`; the pre-battle hook's existing swallow-to-placeholder path keeps a miss non-fatal.
- **R3 — Error-link mislabeling.** A `/settings#vault` link on a non-identity error misdirects the user. Mitigation: gate strictly to the token-mint step; keep generic copy for invite-lookup and match-POST failures.
- **R4 — Formatter/validator quote race.** Per repo memory, the double-quote formatter hook vs `oxfmt` single-quote can break token-matching QC validators. After the spec delta edits, run `oxfmt` + `openspec validate --strict`.
- **R5 — Stable data-testids.** The deep-play journeys assert the co-op testids (`create-coop-campaign-btn`, `create-coop-unavailable`, `join-coop-error`) and the day-advance testids (`advance-day-btn` / `day-advance-one-day`) — **not** the day-report panel's internal markup, so the per-day breakdown (task 1) is free to restructure the panel body. Keep those asserted ids stable so the GM-surfaces re-run stays green, and preserve the aggregate header string `` `Day Report — ${reports.length} days processed` `` verbatim (existing tests depend on it).
