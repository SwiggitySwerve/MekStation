# Notepad — Learnings

Cumulative conventions and patterns discovered during implementation.

## [2026-05-06] Task: P0 — SeededD6Roller adapter + roller threading

**Convention discovered**: The roller-threading pattern is `optional 4th parameter`. `checkCriticalHitTrigger(structureDamage, roller?)` and `resolveDamage(state, location, damage, roller?)` both accept an optional `roller?: D6Roller` defaulting to `defaultD6Roller`. P3/P4 tasks that thread the roller deeper into `resolveCriticalHits`, `weaponAttack.ts`, `runHeatPhase`, and ammo-explosion handlers MUST follow the same pattern: optional, defaulted, last positional.

**Why it matters**: Existing production callsites pass positional `(state, location, damage)` — making `roller` optional/last keeps every callsite green without a sweep. Tests opt in with an explicit `SeededD6Roller(seed).asD6Roller()` argument.

**Reference**: `src/simulation/core/SeededD6Roller.ts:46`, `src/utils/gameplay/damage/critical.ts:21`, `src/utils/gameplay/damage/resolve.ts:40`.

## [2026-05-06] Task: P0 — Determinism audit allowlist

**Convention discovered**: The CI grep guard for `Math.random()` in `src/utils/gameplay/` and `src/simulation/` needs an allowlist for legitimate non-dice entropy. Four paths are pre-allowlisted in `.github/workflows/pr-checks.yml` (`determinism-audit` job): `diceTypes.ts` (the seam itself), `aerospace/criticalHits.ts` (dead path, comment notes "unused; resolver overrides"), `terrainGenerator.ts` (procgen seed fallback), `QuickResolveService.ts` (crypto.getRandomValues fallback when no Web Crypto API).

**Why it matters**: Future PRs that add `Math.random()` to those scopes must either (a) thread a `D6Roller`, or (b) extend the allowlist with rationale. Comment lines mentioning `Math.random()` (block-comment `*` or line-comment `//`) are stripped before the audit so doc-comments don't false-positive.

**Reference**: `.github/workflows/pr-checks.yml` `determinism-audit` job.

## [2026-05-06] Task: P0.5 — Closed-set hygiene (UnitDestroyed.cause + pilot/match terminal states)

**Convention discovered — the closed-set audit pattern (reusable for any future enum reconciliation)**:

When you reconcile a single closed-set enum across multiple type files, run this checklist verbatim. P0.5 surfaced 5 separate edits across 4 files that the original task list under-named (the spec mentioned 3 type files; the actual fix touched 4 because the same union appeared as a function-parameter type in `src/utils/gameplay/gameEvents/status.ts:121`).

1. Define the canonical N-value literal union in the spec delta. Pick one casing (snake_case won here per design D8 — live code was already overwhelmingly snake_case across 15+ files).
2. Identify EVERY type file declaring the field. Grep `cause:` / `destructionCause:` across `src/`. Don't trust the spec delta to enumerate all sites.
3. Update the union in EACH file to the IDENTICAL set, IDENTICAL order, IDENTICAL members. Cross-file symmetry is the contract — any reader of any one file must see the same set.
4. Grep for stale literal forms (kebab-case here) anywhere in `src/`. Use multiple variants — `'foo-bar'`, `"foo-bar"`, backtick-`foo-bar` — to catch tests that compare strings instead of importing the type.
5. Disambiguate "sibling" taxonomies that LOOK like the target enum but are actually independent. P0.5 found three sibling kebab taxonomies that should NOT be touched:
   - `KeyMomentType` at `src/types/simulation-viewer/IKeyMoment.ts:37` — replay-UI key-moment classifier (`'first-blood'`, `'ammo-explosion'`, etc.). Independent.
   - `damageFeedback.IFormattedHeadOrPilotEntry.emphasis` at `src/components/gameplay/damageFeedback.ts:150` — UI emphasis bucket (`'head-hit' | 'pilot-killed' | 'pilot-unconscious'`). Independent UI styling enum.
   - `IKeyMoment.type` at `src/components/simulation-viewer/pages/encounter-history/types.ts:79` — encounter-history UI. Independent.
   The kebab string `'ammo-explosion'` appears in all three — but only inside their own closed sets, never as a `UnitDestroyed.cause` value. Field-name (`type:` / `effect:` / `emphasis:` vs `cause:` / `destructionCause:`) is the disambiguator.
