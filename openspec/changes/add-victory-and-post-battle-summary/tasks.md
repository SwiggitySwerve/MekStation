# Tasks: Add Victory And Post-Battle Summary

## 1. Win Condition Detection

- [x] 1.1 Extend session End-phase victory check: last side standing
      (already exists) + turn-limit reached + concede
- [x] 1.2 Turn-limit behavior: if `turn > config.turnLimit` with both
      sides still active, `GameEnded` fires with `reason: 'turn_limit'`
- [x] 1.3 Concede: `InteractiveSession.concede(side)` appends `GameEnded`
      with `reason: 'concede'` and the opposite side as winner
- [x] 1.4 Unit tests for each of the three end conditions

## 2. Concede Button

- [ ] 2.1 Phase HUD adds a small "Concede" button visible for the
      Player-side only
- [ ] 2.2 Clicking shows a confirm dialog `"End the match?"`
- [ ] 2.3 Confirm invokes `concede(Player)` on the session

## 3. Victory Screen

- [ ] 3.1 New route `/gameplay/games/[id]/victory`
- [ ] 3.2 Store selector `isGameCompleted` redirects from
      `/gameplay/games/[id]` to `/victory` when the session's status
      flips to `Completed`
- [ ] 3.3 Victory screen shows winner side, reason (`destruction` |
      `concede` | `turn_limit`), turn count, and a short summary line
- [ ] 3.4 Screen has "View Post-Battle Report" and "Return to
      Encounters" actions

## 4. Post-Battle Report Schema

- [x] 4.1 Define `IPostBattleReport` with `{version: 1, matchId,
winner, reason, turnCount, units: IUnitReport[], mvpUnitId,
log: IGameEvent[]}`. The `version` field is a literal number
      type (`1`) set at schema creation — Phase 3 campaign integration
      will extend the schema and must bump the version to preserve
      readability of Phase 1 stored match logs. Persistence code SHALL
      reject reports where `version` is absent or unrecognized rather
      than silently migrating
- [x] 4.2 Define `IUnitReport` with `{unitId, side, designation,
damageDealt, damageReceived, kills, heatProblems,
physicalAttacks, xpPending: true}`
- [x] 4.3 Derive the report from the session's event log
- [x] 4.4 Unit tests for report derivation on known event streams
- [ ] 4.5 Unit test: GET `/api/matches/[id]` on a report missing
      `version` SHALL return 400 with reason `"unversioned report"`
      (protects against accidentally reading stale/broken records)

## 5. Post-Battle Report Screen

- [ ] 5.1 New route `/gameplay/matches/[id]`
- [ ] 5.2 Screen renders one row per unit with the report columns
- [ ] 5.3 MVP row has a highlighted background
- [ ] 5.4 XP column shows "pending campaign integration" placeholder
- [ ] 5.5 Collapsible event log below the unit rows (all events from the
      match)

## 6. Match Log Persistence

- [ ] 6.1 On `GameEnded`, write the report to `/api/matches` with POST
- [ ] 6.2 API route uses SQLite to persist the report
- [ ] 6.3 GET `/api/matches/[id]` returns the stored report
- [ ] 6.4 Page `/gameplay/matches/[id]` fetches from this route

## 7. Victory Reason Labels

- [x] 7.1 `destruction` → "Last side standing"
- [x] 7.2 `concede` → "Opponent conceded" (or "You conceded" when
      applicable)
- [x] 7.3 `turn_limit` → "Turn limit reached"
- [x] 7.4 Labels are externalized for future localization

## 8. MVP Determination

- [x] 8.1 MVP is the unit with the highest `damageDealt` on the winning
      side
- [x] 8.2 Ties broken by lowest `damageReceived`, then alphabetical
      designation
- [x] 8.3 If no damage was dealt by the winner, MVP is null (e.g.,
      turn-limit + zero-damage draw)

## 9. Draw Handling

- [ ] 9.1 Turn-limit outcome with both sides active evaluates total
      damage — if tied within 5%, result is a draw; otherwise the side
      dealing more damage wins
- [ ] 9.2 Draw case renders a "Draw" variant of the victory screen
- [ ] 9.3 Post-battle report shows both sides without an MVP highlight

## 10. Integration Tests

- [ ] 10.1 End-to-end: fire enough attacks to destroy all opponent
      units; victory screen shows with `reason: destruction`
- [ ] 10.2 End-to-end: concede from Player side; victory screen shows
      Opponent winning with `reason: concede`
- [ ] 10.3 End-to-end: simulate 20-turn match; at turn 21 victory screen
      shows with `reason: turn_limit`
- [ ] 10.4 End-to-end: post-battle report persisted and readable on
      reload
- [ ] 10.5 **Phase 1 capstone test** — run a single seeded 2v2 skirmish
      from `add-skirmish-setup-ui` entry through every phase
      (initiative → movement → weapon attack → physical attack → heat
      → end-of-turn) for N turns until a decisive outcome. Assert: - (a) session transitions to `Completed` with a concrete winner - (b) every Phase 1 spec's primary events appear in the log
      (`MovementLocked`, `AttackDeclared`, `AttackResolved`,
      `DamageApplied`, at least one `PhysicalAttackResolved`, at
      least one `HeatGenerated`, at least one `PsrResolved` if
      triggered) - (c) `IPostBattleReport` is produced and contains an MVP unit,
      non-zero per-unit damage totals, and a populated event log - (d) the same seed produces byte-identical report JSON on
      replay (replay fidelity)
      This test is the single acceptance gate for the Phase 1 MVP
      checkpoint — if it passes, the four-mech hot-seat demo is
      demonstrable.

## 11. Spec Compliance

- [x] 11.1 Every requirement in `game-session-management` delta has at
      least one GIVEN/WHEN/THEN scenario
- [x] 11.2 Every requirement in `after-combat-report` delta has at
      least one scenario
- [x] 11.3 Every requirement in `combat-resolution` delta has at least
      one scenario
- [x] 11.4 `openspec validate add-victory-and-post-battle-summary
--strict` passes clean
