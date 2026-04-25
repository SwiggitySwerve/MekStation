## Context

The Tier 1–4 close-out wave (PRs #381–#403) shipped 14 OpenSpec changes between April 24–25, 2026. A retrospective audit (full plan at `~/.claude/plans/look-at-tiers-1-eventual-seahorse.md`) found 12 follow-ups: 3 HIGH-severity items already in flight, plus 9 MEDIUM/LOW items collected here.

This change is intentionally **multi-spec but single-purpose**: each item touches a different existing spec via a small delta, but they all share the audit context and the goal of leaving the post-Tier-4 baseline cleanly closed (no orphaned deferrals, no test gaps, no silent bugs).

A design.md is justified because Phase C contains three decisions where "implement" vs. "de-scope" is non-trivial and the chosen path has downstream consequences. Phase A and B are mechanical; Phase C is the deliberation surface.

## Goals / Non-Goals

**Goals:**
- Close the audit-identified MED/LOW items in one focused change.
- Make every Phase C decision explicit (no ambiguous deferrals).
- Use minimal-surface spec deltas — touch only the requirements the audit flagged.
- Land tests BEFORE documentation BEFORE code-impacting decisions, so each phase is independently mergeable if scope must shrink.
- Keep the change archive-ready when execution finishes (zero deferrals at archive time).

**Non-Goals:**
- New combat features, new unit types, new construction rules.
- Refactoring outside the audit findings.
- Coordination with the in-flight HIGH-severity workers (BLK manifest, review-flag, PSR-wiring change). Those are tracked by the `tier4-followups` team independently.
- Cross-tier MekHQ-feature parity beyond what each item already calls out.
- Re-verifying the entire Tier 1–4 baseline — this is targeted cleanup, not a full re-audit.

## Decisions

### D1 — Phase ordering: Tests → Docs → Decisions

Rationale: Tests verify existing behavior at zero risk. Documentation is low-risk and unblocks future contributors. Code-impacting decisions go last so an unexpected snag in Phase C doesn't block Phase A/B from merging as a separate PR if needed.

**Alternative considered:** Group items by affected spec (e.g., heat work together, vehicle work together). Rejected because spec-grouping mixes risk levels and would force a single mega-PR; phase-grouping allows graceful scope reduction.

### D2 — Vehicle 9.3 chin turret −1 pivot penalty: IMPLEMENT (not de-scope)

The penalty is small (one extra modifier slot in the to-hit pipeline), MegaMek's `Tank.java` carries the canonical rule, and de-scoping would leave a half-implemented requirement in the archived `vehicle-combat-behavior` spec which is exactly the kind of drift this cleanup wave is supposed to prevent.

**Implementation sketch:** Extend the to-hit modifier accumulator to detect `attacker.unitType === IGroundUnit && weapon.location === ChinTurret && weapon.firedThisTurn === true` and add a `+1 to-hit` (which is the same as `−1 effective skill`, framing depends on existing pipeline convention).

**Alternative considered:** Formal de-scope. Rejected — the requirement was never legitimately out of scope; it just got deferred without a pickup task.

### D3 — `pendingPSRs` turn-boundary clear: ALREADY IMPLEMENTED → ADD REGRESSION TEST ONLY

**Audit correction:** The Tier 1–4 audit flagged `applyPhaseChanged` as the missing clear-point. Direct verification against current main showed the audit picked the wrong function — the live behavior is correctly attached to the `TurnStarted` event handler at `src/utils/gameplay/gameState/phaseManagement.ts::applyTurnStarted` (line 60: `pendingPSRs: []`). This was a deliberate decision in the archived `wire-piloting-skill-rolls` change (task 1.3): "PSRs within a turn are deliberately NOT cleared at phase change — they accumulate and resolve in the End phase." The clear-on-turn-start semantics match TW p.52.

The PSR worker (`psr-queue-wiring`) caught this during pre-authoring verification, before any speculative spec or code was written. The same misreading affected the parallel `wire-interactive-psr-integration` change proposal — that worker correctly halted instead of authoring a no-op change.

**What this change does instead:** A regression test asserting `applyTurnStarted` clears `pendingPSRs` for every unit, since no such test exists today (verified by Grep across `src/**/*.test.ts`). This locks in existing behavior as a refactor guard.

**Alternative considered:** Document-only spec note with no test. Rejected — the implementation works but is currently unprotected by an explicit test, which is a real (if smaller) gap worth closing.

**Alternative considered (original audit's IMPLEMENT path):** Edit `applyPhaseChanged`. Rejected — that would duplicate the existing clear at the wrong layer and contradict the deliberate task-1.3 decision.

### D4 — HeadStructureDamage PSR (archived task 2.3): DE-SCOPE from spec

Canonical TW treats head hits as wound + consciousness check, not stability PSR. The original task 2.3 in `wire-piloting-skill-rolls` conflated two separate mechanics. Pilot-damage and consciousness-roll already live in the damage pipeline (audit confirmed `applyPilotDamage` is wired); only the redundant "stability PSR on head hit" reference needs to come out.

**Implementation sketch:** Edit the archived spec at `archive/2026-04-25-wire-piloting-skill-rolls/specs/piloting-skill-rolls/spec.md` to remove the head-PSR scenario. Add a `## REMOVED Requirements` delta in this change's spec delta with **Reason** and **Migration** lines. Update the historical task entry to `[x] DE-SCOPED — see tier5-audit-cleanup`.

**Alternative considered:** Implement a head-PSR. Rejected — it duplicates pilot-damage and would be a spec invention not present in TechManual.

### D5 — Vehicle Body BAR≥6: EXPLICIT COMMENT (not interim VAL guard)

The Body location only matters for support vehicles (combat vehicles legitimately can't allocate to Body). Adding a `VAL-VEHICLE-BODY-DISALLOWED` rule for combat vehicles would fire on data that's already correctly clamped to 0 — i.e., a no-op rule. The Wave 5 support-vehicle customizer surface owns the real rule.

**Implementation sketch:** Replace the bare `Body: 0` placeholder with a one-line comment block citing the Wave-5 owner change. No spec delta needed (the existing aerospace-construction spec already DEFERRED this).

**Alternative considered:** Interim VAL guard. Rejected — would add a no-op rule and complicate the validation registry without behavioral change.

### D6 — KIA-via-outcome JSDoc: WARNING ONLY (no spec delta required)

The `combat-resolution` spec correctly marks the KIA path as DEFERRED in the archived `add-combat-outcome-model` change. The audit gap is purely a consumer-awareness issue. A JSDoc on the `pilotState` field in `ICombatOutcome` is sufficient.

**Implementation sketch:** Add `@remarks` block on the `pilotState` field documenting that `'KIA'` is reachable only when Wave-5 pilot-event wiring lands. Cite `src/lib/combat/outcome/combatOutcome.ts:128-133` and the related Wave-5 change name.

**Alternative considered:** Add a `MODIFIED Requirements` delta to `combat-resolution` documenting the same. Rejected — the spec already says it; over-specifying would mean future Wave-5 work has to MODIFY again to remove the warning.

### D7 — Aerospace decisions.md backfill: WRITE-THROUGH to archive directory

The aerospace change is already archived at `archive/2026-04-25-add-aerospace-construction/`. Backfilling `notepad/decisions.md` there is unusual (archive directories are typically frozen) but is the only way to preserve accountability for the PR #388 retroactive spec additions. The audit found NO notepad entry exists for this change at all (unique among Tier 2).

**Implementation sketch:** Write the new file directly to the archive path. Add a comment at the top: "Backfilled by `tier5-audit-cleanup` (Tier 1–4 audit follow-up). Original close-out lacked a decisions log." Reference the verifier feedback that triggered the additions.

**Alternative considered:** Write the backfill to a sibling note in this change's directory instead. Rejected — that would orphan the historical context from its real change.

### D8 — TSM+heat-9 test placement

Spec scenario lives in `heat-management-system` (the spec that owns heat-effects rules). Test file co-locates with movement tests since walk-MP computation is a movement concern. **Path: `src/utils/gameplay/movement/__tests__/tsmHeatInteraction.test.ts`** (new file). Justification: TSM is a heat-triggered effect but the assertion is about MP, and movement tests already verify other MP modifiers.

### D9 — Vehicle armor 40/20/20/10/10 assertions: store test, NOT component test

The auto-allocate logic lives in the vehicle store (`useVehicleStore.autoAllocateArmor`). Component test (`VehicleArmorDiagram.test.tsx`) currently checks UI binding only. The ratio is a data-layer concern, so the assertion belongs at the store level (likely an existing test like `useVehicleStore.autoAllocate.test.ts`). Component test stays unchanged.

## Risks / Trade-offs

- **Risk:** Phase C decisions (D2, D3, D4) cause unexpected test failures elsewhere. → **Mitigation:** Each Phase C item is a separate task with its own test-suite gate; if one breaks something we don't expect, that task can be split into its own PR without holding up Phase A/B.
- **Risk:** Backfilling an archived `notepad/decisions.md` (D7) sets a precedent for editing archived changes. → **Mitigation:** Document this as a one-off audit artifact in the file itself; the broader rule "archives are immutable" still stands.
- **Risk:** Extending `applyPhaseChanged` (D3) interacts subtly with the in-flight `wire-interactive-psr-integration` change being authored by the parallel worker. → **Mitigation:** Tier 5 lands AFTER the HIGHs merge; coordinate at execution time by re-reading the PSR-wiring change before touching `applyPhaseChanged`.
- **Trade-off:** Bundling 9 items into one change creates a larger PR. → Acceptable because phase-grouping allows graceful split if reviewer pushback warrants it.

## Migration Plan

1. Land this change AFTER all three Tier 4 HIGH-severity PRs merge to main.
2. Execute Phase A (tests) first — green CI proves nothing regressed before touching code.
3. Execute Phase B (docs) next — atomic doc commits.
4. Execute Phase C (decisions) last, one task per PR-internal commit so each can be reverted independently if needed.
5. After all phases: re-run `npx openspec validate tier5-audit-cleanup --strict`, archive the change with `npx openspec archive tier5-audit-cleanup`.

No rollback strategy needed beyond standard `git revert` per commit — none of these items touches data persistence or external integrations.

## Open Questions

- (resolved by D2) Should chin turret penalty land or de-scope? → Land.
- (resolved by D3) Should `pendingPSRs` clear at turn boundary? → **Already implemented** in `applyTurnStarted` per archived `wire-piloting-skill-rolls` task 1.3. Add regression test only.
- (resolved by D4) Implement head-PSR or de-scope? → De-scope.
- Should the historical `archive/2026-04-25-wire-piloting-skill-rolls/tasks.md` be edited to mark task 2.3 `[x] DE-SCOPED`, or do we leave the archive frozen and rely on this change's REMOVED Requirements delta as the audit trail? → **Open** — proposal: edit the archived tasks.md with a backreference (consistent with D7 precedent), but flag for review during execution.

## Audit Corrections (lessons learned mid-authoring)

The Tier 1–4 audit (plan at `~/.claude/plans/look-at-tiers-1-eventual-seahorse.md`) contained two false positives that were caught during pre-authoring verification of this change and the parallel `wire-interactive-psr-integration` work:

1. **PSR queue interactive-combat integration** — flagged as HIGH-severity missing wiring. Direct verification showed `GameEngine.phases.ts:384/391/417`, `InteractiveSession.ts:327/342/361-363` all carry the integration with explicit `wire-piloting-skill-rolls` task citations in comments. The audit conflated the archived `notepad/learnings.md` "key integration gaps" snapshot (which was the gap-discovery moment that the change was AUTHORED to close) with current state. → Killed the speculative `wire-interactive-psr-integration` change before any artifacts were written.
2. **`pendingPSRs` turn-boundary clear** — flagged as missing in `applyPhaseChanged`. Direct verification showed the clear lives in `applyTurnStarted:60` (correct per the archived change's deliberate task-1.3 decision). → Demoted from D3 IMPLEMENT to D3 REGRESSION-TEST-ONLY (above).

Process takeaway: when an audit cites `notepad/learnings.md` as evidence of an unresolved gap, the auditor MUST cross-check `tasks.md` for the same items being marked `[x]` complete. The notepad is a snapshot of discovery; the tasks file is the authoritative state-as-of-archive.
