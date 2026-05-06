# Notepad: Issues (`add-encounter-swarm-harness`)

Problems encountered and how they were resolved. Append on every blocker → resolution.

## [2026-05-05 SEED] Anticipated issue: `CompendiumAdapter` browser-only deps in Node

**Status**: Unverified — flagged as the primary risk by OMO Oracle in Phase 2 Council.

**Symptom (anticipated)**: `tsx scripts/run-simulation.ts` invoking `CompendiumAdapter.adaptUnitFromData` errors at module-load with browser-only imports (e.g., `next/router`, DOM globals).

**Resolution path**: If reproduced, do NOT refactor `CompendiumAdapter`. Instead, factor a pure-Node loader path adjacent to `adaptUnitFromData` that bypasses any browser-only imports. The function's body is what matters; the module's surface is what may be browser-coupled.

**Verification step**: Phase 2 Task 2.6 — run `tsx -e "require('./src/engine/adapters/CompendiumAdapter')"` standalone before integrating.

## [2026-05-05 SEED] Anticipated issue: `IUnitGameState` may not actually carry `gunnery` / `piloting`

**Status**: Unverified — Council Phase 1 explore says yes, but the field-level read needs to be confirmed by Phase 1 Task 1.1.

**Symptom (anticipated)**: Phase 1 Task 1.4 attempts `unit.gunnery ?? DEFAULT_GUNNERY` but the type says `unit` has no `gunnery` field.

**Resolution path**: If type rejects, widen `IUnitGameState` and update `createInitialState` / `createMinimalUnitState` to seed both fields. This is documented as a wider-but-straightforward ripple in design.md D1's risk row.

## [2026-05-05 SEED] Anticipated issue: Husky lint-staged stash-restore corruption

**Status**: Known repo-wide issue, recovery pattern documented in MEMORY.

**Symptom**: After `git commit`, `git status` shows files as untracked/modified that were just staged + committed; the commit ends up empty.

**Recovery pattern** (from MEMORY): `git restore .` + `git clean -fd` to clear partial state → `git stash pop stash@{0}` → re-stage with `git add -A` → `git commit --amend --no-edit` to fold into the empty commit. If on a PR branch, follow with `git push --force-with-lease`.

**Mitigation**: Pre-commit hook runs `npx pretty-quick --staged`. Pre-push runs full lint. If a commit looks empty after running, immediately check `git stash list`.
