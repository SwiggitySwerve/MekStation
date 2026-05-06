# Notepad: Learnings (`add-encounter-swarm-harness`)

Cross-delegation wisdom curated by the orchestrator. Subagents READ this before delegating, never write.

## [2026-05-05 SEED] Pre-execution audit findings (verified by Council Phase 0 + Phase 1)

**Verified file paths and line numbers** (all confirmed via Glob/Read at plan time — agents may treat these as authoritative starting points but MUST re-verify with `Read` before editing):

- `src/simulation/runner/SimulationRunnerSupport.ts:134` — line where `gunnery: DEFAULT_GUNNERY` hardcoding lives. **Phase 1 target.**
- `src/types/gameplay/GameSessionInterfaces.ts` ~line 1207 — `IUnitGameState` definition. Council explore says `gunnery`/`piloting` exist via `pilotRef`/`gunnery`/`piloting` already; verify before widening.
- `src/services/encounter/encounterToGameSession.ts:183-202` — `buildGameUnitsForForce` already binds pilots into `IGameUnit`. **Reuse unchanged. Do NOT modify.**
- `src/engine/adapters/CompendiumAdapter.ts:465` — synchronous `adaptUnitFromData(fullUnit, options)`. Use this for bulk Node-side use, not the async `adaptUnit` path.
- `src/engine/adapters/CompendiumAdapter.ts:237` — Clan weapon → IS fallback. Acceptable for swarm balance work; do not refactor.
- `scripts/validate-bv.ts:4648-5193` — fs catalog loader pattern. **Lift this for Phase 2's `NodeCanonicalUnitService`.**
- `src/simulation/__tests__/integration.test.ts:197-216` — existing 100-game `BatchRunner.runBatch` test. New batch tests follow same pattern. **Existing test must continue to pass.**
- `src/simulation/runner/BatchRunner.ts` — 26 lines, sequential `for` loop. **Do NOT add `worker_threads` (Phase 7 deferred).**
- `src/simulation/runner/SimulationRunner.ts:61` — current `new BotPlayer(this.random)` site. **Phase 3 injection seam.**
- `src/simulation/ai/BotPlayer.ts` — concrete class, no interface. Phase 3 adds `implements IAIPlayer` with no behavior change.
- `src/simulation/core/SeededRandom.ts` — Mulberry32 PRNG, instance-scoped, deterministic. **Reuse via injection only.**
- `src/simulation/core/WeightedTable.ts` — weighted random table. Reuse for Phase 4 random force generator.
- `src/simulation/QuickResolveService.ts` — in-browser Monte Carlo path. **Separate code path; CLI swarm does NOT touch this file.**

## [2026-05-05 SEED] Conventions to honor

**OpenSpec change house style** (per archived `2026-04-25-add-bot-retreat-behavior`):
- Tasks: numbered sections like `## 1. Section Name`, items `- [x] N.M Description`. When a task is complete, flip the checkbox and append a one-line evidence note (path:line OR test § name).
- Spec deltas: `## ADDED Requirements` / `## MODIFIED Requirements`, `### Requirement: Name`, `#### Scenario: ...`, GIVEN/WHEN/THEN bullets.
- Commit messages: conventional commits (`feat(scope):`, `fix(scope):`, `chore(scope):`, `refactor(scope):`).

**Codebase conventions** (verified at plan time — corrected MEMORY drift):
- TypeScript strict mode always.
- Zod validation at boundaries; infer types from schemas.
- Discriminated unions over class hierarchies.
- File naming: kebab-case for files, PascalCase for classes/types/interfaces (`IFoo` prefix).
- **Formatter is `oxfmt`, NOT Prettier.** lint-staged runs `oxlint --fix && oxfmt --write && tsc --noEmit --skipLibCheck` on `*.{ts,tsx}`. CI runs `oxfmt --check`.
- **`oxfmt` uses double-quotes by default.** Files in the repo are in mid-transition between single and double; oxfmt flips them on touch. Expect a small quote-flip diff near every edit. **MEMORY's "Prettier 140 char, single quotes" note is STALE — do not enforce single quotes.**
- Logger: `private readonly logger = new Logger(ClassName.name)` — never `console.*` in source code.
- Avoid `any`; never `as any` / `@ts-ignore` / `@ts-expect-error` (HARD BLOCK per omo-orchestration).

**Test conventions** (per `src/simulation/__tests__/`):
- Vitest / Jest based; use `describe` / `it`; place under `__tests__/<name>.test.ts` or beside the source file.
- Use seeded `SeededRandom` for any randomized assertion to avoid flake.
- For statistical assertions: prefer 3σ tolerance or pin seed; 2% tolerance over 100k samples flakes (~3e-5/face).

## [2026-05-05 SEED] Dependency-flow between phases

| From | To | What flows |
|---|---|---|
| Phase 1 | Phase 4 + Phase 5 | Real pilot skills land in `IAIUnitState`, so random pilot synthesis becomes meaningful when Phase 4 lands |
| Phase 2 | Phase 5 | `NodeCanonicalUnitService` is consumed by the CLI swarm runner |
| Phase 3 | Phase 4 + Phase 5 | `IAIPlayer` interface + `aiPlayerFactory` + `behaviorVariants` registry; Phase 5 wires `--ai-side-a/b` flags through this |
| Phase 4 | Phase 5 + Phase 6 | `participants` payload + `schemaVersion: 2` lands. Phase 5 emits it; Phase 6 rolls up from it |
| Phase 5 | Phase 6 | CLI swarm produces `ISimulationRunResult[]` with `schemaVersion: 2` for aggregation tests |

## [2026-05-05 SEED] Wave plan (orchestrator's PR cadence)

| Wave | Phase(s) | Branch / PR | Workers |
|---|---|---|---|
| 1 | Spec authoring + Phase 1 | `claude/suspicious-beaver-5930d5` (this worktree) | 1 hephaestus |
| 2 | Phase 2 \|\| Phase 3 | 2 fresh worktrees, 2 PRs | 2 hephaestus parallel |
| 3 | Phase 4 | 1 fresh worktree, 1 PR | 1 hephaestus |
| 4 | Phase 5 \|\| Phase 6 | 2 fresh worktrees, 2 PRs | 2 hephaestus parallel |
| 5 | Archive | 1 PR (or merge into final phase PR) | inline |

Each wave: workers open PRs → orchestrator verifies spec + reads diffs + waits CI green → orchestrator merges → fresh `git checkout main && git pull` → next wave's worktrees branch from updated main.
