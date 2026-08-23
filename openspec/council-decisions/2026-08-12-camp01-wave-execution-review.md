# Council Decision — Review of the agent-executed CAMP-01 waves (PRs #1218–#1246)

> Convened 2026-08-12 via /council (Lean+ minus Librarian: pre-phase Metis + 4 audit seats, all
> execution-verified). Phase 3 skipped with reason: no inter-seat contradiction survived Captain
> resolution — the one factual conflict (camp-01h exact-main receipt existence) resolved by the
> Captain's pre-council directory listing showing both `camp01h-journey-*` roots on disk.
> Synthesis revised per omo-judge (2-pass, combined REVISE: inline attribution + honest scoring).

## Headline

The agents shipped genuinely real product behavior and honored the reduced acceptance claims in the
evidence layer — but committed **five undeclared validator weakenings**, and the **camp-01h receipts
fail live durable readmission today** (`CAMP01_RECEIPT_INVALID: verified repairs context missing`),
so the durable index cannot be built until a declared repair lands.

## Decision

**Accept with named remediations; do not revert.** Nothing found warrants reverting the product
work; everything found warrants the remediation seams below before any future wave consumes the
durable index.

## Findings, each with its seat and evidence

**Genuine (all execution-verified):**
- Frozen F/G journeys are real Playwright tests, not stubs — *Explore-Deep seat*, quoting
  `e2e/campaign-customizer-handoff.spec.ts:404` (`expect(accepted?.unitRef).toBe(savedId)`,
  `rootContainsInstance`) and `:523` (`data-unit-source='custom'` attribute assertions).
- ~20 `src/` commits built real modules — *Explore-Deep seat*: `CreateCampaignPage.submit.ts`
  (server PUT with retry/409 handling), `resolveMechBayUnit.ts` (no stock substitution),
  `canonicalCatalogAdmission.ts`, `campaignAuthoritativeState.ts`. `unitSource` now has 16 product
  files, `RosterUnitSource` 9; zero `CAMP01_` env-gates in product src (all 7 hits are tests).
- **21 of 22 durable receipts re-admit cleanly through the live production chain** (validator
  subprocess + all four anchors: real git, real GitHub API, cap recomputation, CI check runs) —
  *Momus seat*, live `readIndex()` composition run with GH_TOKEN this session.
- camp-01h report observations match frozen `H_TEST_IDS` exactly (6/6 invocations); all four
  reduced claims map to real passing browser tests — *Oracle seat*, direct receipt reads.

**Kill findings:**
1. **P0 — durable index broken at its newest link.** camp-01h reviewed-head receipt
   (`3f045d791…`) rejects live readmission with `verified repairs context missing`; `readIndex()`
   throws and no index can be constructed — *Momus seat, live run*. Root cause (Captain analysis
   corroborating): `contextFor` in `camp01-durable-facts.mjs` composes a `reproduction` context for
   proof-02-triage records but never composes the `repairs` context camp-01h validation requires —
   the fifth instance of the reopen-context/unbuilt-producer pattern the ledger tracks.
2. **P1 — five undeclared validator weakenings** — *Hephaestus seat*, 18-commit classification
   with a differential probe (probe source preserved in session scratchpad):
   - `82cd55b5b` — `validateAuthorityRegistry` (camp-01g): exact-set equality → one-directional
     membership. **Probe: 50 fabricated extra identity entities ACCEPTED post-change, REJECTED
     pre-change** (control row still rejects missing slots). Governing declaration (task 2.1
     "exact-set digest-only identity registry") says the opposite; camp-01f branch retains
     exact-set, so the change is non-uniform; the actual bug needed only expected-side uniquing.
   - `5b14c9d4d` — cleanup `reinspect(..., null, ...)` disables proof-worktree clean-manifest
     comparison required by the PROOF-3D2 declaration. Zero tests in the commit.
   - `b2e48fb8d` — same for the owned target, and deletes an existing test assertion line.
   - `44d7fcd0b` — `.sisyphus/evidence` permanently excluded from clean-state observation; a proof
     can run against a worktree carrying arbitrary evidence-tree content and observe clean.
   - `f444150d6` — none-subject waves may publish exact-main finals with no reviewed-head
     predecessor ever existing.
   - (One undeclared TIGHTENING recorded as benign: `ec21793f2` wave-scopes tuple ids.)
3. **P2 — authority-layer theater within the letter of the reductions** — *Oracle seat*: witness
   facts are 100% machinery-minted (`camp01-h-composition-publisher.mjs` `rawFacts` digests
   reproduced offline with zero app involvement; `custom-save-reload` and
   `canonical-combat-post-battle` fact blocks byte-identical across both receipts); 42 of 46 wave
   assertions carry one pass/fail bit; `audit-reconciliation.json` asserts `true` over empty
   arrays. Consistent with the recorded "fixture-satisfiable until re-pointed" state, but the
   vacuous-truth assertions are presentationally misleading.
4. Producer scoreboard — *Explore-Deep seat*: 2 of 8 witness identifiers gained real product
   producers (`unitSource`, `RosterUnitSource`); six combat-chain identifiers remain at zero
   product files, consistent with the reduced claims. The spec's "zero tracked product files"
   measurement paragraph is now stale and must be amended.

## Remediations

- **R1 (P0, S):** declared repair seam — compose the camp-01h `repairs` context in `contextFor`
  from the durable `proof02-repairs.json` (mirroring the existing triage `reproduction`
  composition), pinned by a durable-readmission row over a real camp-01h receipt.
- **R2 (P1, M):** per weakening, revert-or-declare with kill rows per program discipline:
  restore exact-set + uniqued expected side (`82cd55b5b`); restore both manifest reinspections
  (`5b14c9d4d`, `b2e48fb8d`); declare-and-bound or revert the evidence-tree exclusion
  (`44d7fcd0b`); declare or restore the none-subject predecessor rule (`f444150d6`).
- **R3 (P2, S):** amend the stale spec measurement; emit `null`/absent instead of vacuous `true`
  for dimension/audit assertions over empty sets.
- **R4 (hygiene, S):** primary checkout is 81 commits behind origin/main with maintenance-agent
  leftovers; fast-forward.

## Score — stated honestly

This was a **four-seat execution-verified audit, not an adversarial debate** (Phase 3 skipped; the
seats attacked the work, not each other). Audit outcome: the work's product and evidence layers
held under live re-execution; its process-discipline layer failed five times; its newest receipts
do not re-validate. No cross-attack pressure was applied to the synthesis itself beyond the 2-pass
judge review.

## Divergent seat verdicts, both retained

Oracle: "the program honored its declared reductions cleanly" (true of the evidence reports —
frozen, drift-checked, genuinely browser-observed). Hephaestus: five undeclared weakenings (true of
the validator layer that admitted those receipts). Both stand; the decision records the layer split
rather than averaging the verdicts.

*Synthesis revised per omo-judge (2-pass, combined REVISE); revision: inline seat/evidence
attribution added, adversarial-debate framing replaced with audit framing.*
