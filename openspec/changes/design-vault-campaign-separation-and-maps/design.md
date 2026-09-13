# Design: Vault/Campaign Separation and the Campaign Map Experience

## Context

The 2026-08-06 council (openspec/council-decisions/2026-08-06-player-vault-vs-campaign-state.md) established a personal vault of reusable templates and campaign-owned instances. Current source uses thin source-aware roster projections and separate combat state; the old campaign-instances snapshot model requires reconciliation. D3 is a bounded source-verified prerequisite in `CreateCampaignPage.submit.ts` (former `UNIT_TEMPLATES` name/tonnage match absent; minted instance ids; parent evidence 2026-09-12) and remains a regression obligation, not package completion. Custom-unit `UnitRepository`/`VersionRepository` persist SQLite `current_version` and `unit_versions`; reuse that producer, do not add a second counter. `campaignMigration.ts` occupies schema v2 for authority metadata, so provenance must be a future compatible rung, not a v2 overwrite. `starmapTravelPreview` and `useCampaignStore.dayActions` calculate and commit travel days, fees, daily processing, projected funds, arrival and activity in source; they still need acceptance and authoritative-event work, not a second clock. `HexMapDisplay` provides SVG 2.5D isometric projection in source; complete picking/overlay/preference/perf acceptance rather than a new renderer. Source presence is not runtime or production authority: campaign journal authority remains disabled. CAMP frozen contracts still gate roster-shape implementation until F/G/H land.

## Goals / Non-Goals

**Goals:**
- One canonical statement of the vault/campaign boundary: immutable versioned templates → campaign instance copies with provenance (`unitRef`/`pilotId`, `unitSource`, `sourceVersion`).
- Screen/menu ownership per context, and a campaigns surface that can actually draw from the vault (fixing the dead-end index).
- Travel that costs time and money through the existing day-progression and finance pipelines, previewed before commit, replay-faithful.
- Opportunities as time-bound, location-anchored offers — GM-authored or seed-generated — resolving into the existing contracts flow.
- An isometric presentation of ground combat as a pure view over the hex model.

**Non-Goals:**
- Mechanical cross-campaign progression (vault lifetime records stay observational; separate future spec if wanted — council recommends cosmetic-only).
- Replacing the 2D tactical map (isometric is additive; 2D remains authoritative and the accessibility fallback).
- No new renderer, 3D-engine dependency, model-asset acquisition, second version counter, or production journal cutover is in this change.
- Any implementation before CAMP-01F/G/H merge.

## Decisions

