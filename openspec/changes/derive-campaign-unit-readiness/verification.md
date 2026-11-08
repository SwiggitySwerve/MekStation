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

## Hosted CI follow-up for #3053

The failing unit contract was confirmed: `pilot_unassigned` moved from warnings
into blockers. Canonical `campaign-management` / ?Creation Wizard Roster
Persistence? explicitly required a warning. The change now has a MODIFIED delta
for that whole requirement, citing pinned MekHQ `Unit.checkDeployment()` lines
1660?1691, which rejects a unit with no required pilot. The creation regression
asserts the reason exactly once in blockers, absent from warnings, retaining its
code, message, ?Assign pilot? label and exact personnel deep link.

The hosted fresh-construction trace from run `42466752480`, job `128687991462`,
shows `catalog_loading` and the pending authority read incorrectly presented as
`readiness_authority_unavailable`. Both checkboxes were disabled and unchecked
when `selectAllRosterUnits` inspected them. The captured final page subsequently
shows two assigned pilots, two eligible checked units and ?Launch ready?. There
was no missing-pilot, destroyed-unit or missing-journal-roster refusal.

The hook now distinguishes client loading from unavailable authority. The
projection exposes loading, admission stays blocked while facts are pending,
and the selection panel appears after both reads settle. This preserves stored
snapshot/journal authority and the existing full-health construction rule; no
E2E assertion, seed, fixture or outcome was changed.

Regression evidence includes the actual wizard submit path creating two distinct
instances of the same canonical design with assigned vault pilots and no combat
states; both are eligible and selected. Projection tests cover both absent and
pinned construction maxima. The route regression covers pending authority,
then two enabled checked units. Projection tests independently cover pending
catalog reads, and hook tests cover old-response snapshot fallback and failed
reads settling to unavailable.

A shared reason display now preserves every reason and its action in dashboard
roster cards, Mech Bay and launch. Component regressions assert the unchanged
pilot message and assignment href, including a Mech Bay row whose third reason
was previously truncated. The existing first-fix test id is retained.

Local browser attempt: the unchanged requested E2E spec could not reach the
wizard. This worktree's `node_modules` junction points to another drive.
Turbopack refused the junction as outside its filesystem root; a Webpack retry
failed resolving `./E:/Projects/Personal/MekStation/node_modules/next/dist/client/next-dev.js`
and served HTTP 500 before campaign creation. This is not a passing browser
result. The unit/component regressions reproduce the actual submit facts and
pending-to-ready selection sequence; the hosted E2E rerun remains required.

Follow-up gate evidence:

| Check | Result |
| --- | --- |
| Red route regression | Completed panel incorrectly visible while authority pending |
| Red dashboard and Mech Bay regressions | Assignment action absent / pilot reason truncated |
| Full directory run, including all campaign pages | 597 suites, 6,742 tests passed; 35 skipped |
| Both TypeScript configurations | Passed |
| Whole-repository formatting | Passed |
| Root lint | 63 warnings, zero errors |
| lint-units and its Jest suite | Passed, 17,082/17,085 |
| `npm run validate:combat` | Passed: 79 suites, 2,107 tests, gap checks and strict spec validation |
| OpenSpec strict / CI quality | 257 passed; zero quality errors |
| Budget | 57 unkeyable unchanged; known repository-wide failure 94/93 remains |

Both required mutants were rerun and restored. Forcing cached readiness was
killed by ?uses repaired combat facts instead of a stale destroyed roster cache?
in `selectUnitReadiness.test.ts`. Removing server admission was killed by
?refuses a direct mission request when stored repair work blocks a deploying
unit? in `coopMissionCreate.refusals.test.ts`.

Fast-forward live parity, fast-forward determinism, campaign-combat-loop,
engine golden/recovery, runner, replay and both digest suites pass with unchanged
fixtures. No admission-driven seeded outcome changed. The prior hosted Linux
pack failure was also inspected: Electron download HTTP 504, matching Root's
reported external outage; the aggregator failure follows the failed jobs.
