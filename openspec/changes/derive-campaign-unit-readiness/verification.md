# K6 verification — 2026-11-08

Base: `05257e185c87aaa1d4141b58d7c69b59ab0c6e46`.
Consolidation commit: `314b9d36a`.
Runtime: Node 22.22.0, matching the existing SQLite native ABI. The initial
Node 24 baseline attempt could not load that ABI and is not counted as proof.

## Evidence

| Check | Result |
| --- | --- |
| Before-change integration, fast-forward, engine, runner, replay and digest baseline | 246 suites, 2,722 tests passed; 32 skipped |
| Consolidation characterization | 4 suites, 17 tests passed, unchanged decisions and copy |
| Behavior red run | 10 failures across selector, reader and authority-route tests |
| Direct server admission red run | Stored blocking repair was incorrectly admitted with HTTP 201 |
| Final broad directory run | 589 suites, 6,709 tests passed; 35 skipped |
| Final integration and launch rerun after launch-context correction | 69 suites, 819 tests passed; 32 skipped |
| Both TypeScript configurations (`npm run typecheck`) | Passed |
| Root lint | 63 warnings, zero errors; ceiling unchanged |
| `npm run lint:units` | Passed, 17,082/17,085; ceilings unchanged |
| lint-units Jest suite | Included in the broad run |
| `npm run validate:combat` | Passed |
| `npx openspec validate --all --strict` | 257 items passed |
| Formatting | `npx oxfmt` applied; whole-repository format check passed |
| Unkeyable budget | 57, unchanged |
| Repository-wide cache budget | **Fails: 94 against 93; also 94 on the original base** |

The broad run covers the complete readiness, encounter, fast-forward, campaign
store/type, campaign component/bay/dashboard, campaign page/module, API module,
multiplayer server, integration, engine and simulation-runner test directories.
It also includes replay determinism, viewer digest equivalence, command digest
lock and the lint-units Jest suite. The engine determinism and recovery suites
exercise the golden traces. No committed golden fixture, digest, snapshot,
runner citation catalog, or replay schema pack changed.

The UI regression holds the roster's Damaged cache constant while a repair
updates canonical combat state; the badge becomes Ready. This is component
proof, not a claim that browser acceptance testing ran.

## Mutants

- Force `selectUnitReadiness` to return `unit.readiness`: killed by
  `selectUnitReadiness.test.ts` → “uses repaired combat facts instead of a stale
  destroyed roster cache.”
- Remove the server co-op readiness loop: killed by
  `coopMissionCreate.refusals.test.ts` → “refuses a direct mission request when
  stored repair work blocks a deploying unit.”

Both mutated source files were restored before the passing runs.

## Compatibility and limits

- The new response field is optional; older successful launch-head responses
  fall back to snapshot authority. Shadowing authority has its own route test.
- Journal reads use the existing campaign journal-state owner, which currently
  folds the root command branch used by production campaign writers.
- Server co-op admission uses saved roster/pilot/repair/refit facts and stored
  journal status. Co-op fixture setup now supplies real assigned-pilot facts;
  the seeded fast-forward fixtures and their outcomes were not changed.
- No persisted format, event shape, construction/BV/data source or
  `campaignBayActions.ts` change.
- The repository-wide cache-budget failure is pre-existing. It was confirmed
  by evaluating the original base source through the same keyer. No budget,
  allowlist, or unrelated integration test was changed to hide it.

Raw local command logs are retained in
`E:/Projects/Personal/_scratch/sm-audit-reports/k6-evidence/`.
Hosted checks and draft PR delivery follow the behavior commit; Root owns
review and merging.