- **D1 — Reference + provenance, never construction snapshots.** Campaign instances carry `unitRef`/`unitSource`/`sourceVersion` and cached display fields only. Rationale: mandated by the frozen `add-saved-custom-unit-campaign-roster` D1; preserves cross-campaign reuse; keeps coop payloads light; replay resolves stats by pinned version. Alternative (full snapshot per old `campaign-instances` spec) rejected: contract-forbidden, heavy migration, kills the vault's value.
- **D2 - Reuse the vault version producer.** Custom-unit sourceVersion must resolve through the existing UnitRepository producer and VersionRepository history/revert seam over SQLite current_version/unit_versions, without a second counter. Confirm index publication and pinned-version resolution. Pilot save/version authority is an unresolved admission decision; specify its producer before implementation. A monotonic version supports explicit newer-version prompts; no automatic campaign upgrade is implied.
- **D3 - Membership and identity by id only.** Bounded source-verified prerequisite in `CreateCampaignPage.submit.ts` (parent evidence 2026-09-12): the former `UNIT_TEMPLATES` name/tonnage match is absent, and root-force membership uses minted instance ids. Preserve explicit `unitRef`/`unitSource` and prohibit future name/tonnage inference. This remains a regression contract, not runtime-proof of the vault package; no new identity replacement is required.
- **D4 - Extend the existing migration ladder.** Schema v2 already owns campaign authority metadata. Admit a new v2-to-v3 provenance rung unless a separately reviewed compatible alternative is chosen; do not reuse or overwrite v2. Absent unitSource remains legacy canonical, present-unrecognized remains invalid/non-launchable. Preserve authority fields and existing v0/v1/v2 migrations, prove idempotent cold reload, and test older-reader behavior and explicit rollback compatibility. This is a planned admission decision, not a claim that v3 is implemented.
- **D5 - Extend the working travel pipelines.** Preserve current preview and commit calculations, day progression, fees, projected funds, arrival and activity. Complete authoritative commitment/arrival events and opportunity generation, expiry and contract acceptance so replay and co-op mirror the same facts. Use the existing finance and day processors; do not introduce a second clock or charge historical travel again.
- **D6 — Opportunities are offers, not missions.** An opportunity is a map-anchored, windowed offer whose acceptance materializes a contract through the existing mission-contracts flow. Rationale: contracts already own negotiation/mission lifecycles; opportunities only need spawn/expiry/anchor semantics. GM authoring rides the existing GM authority/redaction model.
- **D7 - Extend existing SVG 2.5D projection.** HexMapDisplay remains a view over the same hex, unit, terrain and facing state as 2D. Complete picking inversion, overlay identity, selection/pending-intent preservation and persisted preference contracts. Measure the 30 FPS floor on declared 4v4 standard boards, with 2D default/accessibility fallback and degradation before dropping required information. Evaluate the existing renderer first; replacement or a new dependency requires a separate justified proposal. Per-unit 3D models are not required.
- **D8 — Sequencing.** Spec lands now; implementation waves start after CAMP-01F/G/H (frozen digests pin the roster shape; any roster-field addition re-digests contracts in its own declared seam). Suggested implementation order: vault-campaign-boundary types+migration → starmap-travel-economy → starmap-interface surfaces → isometric-battlefield-view (independent, can parallelize with travel work).

## Risks / Trade-offs

- [Frozen CAMP digests vs `unitSource` field addition] → Implementation waits for F/G/H; the roster-field seam re-digests `camp01-authority-receipt.contract.mjs` deliberately, as its own reviewed change.
- [Occupied schema v2 and older-reader compatibility] - Preserve authority metadata, admit the next rung, and test migration/rollback instead of assuming provenance can be silently dropped. Pilot version authority must also be settled before its producer is implemented.
- [Random opportunities breaking coop determinism] → Seeded generator with the seed recorded in campaign events; generation occurs host-side only, mirrored to guests via the existing sync projections.
- [Isometric picking mismatch with hex truth] → Parity requirement with shared picking tests (same click → same hex id on both views); 2D map remains the fallback.
- [Existing travel balances and replay] - Preserve existing charges and balances; new events must not retroactively re-charge historical travel. Preview and commit must agree and rejection must leave state unchanged. Preview/commit source is not replay-authority proof.
- [Scope creep toward a 3D engine] → D7 pins projection-only; any engine dependency requires its own proposal.

## Migration Plan

1. Spec-only merge (this change) — no runtime behavior changes.
2. Post-CAMP-01F/G/H: implement the boundary types + the next compatible provenance rung and add regression coverage for the source-verified D3 identity seam as the first wave (contract re-digest included), then travel economy, then starmap surfaces, then isometric view. Each wave is its own OpenSpec-tasked change per repo convention. Do not treat v3 as already implemented.
3. Rollback: spec-only revert remains possible; each implementation wave needs its own verified data/reader compatibility. Do not assume a provenance downgrade is harmless or discard existing v2 authority metadata.

## Open Questions

- Does measured existing SVG 2.5D performance or parity expose a specific gap? Resolve that gap first; a renderer replacement needs a separate proposal and evidence. Pilot version producer and the next migration rung remain explicit implementation admission decisions.
- Should generated opportunities exist in GM-hosted campaigns by default, or GM-only curation? (Spec allows both at GM discretion; default TBD with playtesting.)
- Mechanical cross-campaign progression remains explicitly deferred (council recommendation: cosmetic-only) — needs a user decision before any future spec.
