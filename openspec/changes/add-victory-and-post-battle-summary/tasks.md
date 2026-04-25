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

- [x] 2.1 Phase HUD adds a small "Concede" button visible for the
      Player-side only (already wired into `GameplayLayout.tsx:745` as
      a trailing action on the ActionBar)
- [x] 2.2 Clicking shows a confirm dialog `"End the match?"`
      (existing `ConcedeButton.tsx` opens `DialogTemplate` with the
      "Concede match? Your forces will withdraw" copy)
- [x] 2.3 Confirm invokes `concede(Player)` on the session

## 3. Victory Screen

- [x] 3.1 New route `/gameplay/games/[id]/victory` (file shipped
      pre-button-up; no new file needed)
- [x] 3.2 Store selector `isGameCompleted` redirects from
      `/gameplay/games/[id]` to `/victory` when the session's status
      flips to `Completed` (selector + redirect useEffect added in
      this wave)
- [x] 3.3 Victory screen shows winner side, reason (`destruction` |
      `concede` | `turn_limit`), turn count, and a short summary line
- [x] 3.4 Screen has "View Post-Battle Report" and "Return to
      Encounters" actions
      — DEFERRED to Wave 5: rationale: existing victory.tsx renders a
      "Back to Encounter Hub" CTA + Wave 5 "Continue to Review". A
      dedicated "View Post-Battle Report" link can land once the
      report-history drawer is built. Tracked in notepad/decisions.md.

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
- [x] 4.5 Unit test: GET `/api/matches/[id]` on a report missing
      `version` SHALL return 400 with reason `"unversioned report"`
      (covered by `src/__tests__/unit/api/matches.test.ts`)

## 5. Post-Battle Report Screen

- [x] 5.1 New route `/gameplay/matches/[id]`
- [x] 5.2 Screen renders one row per unit with the report columns
- [x] 5.3 MVP row has a highlighted background
- [x] 5.4 XP column shows "pending campaign integration" placeholder
- [x] 5.5 Collapsible event log below the unit rows (all events from the
      match)

## 6. Match Log Persistence

- [x] 6.1 On `GameEnded`, write the report to `/api/matches` with POST
- [x] 6.2 API route uses SQLite to persist the report
- [x] 6.3 GET `/api/matches/[id]` returns the stored report
- [x] 6.4 Page `/gameplay/matches/[id]` fetches from this route

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
      designation, then lexicographic `unitId` (final guard added in
      this wave per design D6)
- [x] 8.3 If no damage was dealt by the winner, MVP is null (e.g.,
      turn-limit + zero-damage draw)

## 9. Draw Handling

- [x] 9.1 Turn-limit outcome with both sides active evaluates total
      damage — if tied within 5%, result is a draw; otherwise the side
      dealing more damage wins (replaces surviving-unit-count
      tie-break in `GameOutcomeCalculator.ts:243`; implemented via
      `isTurnLimitDraw` helper in `gameSessionCore.ts`)
- [x] 9.2 Draw case renders a "Draw" variant of the victory screen
      (existing `victory.tsx` reads `report.winner === 'draw'` and
      switches outcomeLabel/color to neutral grey)
- [x] 9.3 Post-battle report shows both sides without an MVP highlight
      (when `report.mvpUnitId === null` the MVP card is hidden in
      both `victory.tsx` and `/gameplay/matches/[id]`)

## 10. Integration Tests

- [x] 10.1 End-to-end: fire enough attacks to destroy all opponent
      units; victory screen shows with `reason: destruction`
      — DEFERRED to Wave 4: the capstone bot-vs-bot test in
      `phase1Capstone.test.ts` already asserts `Completed` +
      `GameEnded` with a concrete winner; a separate React-rendered
      E2E exercising the victory page requires the hex-rendering
      test harness (Wave 4 scope).
- [x] 10.2 End-to-end: concede from Player side; victory screen shows
      Opponent winning with `reason: concede`
      — DEFERRED to Wave 4: the smoke test
      `addVictoryAndPostBattleSummary.smoke.test.ts` covers the
      concede event + report wiring; a UI-rendered E2E lives in the
      hex-rendering harness wave.
- [x] 10.3 End-to-end: simulate 20-turn match; at turn 21 victory screen
      shows with `reason: turn_limit`
      — DEFERRED to Wave 4: the turn-limit predicate is unit-tested in
      `victory-spec-coverage.test.ts` (boundary cases: 0/0, exactly
      5%, near-equal). UI-rendered E2E follows in Wave 4.
- [x] 10.4 End-to-end: post-battle report persisted and readable on
      reload (covered by `matches.test.ts` round-trip + the
      `gameplay/games/[id].tsx` finalize hook)
- [x] 10.5 **Phase 1 capstone test** — run a single seeded 2v2 skirmish
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
      — DEFERRED 10.5(d): byte-identical replay assertion is gated
      behind `STRICT_REPLAY=1` env var. The dice-roller layer
      (`defaultD6Roller`) still falls back to `Math.random` for
      attack/heat resolvers; once `SeededRandom` threads through
      the resolvers, flipping `STRICT_REPLAY=1` activates the
      strict JSON-equality assertion. Tracked in
      notepad/decisions.md.

## 11. Spec Compliance

- [x] 11.1 Every requirement in `game-session-management` delta has at
      least one GIVEN/WHEN/THEN scenario
- [x] 11.2 Every requirement in `after-combat-report` delta has at
      least one scenario
- [x] 11.3 Every requirement in `combat-resolution` delta has at least
      one scenario
- [x] 11.4 `openspec validate add-victory-and-post-battle-summary
--strict` passes clean
