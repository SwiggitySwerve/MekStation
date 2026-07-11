# OMO Council — Are We On Track / Checking the Right Things (W6 era)

> Convened 2026-07-11 (Lean++ thin after Phase-0 collapse; researcher + adversary seats ran on cursor-agent/Grok 4.5 per worker trial; planning/review orchestration by Fable). Brief: "make sure we are on the right track and checking the right things as we go along for all these pieces of work."

**Headline:** The checking discipline is already written — W6's own tasks.md is the "are we checking the right things" answer — but two of its premises drifted in the 48h since authoring: the nightly-green baseline is **still false** (two campaign specs fail on a tree containing #1049), and all six quarantined layout-defect followUps are **dangling prose**, so the guard enforces presence, not liveness.

**Brief (reframed by Phase-0 Metis):** Not "are we checking the right things" — W6's merged design answers that — but "has W6's ground truth gone stale since authoring, and will its Group-1 re-verification actually run rather than be rubber-stamped, with residuals guarded against rot?"

## Phase 2 — Evidence (all file/commit-verified)

- **Oracle (Claude, xhigh):** Don't add checks — enforce the written ones. W6 start = execute tasks 1.1–1.4 and land the baseline as a **written artifact** (`.sisyphus/evidence/w6-ground-truth/` in the PR branch); re-anchor drifted citations (`retries` :46→:58; config gained `scenario-pack-mint`); the now-passing 7.0/8.0 STOP-gates still get **written PASS verdicts** (skipping "obviously merged" checks is the rubber-stamp failure mode); R10 hardening (5.3) must land before wiring (5.4); the 9.x battery closes. Residual-rot: fold every loose residual into W6's coverage ledger (task 3.1) as `deferred` rows with validator-enforced `followUpRef` — reuse, not new systems. Explicit do-NOT-add list: no new PR check job, no second residual tracker, no Group-1 automation, no seam-anchor 5th required context.
- **Explore-Deep (Grok 4.5):** Q1 Group-1 re-run **did not happen** (all checkboxes unchecked; no baseline artifacts; nothing landed in the change folder post-W5). Q2 all six quarantine followUps in `e2e/layout-sweep/screenInventory.ts` are **dangling prose** (verbatim strings, no tracked refs). Q3 #1049 was budget-only widening (3×, dated comments; no assertion weakened) — signal intact; but its carved-out repro (integration.spec.ts:332) also has **no tracked filing** (only council-doc prose + an older RC15 audit entry). Q4 both W6 STOP-gates (7.0/8.0) now **satisfied** on origin/main.
- **Momus (Captain-executed after the Grok seat hung; wound, no kill):** last 5 nightlies all failed **including 2026-07-11T10:17Z on d26fd385b, which contains #1049**. Perf jobs went green (the widening worked); the remaining red is `Full E2E Suite (chromium)` — `campaign-long-browser-signoff` (contract-campaign checkpoints) and `campaign-organic-contract` (reloads the accepted mission), `toContainText`/element-not-found through all retries. These are campaign/contract surfaces touched by the wave-3 economy reconciliation (#1028/#1032) — either mis-classified in #1049's nightly-env-only bucket or real regressions. Group-1 citation drift is real but re-anchorable (spot-checks pass); no process blocker found.

## Phase 3 — Cross-attack (Captain-adjudicated)

Live contradiction: Oracle rated the quarantine guard "sufficient"; Explore-Deep proved the guard checks non-emptiness, not liveness. **Resolution (Oracle's own mechanism, extended):** the six layout followUps join the other residuals as `deferred` coverage-ledger rows in W6 task 3.1 — the ledger's `followUpRef` validator becomes the single liveness home. Oracle's position updates; nothing else contested.

## Synthesis

**Decision:** We are on track **conditionally** — the ladder shipped faithfully and W6's written discipline is the right checking regime — subject to three pre-W6 actions:
1. **Triage the two red campaign nightly specs first** (are they in #1049's classified nine? if yes the classification was wrong; if no they're new regressions from the economy-surface waves). W6's ordering gate wants a green nightly baseline; today that premise is false. Either fix them or re-classify with evidence before W6's 5.x CI wiring lands.
2. **Run W6 Group 1 for real, as a written artifact** — tasks 1.1–1.4 against the current tip, baseline note landed in the PR branch, drifted citations re-anchored, 7.0/8.0 PASS verdicts written. No mental notes.
3. **Make the coverage ledger the residual-rot home**: when task 3.1 authors `docs/qc/mekstation-subsystem-coverage.json`, seed it with `deferred` rows carrying real `followUpRef`s for: the 6 quarantined layout defects, the integration.spec.ts:332 customizer repro, the two red campaign specs (if deferred), the hold-mode evidence gap, and the 5-of-6 unevidenced qc:flow flows.

**Why:** every gap the council found is a liveness/rot gap, not a design gap — the cheapest honest fix is to route them all into the one validator-enforced registry W6 was already going to build.

**Survival Score: Modified** — Metis reframed the brief; Momus's nightly evidence overturned the "nightly newly green" belief this session carried in from #1049's own claims; Oracle's residual-rot rating was corrected by Grok's dangling-refs proof.

**Dissent on record:** None live after adjudication. Note honestly: Phase 3 was Captain-adjudicated on factual evidence rather than re-spawned proposer debate (per the user's Fable-orchestrates-reviews directive).

**Worker-trial observations (cursor-agent/Grok 4.5):** inline-prompt read tasks: excellent (line-cited, honest about blocked tools, zero fabrication observed). Failure modes found: file-indirection prompt → silent empty output (exit 0); stdin piping → indefinite hang (killed after ~1h). Recipe going forward: inline prompts or short prompts referencing files the agent reads itself via its own tools only after `--trust`; never pipe stdin; treat empty output as retry-with-inline.

**Open risks / revisit triggers:** if the two campaign specs are real regressions, wave-3's economy reconciliation needs a fix change before W6; if #1049's classification method (single-worker local rerun) mis-bucketed them, the triage method itself needs tightening (nightly-env reproduction, not local rerun).

---
*Appendix* — **Decision crux:** whether the two red campaign specs are env-flakes or real regressions — that single fact decides if W6 starts now or after a fix change. **Token cost:** Lean++ thin (~0.6M subagent incl. recon-free seats + Grok externs).
