# OMO Council — Goal-drivable roadmap loop (starting with harden-gm-two-player-campaign-sessions)

**Headline:** The roadmap already exists and validates; what was missing is a unit ledger the goal can loop over and a review substitute for a one-collaborator repository, so the decision is a `units.json` sidecar plus DELIVERY v2 review text, not a new roadmap.

**Brief:** Design the goal-drivable roadmap and per-unit loop for the next program, reusing or replacing the existing ledger/contract/validator, with an explicit owner-gate parking and resume mechanism, sequenced to start with the agent-reachable slice of harden-gm-two-player-campaign-sessions.

**Option space:** (A) new program directory versioning the contracts and reusing the validator; (B) a new roadmap format; (C) extend the live roadmap.json in place with a new wave; (D) decision packets only until the owner rules; (E) hybrid: extend the live ledger with a decision-packet node kind and a per-unit loop state machine. Variant run: Lean+ minus Librarian (Phase 0 collapsed the question to internal machinery; external evidence not load-bearing; two work lanes occupied child slots).

## Phase 0 — Metis reframe
Not "a new roadmap format" but the decision-request mechanism that lets a goal-driven loop surface an owner gate, park cleanly and resume without re-planning, layered on the existing roadmap.json / DELIVERY.md / validate-roadmap.mjs, scoped first to the agent-reachable slice of the starting package. Facts: the artifact of the requested shape exists (openspec/planning/2026-09-12-roadmap-completion/); the last program ended with every agent-reachable node main-verified and 28 nodes parked behind owner decisions (HANDOFF.md:6-8, 25-26); the starting package's closing rows are represented by node R6.umbrella, planned, chained to the same owner gates.

## Phase 1 — Captain's assignments
- **Hephaestus:** concrete artifact shapes, validator delta, owner-gate mechanism, first units from tasks.md lines.
- **Oracle:** reuse vs replace vs extend with failure modes and effort; gates with a single human; honest terminal condition; six-month consequences.
- **Explore-Deep:** validator inventory, receipt schema in practice, per-row reachability of the 25 open tasks, existing loop mechanics and consumers.
- **Momus (kill mandate):** can a goal loop over this; is any unit reachable; day-one executability gaps.

## Phase 2 — Parallel positions
### Hephaestus (Implementer)
Option C/E in place: all 25 open rows are already ledger tasks under R6.umbrella; add a `units.json` sidecar (unit = node, taskKeys subset, caps, DELIVERY-enum state plus `owner-gated`, stage receipts admission/red/local/review/merge/mainProof/tick with head-chain equalities) linked from `roadmap.unitLedger`, six validator checks, `--next` selection with exit 3 as the terminal signal. Found ledger-key drift (25.1@633 vs live tasks.md:630) and that tasks.md ticks are invisible to the validator today.
### Oracle (Strategist)
Option A skeleton + E schema: new program directory, forked validator, because validate-roadmap.mjs:48 and :55-60 pin packages to the immutable admission snapshot (one commit); decision-packet node kind with `parkedBy`; six-field packet; `ciClass` derived from ownershipPaths; terminal condition over the immutable snapshot; six-month guards (snapshot supersedes chain, NDJSON receipt folding, CI job running prior validators). Effort 1-1.5 days.
### Explore-Deep (Internal evidence)
Validator checks inventoried (lines 45-198); receipt shape enforced only for complete/archived (183-189); main-verified nodes carry receipt null/string/object; receipt field names drifted (HANDOFF.md:23); roadmap.json has one consumer, the manually run validator (no npm script, no workflow). All 25 open rows owned by R6.umbrella (5353-5494) whose ownershipPaths are the change dir, scripts/qc and e2e only; reachable now: 21.1@492, 21.2@547, 22.3@584; owner-gated: 14.2, 14.4, 16.2, 19.2, 21.3, 22.2, 23.3 (OD-rewind-branch-reader, R6.B6 planned); the rest depend on sibling packages (tasks.md:259 and :299 say so in the rows themselves).
### Momus (Executability sniper)
Decisive kill against every option: DELIVERY.md:11 requires an independent reviewer per PR and :13 an eligible real non-author review for authority/privacy/migration/replay/idempotency/concurrency; the repository has exactly one collaborator (gh api collaborators); the prior program parked on exactly this (HANDOFF.md:8). Secondary: the admission pin blocks scope growth; the loop would not park on iteration one; executionHold is historical.

