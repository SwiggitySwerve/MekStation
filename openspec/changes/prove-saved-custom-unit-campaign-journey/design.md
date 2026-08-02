## Context

CAMP-01A through CAMP-01G establish source identity, persistence, fail-closed launch, and Mech Bay resolution. Final acceptance still needs independent session evidence, a real canonical battle, durable post-battle state, and honest reconciliation of gameplay findings.

This child implements the frozen CAMP-01H `journey-qc` delta. It consumes PROOF-02 triage/repairs plus CAMP-01G cleanup and never expands custom-unit combat support.

## Goals / Non-Goals

**Goals:**

- Bind three independent session witnesses to one exact-main parent run.
- Prove the custom path through readiness blocking and the canonical path through combat and cold-reloaded post-battle persistence.
- Capture experience positives and categorized findings with complete Critical/Major disposition.

**Non-Goals:**

- Custom combat adaptation, screenshot-only authority, or implementation inside an audit observation.

## Decisions

### D1. Three independent witnesses own the journey

The writer SHALL issue exactly three pairwise-distinct child execution ids and require fresh browser-context ids for `custom-save-reload`, `campaign-mech-bay-readiness`, and `canonical-combat-post-battle`. Every witness shares the parent run id but owns a disjoint durable report-digest set and non-empty route, API, store, persistence, navigation, and cold-reload evidence in a final receipt.

Entity and campaign ids may match across witnesses to prove continuity. Child execution ids, browser contexts, or report evidence may not be reused. Global booleans and screenshots cannot replace witness facts.

### D2. Custom remains blocked while canonical combat proves playability

The custom witnesses SHALL preserve the saved-design, roster-instance, campaign, and mission identities through save, reload, Mech Bay, and readiness. Attempting to launch the unsupported custom row SHALL remain visibly blocked before encounter/session side effects.

The canonical witness SHALL select an admitted stock unit, launch a real server session, show and accept a player combat command, survive session navigation and reload, observe a terminal result, return to campaign, accept a post-battle consequence, and cold reload that consequence. The saved custom design remains unchanged and is not substituted into combat.

### D3. Authority and experience evidence remain distinct

`session-authority-map.json`, witness authority reports, and `combat-authority.json` prove system state. Per-witness experience reports and `audit-reconciliation.json` record at least one positive and categorize findings as confirmed defects, inferred risks, coverage gaps, or environment limits across desktop, mobile, accessibility, visibility, feedback, recovery, cognitive load, playability, and enjoyment.

Every reproducible Critical/Major finding SHALL have a verified focused repair or explicit external blocker. Lower-severity work remains ranked. Screenshots prove presentation only and retain no authority beyond their guarded capture attestations.

### D4. Observation precedes repair; final follows repair

After all six immutable row commands are attempted in order, ordinary exit-0/1 failures may publish one schema-complete, follower-ineligible observation if every missing or failed fact is bound to its report observation and fingerprint and every cause is ranked. The evidence activity remains governed by the H row's `product-pr` subject, and each repair-required cause receives one separate source-controlled H repair row and focused product PR.

Final proof requires a fresh rebased run after all repairs/cleanups or blockers: all six commands and reports pass, all authority facts are complete, every H assertion holds, and the reconciliation closes the reopened observation set. Abnormal exits or incomplete evidence publish no authoritative observation.

### D5. Pin the CAMP-01H receipt seam

The sole row is resolved by `commandId=camp-01h` from `WAVE_CONTRACTS['camp-01h']`. That row alone defines the six logical-token commands, canonical digest, run root, predecessors, reporters, artifacts, assertions, and `product-pr` 5-file/300-line cap. Narrative command expansion is forbidden.

The controller SHALL register the row's `product-pr` target only after CAMP-01G and PROOF repair gates. Reviewed-head observation/final and exact-main final proof use the row-resolved identities. Exact-main cleanup must consume the exact run id and receipt digest before any follower.

## Risks / Trade-offs

- **One browser flow masquerades as three sessions** -> Require distinct execution/context/report identities.
- **A screenshot is mistaken for durability** -> Require API/store/persistence/reload evidence per witness.
- **Audit failures get buried** -> Publish only attributable observations and route every cause to a repair, blocker, or ranked lower-severity disposition.

## Migration Plan

1. Complete all child specs, CAMP-PROOF, PROOF-02 triage/repairs, and CAMP-00 through CAMP-01G exact-main cleanup.
2. Run the six immutable commands and publish either a complete observation or complete final reconciliation.
3. If needed, land one focused repair PR per cause, rerun final on fresh exact main, SHA-guard merge the evidence change under its `product-pr` subject, prove exact main, clean up, and prune.

Rollback invalidates H and every dependent acceptance claim; rerun from the restored exact-main SHA.
