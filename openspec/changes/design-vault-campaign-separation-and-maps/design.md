# Design: Vault/Campaign Separation and the Campaign Map Experience

## Context

MekHQ, the domain reference, keeps everything inside one campaign save — no personal layer exists (`Campaign.java` owns `Person`/`Unit`; customs are campaign-scoped files; personnel cross saves only via one-shot `.prsx` export). MekStation deliberately departs from this: a personal vault of reusable content plus campaigns that instantiate it. The 2026-08-06 council (judge-VERIFIED, `openspec/council-decisions/2026-08-06-player-vault-vs-campaign-state.md`) established that the shipped code already implements most of the right model — pilots as reference-XOR-statblock roster entries with campaign-scoped progression, units as thin projections with combat state keyed separately — while one dead spec (`campaign-instances`, from the sole archived 2026-01-23 change) describes an incompatible snapshot model, and one fuzzy name/tonnage match violates the frozen D1 design. The strategic layer's travel already has preview plumbing (`travel-preview` command with `travelFeeCents`/`dailyCostCents` fields) but posts zero costs and zero time; opportunities do not exist; ground combat renders only on the 2D hex map. CAMP-PROOF's frozen contract digests pin today's roster shape until CAMP-01F/G/H land.

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
- A new artifact/asset pipeline or 3D engine dependency decision is deferred to implementation planning (see Open Questions).
- Any implementation before CAMP-01F/G/H merge.

## Decisions

- **D1 — Reference + provenance, never construction snapshots.** Campaign instances carry `unitRef`/`unitSource`/`sourceVersion` and cached display fields only. Rationale: mandated by the frozen `add-saved-custom-unit-campaign-roster` D1; preserves cross-campaign reuse; keeps coop payloads light; replay resolves stats by pinned version. Alternative (full snapshot per old `campaign-instances` spec) rejected: contract-forbidden, heavy migration, kills the vault's value.
- **D2 — Vault version counter is the `sourceVersion` producer.** Custom-unit (and pilot) saves publish monotonic versions; the vault's existing version history becomes addressable. Alternative (content-hash as version) considered: hashes identify but don't order; a counter gives "newer version available" semantics cheaply. Council/Momus precondition satisfied: the spec names its producer.
- **D3 — Membership and identity by id only.** The `UNIT_TEMPLATES` name/tonnage OR-match in `CreateCampaignPage.submit.ts:158-160` is deleted; root-force membership uses the minted instance id unconditionally. Rationale: D1 bans inference from names/tonnage; the current match silently omits off-template units.
- **D4 — Migration via the existing ladder.** `SerializedCampaign` v1→v2 rung defaults absent `unitSource` to `legacy(canonical)` per the D1 parser rule; present-unrecognized stays invalid/non-launchable. The ladder (`campaignMigration.ts:21-47`) is built for this. Forward-compat caveat: a v2 save read by a v1 build silently drops the new fields — release-note the one-way door.
- **D5 — Travel economy composes existing pipelines, no new systems.** Time flows through day-progression (so repairs/recovery/deadlines tick), money through campaign finances as itemized transactions, records through the campaign event log (seeded generator recorded for determinism). Alternative (a parallel "travel clock") rejected: two clocks desynchronize every per-day system.
- **D6 — Opportunities are offers, not missions.** An opportunity is a map-anchored, windowed offer whose acceptance materializes a contract through the existing mission-contracts flow. Rationale: contracts already own negotiation/mission lifecycles; opportunities only need spawn/expiry/anchor semantics. GM authoring rides the existing GM authority/redaction model.
- **D7 — Isometric as projection, hexes remain the coordinate system of record.** The isometric renderer consumes the same state as the 2D map; picking inverts the projection back to hex ids; overlays re-render the same data. "Easy" is honored by starting with flat-shaded extruded tiles + billboard/sprite tokens (no per-unit 3D models required); the renderer choice (extend the existing canvas stack vs a lightweight WebGL layer) is an implementation decision gated by the 30 FPS floor on 4v4 boards. Alternative (full 3D battlefield with camera freedom) rejected for this wave: cost and readability risk without gameplay gain.
- **D8 — Sequencing.** Spec lands now; implementation waves start after CAMP-01F/G/H (frozen digests pin the roster shape; any roster-field addition re-digests contracts in its own declared seam). Suggested implementation order: vault-campaign-boundary types+migration → starmap-travel-economy → starmap-interface surfaces → isometric-battlefield-view (independent, can parallelize with travel work).

## Risks / Trade-offs

- [Frozen CAMP digests vs `unitSource` field addition] → Implementation waits for F/G/H; the roster-field seam re-digests `camp01-authority-receipt.contract.mjs` deliberately, as its own reviewed change.
- [v2 saves opened by v1 builds silently lose provenance fields] → Migration rung plus release sequencing; document the one-way door; loader may stamp a min-reader version.
- [Random opportunities breaking coop determinism] → Seeded generator with the seed recorded in campaign events; generation occurs host-side only, mirrored to guests via the existing sync projections.
- [Isometric picking mismatch with hex truth] → Parity requirement with shared picking tests (same click → same hex id on both views); 2D map remains the fallback.
- [Travel economy makes existing zero-cost saves feel punitive retroactively] → Costs apply from the capability's enablement; existing campaigns keep their balance; preview-before-commit prevents surprise.
- [Scope creep toward a 3D engine] → D7 pins projection-only; any engine dependency requires its own proposal.

## Migration Plan

1. Spec-only merge (this change) — no runtime behavior changes.
2. Post-CAMP-01F/G/H: implement the boundary types + migration rung + fuzzy-match deletion as the first wave (contract re-digest included), then travel economy, then starmap surfaces, then isometric view. Each wave is its own OpenSpec-tasked change per repo convention.
3. Rollback: spec-only revert for (1); implementation waves roll back individually (migration rung is additive-defaulting, so v2→v1 data loss is confined to provenance fields).

## Open Questions

- Renderer substrate for the isometric view (extend current canvas vs lightweight WebGL such as PixiJS) — decide in the implementation wave against the FPS floor; a new dependency needs its own justification.
- Should generated opportunities exist in GM-hosted campaigns by default, or GM-only curation? (Spec allows both at GM discretion; default TBD with playtesting.)
- Mechanical cross-campaign progression remains explicitly deferred (council recommendation: cosmetic-only) — needs a user decision before any future spec.