## Phase 3 — Cross-attack
### Hephaestus updates
Concedes the pin for new packages: the next program that admits a package outside the 13 gets a second admission snapshot through a parameterised validator (`--snapshot <file> --roadmap <file>`; the script has no argv today), not a forked copy. Drops any live re-pin: units may only reference frozen snapshot occurrence keys, and a new check requires every open occurrence to sit in exactly one unit or one parked packet, so narrowing fails validation instead of hiding. Supplies DELIVERY v2 text (two-lane cross-model review; owner ruling packet bound to the exact head). Re-sequences to U0 docs dry run, U1 22.3@584, U2 21.2@547 (first ruling packet), U3 21.1@492 (scoped non-claim); withdraws 2.3/14.x/16.x as sibling-owned or gated.
### Oracle updates
Withdraws the new directory for the first program (25 of 108 rows of the starting package are inside the frozen snapshot; a new directory would fork the ledger of record). Adopts the hybrid: roadmap.json stays the ledger of record, `roadmap.unitLedger: "units.json"` rides the existing link check, packets live in the same file; a new directory only when a unit's taskKeys contain a key absent from roadmap.tasks. Supplies DELIVERY v2 §5 text (Lane A agent review on a different model with model id, effort, head, output hash; Lane B owner ruling recorded as a PR comment beginning `OWNER-RULING <40-hex head>` plus label `owner-ruled`, receipt storing comment id, author, head, body sha256; void on head change). Keeps the CAMP three-witness gate owner-only (the validator hard-pins it; relaxing it is a program-owner act). Receipt drift: no normalisation of the 894 historical receipts; a tolerant `readReceipt` adapter, strict stage receipts from U0 forward.

## Synthesis
**Decision:** Keep roadmap.json as the ledger of record and add a `units.json` sidecar (linked as `roadmap.unitLedger`) that holds units with stage receipts and decision packets; extend validate-roadmap.mjs with argv (`--snapshot`, `--roadmap`, `--next`, `--git`) and the coverage, stage-monotonicity, head-chain, tick-by-sourceId, review-independence and owner-gate checks; replace DELIVERY.md §5 and §7 review text with the two-lane review (Lane A cross-model agent review; Lane B owner ruling comment bound to the exact head) and record CAMP three witnesses as owner-only; run the program as a goal whose terminal condition is `--next` exiting 3 with every open snapshot occurrence closed or parked; first units U0 (docs dry run through all seven stages), U1 22.3, U2 21.2, U3 21.1. A new program directory is created only when a package outside the 13 admitted ones must be admitted.

**Why:** The two proposers converged on the fact that decides it: all 25 open rows are already admitted snapshot keys, so a new directory forks the ledger while adding nothing a sidecar cannot carry, while the snapshot pin (validate-roadmap.mjs:48, :55-60, :74, :95) makes in-place package growth impossible, so the parameterised validator covers the future. Momus's kill is real and is answered by a named substitute: Lane B gives the sensitive classes a human ruling that is recorded, head-bound and re-fetchable, which is the strongest check a one-collaborator repository can produce without fabricating approval. Explore-Deep's facts shape two guards: the tick check must match by sourceId and text (line drift exists), and stage receipts must be strict from U0 forward because historical receipts have no enforced shape.

**Survival Score:** Modified. Oracle's Phase-2 frontrunner (new directory) was killed and folded into Hephaestus's sidecar; Hephaestus's unit ordering was killed by Explore-Deep's reachability table; Momus's kill forced the review substitute into the decision.

**Trade-offs accepted:** Lane B cannot prove the owner read the packet, only that a head-bound ruling exists; the CAMP three-witness gate stays unsatisfiable by agents; historical receipts stay un-normalised behind a tolerant reader; roadmap.json remains a large file that the sidecar keeps from churning further.

**Second-order consequences:** Three programs of stage receipts in one sidecar stay small if raw logs remain hash-identified under .sisyphus (the distill-then-delete convention already in force); the parameterised validator must keep passing on the published 2026-09-12 program forever (add a CI job running it on every main commit); owner rulings become a searchable history of decisions that the 2026-09-12 ownerDecisions array lacked.

**Open risks:** CI minutes: U1-U3 are e2e/scripts/qc units and run full checks (product class); combine docs-class units. The owner-ruling comment convention must be agreed before U2 parks on it. R6.umbrella's ownershipPaths exclude src/lib, so any unit that needs product code must be re-owned to the sibling node first (recorded in the unit).

**Dissent on record:** Momus's kill stands as a limit, not an objection: the loop still parks on any sensitive unit until the owner posts a ruling; no option removes the human from those classes, and the council did not try to.

Synthesis verified by omo-judge (1-pass).

## Decision drive-through (Phase 6)
Implied: build the artifacts (units.json with U0-U3 planned, validator extension, DELIVERY v2 text, WORKERS/PR-SLICES notes on review lanes and ciClass, this decision record, a goal statement) as one docs-class PR, then run U0 as the dry run.

---
*Appendix*
**Decision crux:** whether the 25 open rows are inside the frozen admission snapshot (they are: roadmap.packages harden-gm-two-player-campaign-sessions 83 checked / 25 open).
**Context factors:** single collaborator; admin merge enabled; CI-minute budget; owner availability to rule on packets.
**Missing information:** the owner's preferred out-of-band ruling channel (PR comment plus label is the proposal).
**Fault line:** none after cross-attack; both proposers adopted the hybrid.
**Token cost:** roughly 0.5M subagent tokens across Phase 0, four Phase-2 seats and two Phase-3 seats.