6. Run typecheck after the symmetric edit. Widening a union is backward-compatible; narrowing is not. P0.5 only widened.

**Why it matters**: Without rule (2) the work would have shipped asymmetric (4-value union in `gameEvents/status.ts` + 7-value union elsewhere — bypass the symmetry contract). Without rule (5) the PR would have ballooned with unrelated UI-taxonomy edits and broken `KeyMomentDetector` / encounter-history. The cross-taxonomy-disambiguation step is where most kebab-purge PRs lose discipline.

**Reference**: `src/types/gameplay/GameSessionInterfaces.ts:762`, `src/types/gameplay/CombatInterfaces.ts:339`, `src/utils/gameplay/damage/types.ts:20`, `src/utils/gameplay/damage/types.ts:45`, `src/utils/gameplay/gameEvents/status.ts:115`.

## [2026-05-06] Task: P0.5 — oxfmt PostToolUse hook quirk

**Convention discovered**: The PostToolUse Edit hook runs `oxfmt` with the binary's default config (DOUBLE quotes, different line-wrap) — but the project's `.oxfmtrc.json` declares `singleQuote: true`. After every Edit/Write, the hook reformats freshly-edited files with the wrong quote style, which `format:check` then flags as drift.

**Workflow**: After every Edit/Write, run `npx oxfmt --write <file>` to reformat with the project config. The git diff will collapse from ~150 lines of quote churn down to the actual surgical change. No project-config change needed — strictly a workflow concern.

**Reference**: `.oxfmtrc.json` (`singleQuote: true`), `package.json` `lint-staged` (uses the same `oxfmt --write` invocation that picks up the project config).

## [2026-05-06] Task: P0.5 — Forbidden-files coordination with parallel worktree

**Convention discovered**: When the boss agent lists files as off-limits because a parallel worktree is editing them, **importing already-exported symbols from those files is safe** — only EDITS are forbidden. P0.5 imports `isUnitOperable` from `SimulationRunnerState.ts` (forbidden for edits) into `SimulationRunner.ts` (NOT forbidden) to compute survivor counts for the new `determineMatchTerminalState` call. This kept the new classifier consistent with the existing `determineWinner` predicate without duplicating the logic.

**Why it matters**: A naive reading of "do NOT touch" would have led to writing a parallel `isUnitOperableLocal` predicate that drifts from the canonical one. The right rule is: read-only imports are coordination-safe, edits aren't.

**Reference**: `src/simulation/runner/SimulationRunner.ts:36` imports `isUnitOperable` (existing export); `src/simulation/runner/matchTerminalState.ts` is the new file the parallel P1 won't touch.

## [2026-05-06] Task: P0.5 — Conservation invariant tests synthesize their fixtures

**Convention discovered**: The `after-combat-report` spec asserts pilot-side conservation (`count('kia') === count(UnitDestroyed events with cause 'pilot_death' or 'head_destroyed')`). At P0.5 the runner doesn't emit `UnitDestroyed { cause: 'head_destroyed' }` yet (that wires in P3). So the conservation test in `src/simulation/runner/__tests__/matchTerminalState.test.ts` asserts the invariant on **synthetic** event-payload + summary fixtures — small enough (2-3 pilots per side) that the per-side AND global rollups are obvious by reading the test.

**Why it matters**: Future P3 (event wiring) and P5 (MetricsCollector hydration) tasks can extend the same test to consume real event logs from a seeded match. The structural invariant doesn't change; only the source of the events does. Keep the synthetic fixtures around as the "schema" assertion even after real-event tests land.

**Reference**: `src/simulation/runner/__tests__/matchTerminalState.test.ts` — see the `Pilot match summary — conservation invariants` describe block.

