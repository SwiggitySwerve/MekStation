# OMO Council — Audit Remediation: OpenSpec Strategy + Worker-Agent Wave Plan

**Headline:** Only 3 of 88 findings need MODIFIED spec deltas — the rest split into restore-without-delta (Cluster A, tracked by one change folder) and code-fix-only gaps — because the SoT's wrong-behavior locks are rarer than feared and the hand-edit commits never corrupted game rules.

**Brief:** Decide which of the 88 confirmed audit findings (docs/audits/2026-06-09-full-codebase-review.md) require new OpenSpec changes vs updates to existing specs/changes, and structure a worker-agent remediation plan that fixes code and corrects docs together.

**Variant:** Lean++ thin (pre-phase Metis + Oracle + Explore-Deep + Momus). Phase 3 skipped — single proposer; kill-mandated Momus returned WOUND with named fixes (no kill); the lone premise attack (which vehicle-arc values are correct) was already settled by the audit's 3-refuter MegaMek verification. Synthesis verified by omo-judge (2-pass: combined REVISE → revised with the evidence pointers below).

**Option space:** O1 spec-first (archive gates all) · O2 code-first, specs later · **O3 4-bucket hybrid (chosen)** · O4 one mega-change · O5 per-finding changes (~88 folders).

## Phase 1 — Captain's Assignments

- **Oracle (sole proposer, xhigh):** pick option + wave plan + per-PR doc rule.
- **Explore-Deep (evidence):** 4 probes — hand-edit damage map; per-capability delta-safety; spec-locked-wrong-behavior quotes; restore-without-delta precedent.
- **Momus (kill mandate):** restoration mechanicality; delta-targeting executability; archive/delta collision; trail integrity of "no delta for Cluster A."
- **Pre-phase Metis:** reframed brief into the 4-bucket sort; directives: SoT untrusted as behavior reference, archive off critical path, tests-first, D-1 gates D.

## Phase 2 — Parallel Positions (compressed)

- **Oracle:** O3; Cluster A = one tracking change folder, no deltas; 7 waves W0–W6; mechanical 5-point per-PR doc rule.
- **Explore-Deep (key evidence):**
  - Hand-edit commits `9a54d62ca`/`479c5cbf3`/`e82725666` only ADDED CI-housekeeping scenarios to `openspec/specs/quick-session/spec.md` + `openspec/specs/simulation-system/spec.md` ("PR validation keeps simulation proofs in fast smoke lanes", "PR smoke keeps pilot-skill batch proof bounded"). **No game-rule corruption → Bucket 2 is empty.**
  - Spec-locked WRONG behavior (quoted SHALLs): movement-system `### Requirement: Heat MP Reduction` + `### Requirement: Heat Reduces Effective Movement` mandate direct `floor(heat/5)` subtraction on walk **and run** (MegaMek re-derives run from heat-adjusted walk: `BipedMek.java:254`, `Entity.java:3381`); terrain-system properties table locks Swamp walk-cost **+2** (MegaMek: +1) and Swamp Cover **Partial** (MegaMek: none; `to-hit-resolution/spec.md` `### Requirement: Partial Cover Modifier` already excludes swamp — internal spec contradiction).
  - Gaps (spec silent → pure code fix): jump-MP heat immunity (C-2), to-hit hydration pipeline (B-1), most of C-4…C-15, D/G/H.
  - Delta-safety: `to-hit-resolution`, `heat-management-system`, `firing-arc-calculation`, `battle-armor-unit-system` have **0** unarchived deltas (safe); `movement-system` 20 (LOW risk, 1 phantom: `block-destroyed-gyro-nontracked-movement`); `piloting-skill-rolls` 7 (**HIGH** — SoT headings use em-dash `—`, four standing-up deltas use `-`/`--`, plus phantom `AirMek Landing PSR Trigger`); `tactical-map-interface` **171 unarchived change folders carry a delta against it** vs 95 SoT requirement headings (confirmed phantom sample: "Combat Projection Explanation Details").
  - Precedent: src/-only fix commits land on main with no change folder and no CI/husky gate blocks them; `--skip-specs` archive is repo-precedented.
- **Momus:** **WOUND — no kill.** Fix 1: "restore from `afc46bc0f`" is not blindly mechanical — merge `7f22e4f22` *deliberately rewrote* `vehicleFiringArc.ts` (swapped arc spans AND the rule citation); worker prompts must state intended behavior + audit row + MegaMek citation, never bare `git restore`. Fix 2: MODIFIED deltas must embed the verbatim grep'd SoT heading. Collision: archive track and new-delta authoring must not interleave per SoT file (`piloting-skill-rolls/spec.md`: 7 pending; `tactical-map-interface/spec.md`: 171). Trail: tracking folder + `--skip-specs` satisfies trail discipline.
- **Captain first-hand verification (post-judge):** the openspec CLI (`@fission-ai/openspec`, npx cache) matches headings trim-only — `dist/core/parsers/requirement-blocks.js:1-3` (`return name.trim();`) — and hard-throws on MODIFIED heading miss at `dist/core/specs-apply.js:211` (`"MODIFIED failed for header … - not found"`). `openspec validate` does NOT pre-check MODIFIED names against the SoT; failure surfaces only at archive time.

## Synthesis

**Decision:** Adopt **O3, the 4-bucket hybrid**, with the buckets finalized by evidence:

