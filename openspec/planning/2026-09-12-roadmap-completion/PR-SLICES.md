# Implementation and PR slices

This is a readable view of the current roadmap ledger. Every row is an admission unit and may require several small PRs under DELIVERY.md; broad path scopes are navigation, never blanket worker ownership. Existing source task IDs and exact acceptance text are mapped in roadmap.json.

Independent nodes may proceed in parallel after local roadmap validation. Wave numbers are grouping labels, not an instruction to serialize every lane. Git integration and shared authority/storage changes remain serialized.

The combat sequence is branch storage → cutover → live combat rewind. Early branch mechanics use the PR1–3 exemption; PR4+ waits for the complete cross-stream terminal/archive/prune gate. Cutover S5-a and S5-b map to ledger R4.S5 and R4.S6; original S6 maps to R4.S7. Ledger suffixes never rename original source seams.

## Wave 0

| Item | Outcome | Requires |
| --- | --- | --- |
| R0.plan | Validate task accounting, dependency graph and current roadmap |  |
| R0.contracts | Repair obsolete dependency and vault current-state claims | R0.plan |
| R0.publish | Publish validated roadmap and durable accounting through capped documentation PRs | R0.plan |

## Wave 1

| Item | Outcome | Requires |
| --- | --- | --- |
| R1.specs | Deliver reconciled canonical specifications in coherent domain PRs | R0.plan |
| R1.references | Deliver verified source annotations and documentation pointers | R1.specs |
| R1.archives | Publish three verified archive moves and active ledger changes | R1.specs |
| R1.route | Publish explicit tab precedence fix and focused regression | R0.plan |
| R1.infantry | Publish shared Infantry preview and stale-render regression | R0.plan |
| R1.ci | Publish twelve-case customizer production browser gate | R1.route, R1.infantry, R1.browser |
| R1.remote | Prove remote CI activation, exact-main customizer and accepted closure | R1.ci, R1.archives, R1.references |
| R1.browser | Deliver print and export browser boundary proof | R1.infantry |

## Wave 2

| Item | Outcome | Requires |
| --- | --- | --- |
| R2.receipts | Revalidate existing CAMP tooling, real approvals and durable handoff | R0.contracts |
| R2.triage | Run immutable reproduction, audit observations and repair only proved causes | R2.receipts |
| R2.combat | Reconcile saved-custom combat implementation with all six original tasks | R1.remote |
| R2.authority | Audit campaign authority nonclaims and define missing production producer slices | R0.contracts |
| R2.authority-live | Verify complete campaign authority and two-process convergence | R2.authority-cutover |
| R2.camp-0 | Loopback production listener | R2.triage |
| R2.camp-1 | Trusted exact-ref catalog and source guard | R2.camp-0 |
| R2.camp-2 | Revision-bound co-op roster snapshots | R2.camp-1 |
| R2.camp-3 | Actor-derived participation | R2.camp-2 |
| R2.camp-4 | Readiness and materializer source fidelity | R2.camp-3 |
| R2.camp-5 | Saved-design picker producer | R2.camp-4 |
| R2.camp-6 | Wizard persistence and reload | R2.camp-5 |
| R2.camp-7 | Mech Bay source resolution and editing | R2.camp-6 |
| R2.camp-8 | Three-witness campaign acceptance | R2.camp-7, R2.combat-browser |
| R2.journey | Reconcile three-witness saved-unit journey and parent/child receipts | R2.camp-8, R2.combat, R2.authority-live |
| R2.combat-browser | Extend supported-custom production combat through terminal and post-battle persistence | R2.combat, R2.camp-7 |
| R2.authority-client | Route source mutations and browser cache through durable acknowledgement | R2.authority |
| R2.authority-host | Refresh host projections from authoritative committed campaign state | R2.authority-client |
| R2.authority-cutover | Admit production campaign journal cutover with parity and rollback | R2.authority-host |

## Wave 3

| Item | Outcome | Requires |
| --- | --- | --- |
| R3.storage | Accept branch storage, effective-head resolver and lineage integrity | R0.contracts |
| R3.activation | Finish candidate activation, correction lease and generation fencing | R3.storage |
| R3.combat | Finish combat branch rebuild and preview port | R3.activation, R4.S7 |

## Wave 4

