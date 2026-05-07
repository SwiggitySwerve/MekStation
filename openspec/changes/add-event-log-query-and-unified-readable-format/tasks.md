# Tasks

## 1. Authoring

- [x] 1.1 Author proposal.md
- [x] 1.2 Author combat-analytics spec delta (EventLogQuery Filter Utility Contract — 5 scenarios)
- [x] 1.3 Author quick-session spec delta (Readable Event-Log Companion Columnar Layout — 4 scenarios)

## 2. EventLogQuery utility

- [x] 2.1 Create `src/simulation/core/EventLogQuery.ts` with chainable filter methods (`ofType`, `byUnit`, `bySide`, `inTurn`, `inPhase`, `whereActor`, `toArray`, `count`, `first`)
- [x] 2.2 `bySide` reads envelope `event.side` first; falls back to `MetricsCollector.sideFromUnitId(event.actorId)` lookup for legacy streams
- [x] 2.3 `byUnit` matches `event.actorId === unitId` OR `event.payload.unitId === unitId`
- [x] 2.4 All methods return new `EventLogQuery` instances (immutability)
- [x] 2.5 Create `src/simulation/core/__tests__/EventLogQuery.test.ts` covering all 5 spec scenarios + edge cases (empty array, no-match filter, chained immutability)

## 3. MetricsCollector + combatFidelityTally adoption

- [x] 3.1 Extract `sideFromUnitId` to `src/simulation/core/sideFromActor.ts` so `EventLogQuery` (in `core/`) can import it without pulling the metrics module; `MetricsCollector` re-exports the helper so the documented `MetricsCollector.sideFromUnitId` surface stays stable. The single-pass switch loop in `MetricsCollector.ts` remains unchanged — splitting it into multiple `EventLogQuery` filter passes would be O(N×k) instead of O(N), which the spec's "behavior MUST stay equivalent" rule prohibits.
- [x] 3.2 `combatFidelityTally.ts` keeps its single-pass switch loop for the same O(N) reason.
- [x] 3.3 Combat-fidelity scenario tests + Monte Carlo distribution tests confirm behavior equivalence (1177 simulation tests pass).

## 4. Python columnar formatter

- [x] 4.1 Rewrite `scripts/format-event-log.py` to emit the fixed-width columnar prefix per the format string `s<seq:5d> t<turn:2d> <phase:8s> <side:9s> <actor:14s> <action:24s>  <action-summary>` (69-char prefix + 2 literal spaces, summary at column 71).
- [x] 4.2 Side derivation: read `event.side` if present; else fall back to `event.actorId` prefix lookup (`'player-' → 'player'`, `'opponent-' → 'opponent'`); else `'system'`
- [x] 4.3 Per-category summary: implement the 10 templates (MOVE / WEAPON / MELEE / DAMAGE / CRIT / HEAT / PSR / AMMO / LIFECYCLE / FLOW)
- [x] 4.4 MOVE summary uses `payload.steps` when present to render `[forward,turn,forward,...]` chain; falls back to legacy `flags=movementType` when absent
- [x] 4.5 Hex coordinates rendered via the existing `coord_to_board_label` helper (added in PR A)
- [x] 4.6 Smoke-run formatter on the latest swarm `*.jsonl` and verify: every line has the columnar prefix, MOVE summary shows `mp=<n>` decomposition with optional `disp=<d>` and `[step-kinds]` when present, every search via `awk '$3 == "movement"'` / `grep ' player '` returns expected results

## 5. Verification

- [x] 5.1 `npm run typecheck` clean
- [x] 5.2 `npm run lint` clean (42 pre-existing warnings, 0 errors)
- [x] 5.3 `npm test` green for the simulation suite (1177 tests pass; new EventLogQuery suite adds 16 tests)
- [x] 5.4 `python -c "import ast; ast.parse(open('scripts/format-event-log.py').read())"` clean (Python syntax check)
- [x] 5.5 `npx openspec validate add-event-log-query-and-unified-readable-format --strict` clean

## 6. PR

- [ ] 6.1 Commit on branch `event-log/pr-d-query-and-columnar`
- [ ] 6.2 Open PR against `main` with title `feat(event-log): add EventLogQuery utility + 74-char fixed-width columnar readable format`
- [ ] 6.3 Wait for CI green
- [ ] 6.4 Merge with `--squash --delete-branch`

## 7. Archive

- [ ] 7.1 After merge, run `npx openspec archive add-event-log-query-and-unified-readable-format --yes` — clean
- [ ] 7.2 Open archive PR; merge