| Bucket | Findings | OpenSpec artifact | Rule |
|---|---|---|---|
| **1 — Restore, no delta** | All 15 Cluster-A reverts (incl. A-14 delete) + C-12 wreck-LOS leftover | ONE tracking change folder `restore-reconciliation-reverts-2026-06` (15-row tasks.md citing audit row + recovery commit per file); archive later with `--skip-specs` | Behavior already claimed by checked-off changes; SoT was right, code regressed. Worker prompts state INTENDED behavior + MegaMek/audit citation — never bare git-restore (Momus Fix 1). Tests restored first (reachable.test.ts 79→9 etc.). |
| **2 — SoT corruption fixes** | **EMPTY** | none | Hand-edits were CI-housekeeping additions only (Explore-Deep Probe 1). |
| **3 — Code fix + MODIFIED delta** | **C-1** (run-MP heat re-derivation; movement-system), **C-3** (terrain costs incl. swamp +2→+1; terrain-system), **C-7** (swamp cover Partial→None; terrain-system) | New change folder per fix with MODIFIED delta shipped in the SAME PR as the code | Mandatory mechanic: grep the exact `### Requirement:` heading verbatim from the SoT into the delta (em-dash trap; trim-only matching, archive-time hard-throw, no pre-validation — verified `specs-apply.js:211`, `requirement-blocks.js:1-3`). |
| **4 — Code fix only** | B-1…B-6, C-2, C-4…C-6, C-8…C-15, D (D-1 first), E, G, H | Small change folders per wave (repo convention) with ADDED deltas only where new behavior warrants; flip over-claiming checkboxes in existing changes with note | Spec is silent (gap), not wrong. Workers never read `openspec/specs/` for expected behavior — MegaMek Java or the audit row is the reference. |

**Wave plan** (sequential between waves' merges; ~5-min CI budget; branch-protection strict):

| Wave | Scope | Effort | Parallelism |
|---|---|---|---|
| W0 | Cluster-A restoration, tests first, PRs of 2–3 findings | L | Sequential (shared gameplay files) |
| W1 | B-1 first, then B-2…B-6 — unify on `buildWeaponAttack*ToHitState` | L | Sequential |
| W2 | C-rules fixes incl. the 3 MODIFIED deltas | L | Parallel worktrees OK (movement / combat-indirect / battle-armor are disjoint) |
| W3 | Campaign: **D-1 alone first**, then D-2 registration, then rest of D | M | Sequential |
| W4 | CI enforcement: wire Playwright into pr-checks.yml + fix 2 stale e2e assertions; E-7/E-8 swarm runner; E-2…E-6 lanes | M | Parallel-OK with W2 |
| W5 | G (fog/lens/centerOn) + H (replay 1MB, SQLite, vault sync) | M | Parallel-OK |
| W6 | **Archive remediation (F)** — fix 79 phantom + 2 conflicting + dash-drift deltas, then archive 202 changes in dependency order | XL | Sequential, LAST; never interleave with delta authoring on the same SoT file |

**Per-PR mechanical doc rule (verbatim in every worker prompt):** (1) W0 → tick tracking tasks.md row only; (2) if an existing change's checkbox over-claims behavior you just restored/fixed → flip it with "regressed by 7f22e4f22, restored PR #N"; (3) Bucket-3 → MODIFIED delta in the same PR, heading copied verbatim from the SoT; (4) never hand-edit `openspec/specs/` outside W6; (5) annotate the audit ledger row "resolved @PR #N".

**Survival Score:** **Modified** — kill-mandated Momus returned WOUND with two named fixes (intended-behavior-stated restores; verbatim-heading deltas), both now binding; Explore-Deep emptied Bucket 2 and cut Bucket 3 from 4 suspected to 3 confirmed. Core O3 shape survived honest pressure.

**Trade-offs accepted:** SoT remains untrusted until W6 (mitigated by the never-read-SoT rule); Cluster A gets no per-finding ceremony (mitigated by tracking folder + `--skip-specs` precedent); archive-last means spec/code drift persists longest where it's already worst (tactical-map-interface).

**Second-order consequences:** W6's archive sweep will rewrite `piloting-skill-rolls` and `tactical-map-interface` SoT heavily — any W2 delta against terrain-system/movement-system must be archived BEFORE W6 starts those files, or re-validated after.

**Open risks:** W0 restores may surface latent conflicts with post-merge enrichment (Momus verified vehicleFiringArc + reachable.test.ts apply cleanly, but only 2 of 15 sampled); the run-MP spec example (`run 8→7 @ heat 9`) coincides under both formulas — the C-1 delta must add a disambiguating scenario (e.g., walk 6/run 9/heat 5: re-derivation → run 8; subtraction → run 8 too; use walk 5/run 8/heat 10 → re-derivation ceil(3×1.5)=5 vs subtraction 6).

**Dissent on record:** "Leave the run-MP spec as direct-subtraction" was considered and rejected — the stated formula diverges from MegaMek at some heat levels even though the spec's only example coincides.

---
*Appendix*
**Decision crux:** whether `openspec/specs/` locked wrong behavior broadly (it didn't — 3 spots) and whether hand-edits corrupted it (they didn't) — both settled by Explore-Deep's probes.
**Context factors:** 202-change archive backlog; trim-only heading matching in the npx-cached `@fission-ai/openspec` CLI; repo precedent for src-only fixes and `--skip-specs`.
**Token cost:** ~210K (pre-phase Metis 51K + Oracle 53K + Explore-Deep 69K + Momus 61K + 2× judge 58K + captain verification).
