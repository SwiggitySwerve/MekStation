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

