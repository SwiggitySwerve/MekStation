# Tasks: Wave 6.2 — Gap Polish Batch

## 1. Quick Game UI selectors (gaps #4 + #6)

- [ ] 1.1 `src/components/quick-game/QuickGameSetup.tsx`: add scenario-type Select bound to `useQuickGameStore.scenarioConfig.scenarioType`. Options: `Annihilation` | `CTF` | `Defend` | `Breakthrough`. Default: `Annihilation` (existing behavior preserved). Testid `quick-game-scenario-select`.
- [ ] 1.2 Same file: add AI-tier Select bound to `useQuickGameStore.scenarioConfig.aiTier`. Options: `Green` | `Regular` | `Veteran` | `Elite`. Default: `Regular` (existing behavior preserved). Testid `quick-game-ai-tier-select`.
- [ ] 1.3 Tests: setting either Select updates `useQuickGameStore.scenarioConfig` and the launched session picks it up

## 2. Host-review proposal timeout (gap #3)

- [ ] 2.1 `src/lib/multiplayer/server/CampaignGmArbiter.ts`: add `proposalTimeoutMs?: number` constructor option (default 5 * 60_000)
- [ ] 2.2 When a proposal sits in `pending` longer than the timeout, the arbiter automatically resolves it with `{ decision: 'veto', reason: 'host-review-timeout' }` so the guest's `<GuestProposalSurface>` pending overlay resolves
- [ ] 2.3 The auto-veto MUST be visually distinct from a host-driven veto (existing distinction via `decision.reason` is sufficient — the surface reads `reason` to label the badge)
- [ ] 2.4 Tests: a proposal that times out emits the auto-veto decision; the timeout is configurable; resolved proposals do NOT receive an auto-veto

## 3. StateCycleDetector positional scope (gap #7, closes PT-001)

- [ ] 3.1 `src/simulation/detectors/StateCycleDetector.ts`: extend `snapshotKey` builder to include each unit's `position` field, not just `heat` / `armor` / `structure`
- [ ] 3.2 Add a unit test asserting that the same unit at the same heat but different positions produces a different snapshot key (i.e. doesn't false-positive as a state cycle)
- [ ] 3.3 Re-run the Phase-1 smoke matrix and confirm the StateCycleDetector hit rate drops below 5% (was 96% per `playtest/phase-1/SMOKE_TRIAGE.md`)
- [ ] 3.4 Close PT-001 in `playtest/ISSUES.md` referencing this PR

## 4. Force generator high-BV unitCount widening (gap #11, closes PT-010)

- [ ] 4.1 `src/lib/forceGenerator/forceGeneratorEngine.ts`: catch `BudgetUnsatisfiableError` at the requested `unitCount`; retry once at `unitCount + 1` before re-throwing
- [ ] 4.2 The retry MUST be opt-out via an `exactUnitCount: true` option for callers that need strict matching (e.g. PvP balance tests)
- [ ] 4.3 Tests: the 10k BV / unitCount=2 case that PT-010 reproduces now succeeds with the widened retry; unitCount=2 with `exactUnitCount: true` still throws
- [ ] 4.4 Close PT-010 in `playtest/ISSUES.md` referencing this PR

## 5. TurnLimit tuning for r20+ maps (gap #12, closes PT-003)

- [ ] 5.1 `src/simulation/generator/ScenarioGenerator.ts`: default `turnLimit` becomes `Math.max(50, mapRadius * 4)` (was static 50). For r12 maps stays at 50 (max-pinned); for r20 maps becomes 80.
- [ ] 5.2 Tests: r12 default unchanged at 50; r20 default 80; explicit `turnLimit` passed by caller is still respected
- [ ] 5.3 Re-run the Phase-1 smoke matrix r20 configs; confirm the 50-turn-draw rate drops below 50%
- [ ] 5.4 Close PT-003 in `playtest/ISSUES.md` referencing this PR

## 6. Spec deltas + verification

- [ ] 6.1 Author delta at `openspec/changes/polish-wave-6.2-gaps/specs/quick-game-ui/spec.md` with the scenario + AI-tier selector requirements
- [ ] 6.2 Author delta at `openspec/changes/polish-wave-6.2-gaps/specs/coop-campaign-sync/spec.md` with the proposal-timeout requirement (modifies existing capability)
- [ ] 6.3 Author delta at `openspec/changes/polish-wave-6.2-gaps/specs/simulation-system/spec.md` with the StateCycleDetector position-scope + turnLimit defaults requirements
- [ ] 6.4 Author delta at `openspec/changes/polish-wave-6.2-gaps/specs/force-generator/spec.md` with the unitCount-fallback requirement
- [ ] 6.5 `openspec validate polish-wave-6.2-gaps --strict` passes
- [ ] 6.6 `npm run verify:full` passes
- [ ] 6.7 Archive the change to `openspec/changes/archive/2026-MM-DD-polish-wave-6.2-gaps/` after merge; sync deltas to source-of-truth specs

## 7. Closeout corrections

- [ ] 7.1 Trim gaps #3, #4, #6, #7, #11, #12 from `playtest/CLOSEOUT.md` "Gaps logged" section (note them as closed by this PR)
- [ ] 7.2 Update `playtest/ISSUES.md` Phase counts row reflecting PT-001 / PT-003 / PT-010 closures