| Item | Outcome | Requires |
| --- | --- | --- |
| R4.matrix | Map all 80 umbrella acceptance rows to exact tests and evidence | R0.contracts |
| R4.S1 | Committed match batches and journal heads | R3.storage, R4.matrix |
| R4.S2 | Live journal head and stale-branch admission | R4.S1, R4.matrix |
| R4.S3 | Retire redundant started marker | R4.S2, R4.matrix |
| R4.S4 | Journal-backed restart recovery | R4.S3, R4.matrix |
| R4.S5 | Explicit sequence/revision offsets | R4.S4, R4.matrix |
| R4.S6 | Expected-head race and duplicate-command refusal | R4.S5, R4.matrix |
| R4.S7 | Shadow parity, migration states and reviewed cutover | R4.S6, R4.matrix |
| R4.rewind | Complete live rewind commit, activation and viewer-specific hidden state | R4.S7, R3.combat |

## Wave 5

| Item | Outcome | Requires |
| --- | --- | --- |
| R5.E1 | Canonical command bytes and identity | R4.rewind, R2.authority-live |
| R5.E2 | Positive effective-head generation and migration | R5.E1 |
| R5.E3 | Transactional source outbox and lease admission | R5.E2 |
| R5.E4 | Atomic target receipt and consequence events | R5.E3 |
| R5.E5 | Server-only effect principal and bounded dispatcher | R5.E4 |
| R5.E6 | Terminal match enqueue and shadow parity | R5.E5 |
| R5.E7 | Receipt-backed campaign reconciliation and crash matrix | R5.E6 |
| R5.E8 | Viewer-authorized causal timeline | R5.E7 |
| R5.E9 | Next-scenario convergence gate and accessible status | R5.E8 |
| R5.E10 | Integrated effect journey, exact-main receipts and archive | R5.E9 |

## Wave 6

| Item | Outcome | Requires |
| --- | --- | --- |
| R6.B4 | Campaign replacement replay and artifact invalidation | R5.E10 |
| R6.B5 | Coordinated higher-version outcome correction saga | R6.B4 |
| R6.B6 | Authorized branch/effect history UX | R6.B5 |
| R6.B7 | Branch-aware rollback and fail-closed recovery | R6.B6 |
| R6.umbrella | Finish remaining GM authority/privacy and 80-row integrated evidence | R6.B7, R4.rewind, R2.authority-live, R2.journey |
| R6.deferrals | Record simulation restrictions and existing explicit future-only contracts | R0.contracts |

## Wave 7

| Item | Outcome | Requires |
| --- | --- | --- |
| R7.versions | Reuse vault version producer and decide pilot version authority | R2.journey, R0.contracts |
| R7.provenance | Finish roster provenance and migration without reusing occupied schema v2 | R7.versions |
| R7.context | Finish draw-from-vault, drift/refit prompts and context ownership | R7.provenance |

## Wave 8

| Item | Outcome | Requires |
| --- | --- | --- |
| R8.travel | Reconcile current travel calculations and add missing authoritative events | R7.context, R2.authority-live |
| R8.opportunities | Add opportunity lifecycle, seeded host generation and contract acceptance | R8.travel |
| R8.starmap | Extend GM authoring, opportunity markers and travel progress | R8.opportunities |
| R8.isometric | Verify and complete existing SVG isometric picking, overlays and preferences | R0.contracts, R2.journey |
| R8.journey | Prove vault-to-travel-to-opportunity-to-mission journey and replay | R8.starmap, R8.isometric |

## Wave 9

| Item | Outcome | Requires |
| --- | --- | --- |
| R9.triage | Disposition all 22 needs-proof and 18 preserve-planned rows | R1.remote, R2.journey, R8.journey, R9.equipment-loader, R9.validation-order, R9.roster-damage |
| R9.close | Final exact-main integrated proof, canonical archive and owned cleanup | R9.triage, R6.umbrella, R6.deferrals, R0.publish |
| R9.equipment-loader | Report partial official equipment load failures accurately | R0.plan |
| R9.validation-order | Respect validation levels before numeric rule priorities | R0.plan |
| R9.roster-damage | Replace roster damage heuristic with construction maxima | R2.camp-7 |

## Current delivery boundary

Routing and Infantry implementation plus routing archive are merged and verified on main. The final browser commit is locally verified and awaits exact-payload publication approval. Follow its protected-check, guarded-merge and exact-main proof before CI activation.

CI uses four capped prefixes in evidence/ci-admission-four-prefixes.json; the contract-module prefix is complete, while browser-dependent wiring and remote activation remain open. Equipment-loader and validation-order repairs are complete with exact-main and cleanup receipts in roadmap.json. R9.roster-damage remains a bounded gap awaiting admission after R2.camp-7. These additions preserve the original 13-package, 376-task snapshot.
