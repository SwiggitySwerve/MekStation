# Design: Add Victory And Post-Battle Summary

## Context

Phase 1 of MekStation's gameplay loop currently runs a tactical
`InteractiveSession` through initiative → movement → weapon attack →
physical attack → heat → end-of-turn until one side has no functional
units. The engine already emits a `GameEnded` event for the
last-side-standing case, but there is no surface that *resolves the
match* for the player: no concede affordance, no turn-limit ceiling, no
victory screen, and no persisted post-battle report. Without that
surface, the four-mech hot-seat demo cannot reach a "the game is over,
here is what happened" state, and downstream consumers (Phase 2 Quick
Sim aggregator, Phase 3 campaign processors) have no canonical match
artifact to read.

This change adds the missing terminal surface. It is downstream of
several recently shipped specs:

- **`add-combat-outcome-model`** (already on main) shipped the canonical
  `ICombatOutcome` envelope at `src/types/combat/CombatOutcome.ts` with
  `report: IPostBattleReport` composed inside it. That envelope is the
  Phase 3 hand-off shape; this change is responsible for producing the
  inner `IPostBattleReport` that `ICombatOutcome.report` references.
- **`add-interactive-combat-core-ui`** owns the phase HUD where the
  concede button mounts.
- **`add-damage-feedback-ui`** owns the structured damage events the
  per-unit derivation reads.
- **`game-session-management`** owns `GameStatus`, `GameSide`,
  `IGameSession`, and the existing `GameEnded` event payload.
- **`after-combat-report`** already defined a draft ACAR shape; this
  change formalizes `IPostBattleReport` as its canonical Phase 1
  contract.

Codebase scaffolding partially exists today (`src/utils/gameplay/postBattleReport.ts`,
`src/pages/gameplay/games/[id]/victory.tsx`, `src/components/gameplay/MvpDisplay.tsx`,
`src/components/gameplay/ConcedeButton.tsx`, `src/__tests__/integration/phase1Capstone.test.ts`,
plus `InteractiveSession.concede(side)` and `InteractiveSession.isGameOver()`)
from earlier exploration and from the `add-combat-outcome-model` capstone
work that consumes `ICombatOutcome`. This design treats those files as
starting points to be brought into spec compliance, not greenfield. See
"Starting State Inventory" below for the file-by-file gap list.

## Starting State Inventory

The work this change drives is **bring-into-compliance, not greenfield**.
Apply-wave subagents MUST audit the existing files before writing new
code; the listed deltas are the gaps the apply wave must close. Any
"new" file the agent is tempted to create that overlaps an existing one
is wrong — extend the existing file instead.

### Files that ALREADY EXIST and ALIGN with spec

| File | Status |
|------|--------|
| `src/types/combat/CombatOutcome.ts` | Frozen on main; `ICombatOutcome.report` is the slot this change fills via `IPostBattleReport`. Do NOT modify. |
| `src/lib/combat/outcome/combatOutcome.ts` | Composes `derivePostBattleReport`. Do NOT touch unless `IPostBattleReport.reason` widens. |
| `src/components/gameplay/MvpDisplay.tsx` | Aligned with §8 (winner-side, damage-dealt MVP, empty state on `mvpUnitId === null`). |

### Files that ALREADY EXIST but DIVERGE from spec (apply wave must reconcile)

| File | Divergence | Resolution |
|------|------------|------------|
| `src/utils/gameplay/postBattleReport.ts` | `IUnitReport.heatProblems` counts events where `newTotal >= 14` (raw threshold), NOT shutdown / avoid-shutdown PSR per design D3. `reason` union admits `'objective'` (a 4th value beyond the spec's 3 — kept for forward-compat with `add-combat-outcome-model`). | Tighten heat-problem logic to "post-event heat triggered shutdown or required avoid-shutdown PSR" (D3 risk note). Keep `'objective'` in the type union; spec treats it as out-of-band for Phase 1 surfaces. |
| `src/pages/gameplay/games/[id]/victory.tsx` | Reads `useGameplayStore.session` directly; no `isGameCompleted` selector consumed. Already wires Wave 5 `reviewHref`. | Apply wave should add the `isGameCompleted` selector and use it from the gameplay page (`/gameplay/games/[id].tsx`) for redirect; the victory page itself is fine. |
| `src/components/gameplay/ConcedeButton.tsx` | Navigates immediately on confirm rather than waiting for the store's `isGameCompleted` flip. Polls `requestAnimationFrame` for cross-source GameEnded. | Acceptable — the polled rAF observer doubles as a safety net for opponent-side game-end; redirect-via-selector is a refinement, not a blocker. |
| `src/engine/InteractiveSession.ts` `concede()` | Silently no-ops when game is already over; spec scenario "Concede rejected after completion" requires throw `"Game is not active"`. | Apply wave: change to `throw new Error('Game is not active')` when `currentState.status !== Active`, matching the spec scenario verbatim. |
| `src/services/game-resolution/GameOutcomeCalculator.ts` | Turn-limit tie-break uses **surviving unit count**, not the design-D3 / spec **5% damage delta tolerance**. | Apply wave: replace the survivor-count branch with the damage-delta + 5% tolerance formula codified in D3 (constant `TURN_LIMIT_DRAW_TOLERANCE = 0.05`). |
| `src/__tests__/integration/phase1Capstone.test.ts` | Header attributes the test to `wire-bot-ai-helpers-and-capstone`. Asserts GameEnded, 5 phases, declaration-count parity — **does NOT** assert byte-identical replay (`stringify(a) === stringify(b)`) and does NOT exercise concede. | Apply wave (task §10.5): add the byte-identical-replay assertion. Co-locate with the bot-AI capstone since both consume the same seeded match; expand the file's spec attribution comment to list both changes. The bot-AI version stays for declaration parity; the byte-identical assertion is a stricter superset. |

### Files that DO NOT EXIST and must be created

| File | Created in task |
|------|-----------------|
| `src/pages/api/matches/index.ts` (POST) | §6.1, §6.2 |
| `src/pages/api/matches/[id].ts` (GET) | §6.3 |
| `src/pages/gameplay/matches/[id].tsx` | §5.1, §6.4 |
| `src/locales/en/victory.ts` | §7.4 (D8) |
| SQLite migration `version 5` adding `match_logs` table | §6.2 (see D10) |
| `useGameplayStore.isGameCompleted` selector | §3.2 (D7) |

## Goals / Non-Goals

**Goals:**

- Detect three terminal conditions: last side standing (existing,
  cleanup only), opt-in concede, and turn-limit reached
- Render a victory screen on `Completed` with winner, reason, turn
  count, and one-line summary
- Render a post-battle report at `/gameplay/matches/[id]` with per-unit
  damage dealt / received / kills / heat problems / physical attacks,
  MVP highlight, and a `pending campaign integration` XP placeholder
- Persist the derived `IPostBattleReport` to SQLite via `/api/matches`
  with explicit `version: 1` versioning and rejection on
  unversioned/unknown-version reads
- Provide `InteractiveSession.concede(side: GameSide): void` that
  appends `GameEnded` with `reason: 'concede'`
- Provide a `useGameplayStore.isGameCompleted` selector that the combat
  page uses to redirect to the victory screen
- Make tactical `combatResolution.finalize(session)` return the same
  `IPostBattleReport` shape as the ACAR auto-resolve path, with an
  optional `{persist: false}` opt-out so Phase 2 Quick Sim can run
  thousands of matches without storage churn
- Land the **Phase 1 capstone** end-to-end test (tasks.md §10.5)
  asserting a single seeded 2v2 skirmish reaches `Completed`, emits
  every Phase 1 spec's primary event, produces an `IPostBattleReport`
  with non-zero per-unit totals and a populated event log, and replays
  byte-identically on the same seed

**Non-Goals:**

- XP calculation (all `IUnitReport.xpPending = true`; Phase 3 campaign
  layer fills this in)
- Salvage generation, contract-pay calculation, pilot roster updates —
  all owned by `ICombatOutcome` campaign processors, not this change
- Per-weapon hit-rate stats (Phase 2 Quick Sim aggregator)
- Replays, video capture, or shareable match links
- Any modification of `ICombatOutcome` itself — that envelope is frozen
  on main; this change only fills in the `report` slot it already
  composes

## Decisions

### D1: `IPostBattleReport` is a flat, log-derived projection — not session state

```ts
// src/utils/gameplay/postBattleReport.ts
export type PostBattleReportVersion = 1;
export const POST_BATTLE_REPORT_VERSION: PostBattleReportVersion = 1;

export type VictoryReason = 'destruction' | 'concede' | 'turn_limit';
export type Winner = GameSide.Player | GameSide.Opponent | 'draw';

export interface IUnitReport {
  readonly unitId: string;
  readonly side: GameSide;
  readonly designation: string;
  readonly damageDealt: number;
  readonly damageReceived: number;
  readonly kills: number;
  readonly heatProblems: number;        // count of HeatGenerated events
                                         // where the unit shut down or
                                         // failed an avoid-shutdown PSR
  readonly physicalAttacks: number;     // count of PhysicalAttackResolved
                                         // events authored by this unit
  readonly xpPending: true;             // literal — never false in Phase 1
}

export interface IPostBattleReport {
  readonly version: PostBattleReportVersion;
  readonly matchId: string;
  readonly winner: Winner;
  readonly reason: VictoryReason;
  readonly turnCount: number;
  readonly units: readonly IUnitReport[];
  readonly mvpUnitId: string | null;
  readonly log: readonly IGameEvent[];
}

export function derivePostBattleReport(
  session: Pick<IGameSession, 'id' | 'log' | 'currentState'>,
): IPostBattleReport;
```

**Rationale:** the spec delta requires "deterministic derivation purely
from the event log, with no session state mutation." A pure
`derive(log) → report` function is trivially testable, replay-safe, and
matches the same pattern `ICombatOutcome` already uses (`fromSession`).
The function takes the whole session so it can read `id` and the
already-fully-applied `currentState.turn`, but it MUST NOT mutate
either; callers can pass `Object.freeze(session)` in tests.

**Alternatives considered:**

- *Carry the report on `IGameSession.report`*: rejected — bloats session
  state, requires mutation during the End phase, breaks the "pure
  reducer" property of `gameStateReducer` and makes replay harder.
- *Compute incrementally in the reducer*: rejected — the report is
  read-only at end-of-match; computing it lazily once is cheaper and
  removes a class of "report drifted from log" bugs.

### D2: Concede is an event, not a state flag

`InteractiveSession.concede(side)` validates that the session is in
`GameStatus.Active`, then appends a single `GameEnded` event with
`{winner: opposite(side), reason: 'concede'}`. The reducer transitions
`status` to `Completed`. No new field is added to `IGameSession`.

```ts
class InteractiveSession {
  concede(side: GameSide): void {
    if (this.currentState.status !== GameStatus.Active) {
      throw new Error('Game is not active');
    }
    this.appendEvent({
      kind: 'GameEnded',
      payload: {
        winner: side === GameSide.Player ? GameSide.Opponent : GameSide.Player,
        reason: 'concede',
      },
    });
  }
}
```

**Rationale:** every other terminal condition already flows through
`GameEnded`. Reusing the event keeps the log uniform, makes derivation
work without special cases, and means concede is replayable by replaying
the log.

**Cross-check with `ICombatOutcome`:** the canonical hand-off envelope
(`src/types/combat/CombatOutcome.ts`, frozen on main) already enumerates
`CombatEndReason.Concede = 'concede'` and `combatOutcome.toCombatEndReason()`
maps the Phase 1 string `'concede'` directly. No envelope-side change
required. The conceding side's units carry their final state (heat,
armor, structure, destroyedLocations) into `IUnitCombatDelta` exactly
as they would on a destruction end — `concede()` does not synthesize
"all conceding units are wrecked"; it just stops the match. This
matches MegaMek's `PlayerAgreedVictory` (server/victory/PlayerAgreedVictory.java)
where the loser's entities are not auto-removed.

**Reconciliation with existing impl:** `src/engine/InteractiveSession.ts`
`concede(side)` currently returns silently when `isGameOver()` is true
(InteractiveSession.ts:563-573). The spec scenario "Concede rejected
after completion" calls for `throw new Error('Game is not active')`.
Apply wave MUST tighten the guard to throw on `currentState.status !==
GameStatus.Active`, removing the silent no-op so callers (and tests)
see the contract violation.

**Alternatives considered:** add `IGameSession.concededBy?: GameSide`
— rejected; introduces a second source of truth for "how did the game
end."

### D3: Turn-limit check fires from the End phase, not a wall clock

The reducer's End-phase handler checks, in this order, **after**
last-side-standing:

1. If `state.turn > config.turnLimit` and both sides still have
   functional units, compute `playerDamage` and `opponentDamage` from
   `damage_applied` events, and append `GameEnded` with:
   - `reason: 'turn_limit'`
   - `winner: 'draw'` if `|p - o| / max(p, o) ≤ 0.05`
   - `winner: GameSide.Player` if `p > o` else `GameSide.Opponent`
2. Otherwise, advance to the next turn.

**Rationale:** the engine is event-sourced and turn-driven; a wall-clock
timer would couple to platform-specific timing and break determinism for
fuzzer + capstone replay. Tying the check to End-phase completion means
turn N+1 starts fresh; turn N+1 + 1 evaluates and ends.

**Tie-tolerance constant:** 5% of the larger side, per spec scenario.
Codified as `TURN_LIMIT_DRAW_TOLERANCE = 0.05` in
`gameSessionCore.ts`. Concrete predicate the apply wave MUST implement:

```ts
// gameSessionCore.ts
export const TURN_LIMIT_DRAW_TOLERANCE = 0.05;

function isTurnLimitDraw(playerDmg: number, opponentDmg: number): boolean {
  const max = Math.max(playerDmg, opponentDmg);
  if (max === 0) return true; // both sides dealt zero → draw by definition
  const delta = Math.abs(playerDmg - opponentDmg) / max;
  return delta <= TURN_LIMIT_DRAW_TOLERANCE;
}
```

**Note (reconciliation with existing code):**
`src/services/game-resolution/GameOutcomeCalculator.ts:212` currently
tie-breaks turn-limit by **surviving unit count**, not damage. The
apply wave MUST replace that branch with the damage-delta predicate
above so the spec scenario "Turn limit with near-equal damage is draw"
passes.

### D4: Match log persists via Next.js API route + SQLite

```
POST /api/matches            body: IPostBattleReport       → {matchId}
GET  /api/matches/[id]       → IPostBattleReport | 400
```

- Storage: existing `better-sqlite3` instance, new table
  `match_logs(id TEXT PRIMARY KEY, version INTEGER NOT NULL,
  payload TEXT NOT NULL, created_at INTEGER NOT NULL)`.
- POST: accepts only `version === POST_BATTLE_REPORT_VERSION`; returns
  400 `{error: "unsupported report version <n>, this build supports 1"}`
  otherwise.
- GET: parses `payload`, validates `version`. Missing → 400
  `{error: "unversioned report"}`. Unknown → 400 with the same message
  as POST. Valid → 200 with the parsed report.
- Side-effect plumbing: `InteractiveSession` exposes a hook
  `onCompleted(report → Promise<void>)`; the gameplay page registers a
  hook that POSTs to `/api/matches`. The session itself does NOT call
  fetch — keeps it pure-Node-runnable for the capstone test.

**Rationale:** mirrors the existing API+SQLite pattern in MekStation
(units / pilots), avoids inventing a new persistence layer, and the
hook indirection means Quick Sim can register a no-op hook for
`{persist: false}`.

**Alternatives considered:**

- *Local-storage only*: rejected — survives reload but not
  cross-browser; capstone test cannot read it from the Node process.
- *IndexedDB*: rejected — heavier, no reason given the SQLite layer
  already exists.
- *Persist `ICombatOutcome` instead of `IPostBattleReport`*: rejected
  for Phase 1 — the campaign-facing fields (`unitDeltas`,
  `contractId`, `scenarioId`) are not yet populated by tactical code.
  Persisting `IPostBattleReport` keeps the table schema small; Phase 3
  wraps the stored report in `ICombatOutcome` at read time.

### D5: `combatResolution.finalize(session, opts?)` is the single converge point

```ts
export interface FinalizeOptions { readonly persist?: boolean }
export async function finalize(
  session: IGameSession,
  opts: FinalizeOptions = {},
): Promise<IPostBattleReport> {
  const report = derivePostBattleReport(session);
  if (opts.persist !== false) {
    await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
  }
  return report;
}
```

The ACAR auto-resolve path calls the same `derivePostBattleReport`
under the hood (or a shared shape), so tactical and ACAR reports are
interchangeable downstream. `persist` defaults to `true` to keep the
gameplay UX zero-config; Quick Sim opts out.

### D6: MVP determination matches the spec's deterministic tie-break

```ts
function determineMVP(
  units: readonly IUnitReport[],
  winner: Winner,
): string | null {
  if (winner === 'draw') return null;
  const winnerUnits = units.filter(u => u.side === winner);
  const totalDealt = winnerUnits.reduce((s, u) => s + u.damageDealt, 0);
  if (totalDealt === 0) return null;                          // §8.3
  return [...winnerUnits].sort((a, b) =>
    b.damageDealt - a.damageDealt ||                          // §8.1
    a.damageReceived - b.damageReceived ||                    // §8.2
    a.designation.localeCompare(b.designation) ||             // §8.2
    a.unitId.localeCompare(b.unitId),                         // §8.2 final guard
  )[0].unitId;
}
```

**Final tie-break is `unitId` lexicographic order.** Designation can
collide (two `Atlas AS7-D` instances on the same side); without a final
guard, `Array.sort` stability would make the result depend on the input
order, which would silently break replay determinism. `unitId` is
guaranteed unique per `IGameUnit.id` and lexicographic compare on
strings is total — the picker is fully deterministic regardless of
input ordering.

The existing implementation in `src/utils/gameplay/postBattleReport.ts`
already filters `damageDealt > 0` (correctly per §8.3) and orders by
`damageDealt → damageReceived → designation`; the apply wave only
needs to add the trailing `unitId.localeCompare` guard.

### D7: Victory screen routing is store-driven, not push-on-event

The combat page (`/gameplay/games/[id].tsx`) reads
`useGameplayStore.isGameCompleted`. When it flips to `true`, the page
calls `router.replace('/gameplay/games/[id]/victory')`. The selector is
defined as:

```ts
isGameCompleted: state =>
  state.session?.currentState.status === GameStatus.Completed,
```

**Rationale:** the store already projects session state for the UI;
adding a derived selector keeps the redirect logic one line and
testable in isolation. Pushing from the engine into router state would
couple the engine to Next.js.

### D8: Labels are externalized for future localization

```ts
// src/locales/en/victory.ts (new)
export const victoryReasonLabels: Record<VictoryReason, string> = {
  destruction: 'Last side standing',
  concede: 'Opponent conceded',
  turn_limit: 'Turn limit reached',
};
export const youConcededLabel = 'You conceded';
```

The victory screen swaps in `youConcededLabel` when
`reason === 'concede'` and the conceding side equals the viewer's side.
No i18n framework is wired yet — the lookup table is the seam.

### D10: Match-log persistence schema (concrete table shape)

The apply wave creates SQLite migration **version 5** in
`src/services/persistence/SQLiteService.ts` (next free slot after
`pilot_abilities_spa_designation` v4). The table is intentionally narrow
— payload is a JSON blob; only the columns we filter / order on get
real types. This mirrors the `pilot_versions` pattern (history table
with `data TEXT` JSON blob) the project already uses.

```sql
-- Migration version 5: match_logs
CREATE TABLE IF NOT EXISTS match_logs (
  id          TEXT    PRIMARY KEY,             -- IPostBattleReport.matchId == IGameSession.id
  version     INTEGER NOT NULL,                -- POST_BATTLE_REPORT_VERSION literal (currently 1)
  winner      TEXT    NOT NULL,                -- 'player' | 'opponent' | 'draw'
  reason      TEXT    NOT NULL,                -- 'destruction' | 'concede' | 'turn_limit'
  turn_count  INTEGER NOT NULL,                -- IPostBattleReport.turnCount
  payload     TEXT    NOT NULL,                -- JSON-stringified IPostBattleReport
  created_at  INTEGER NOT NULL                 -- Date.now() at insert (epoch ms)
);

CREATE INDEX IF NOT EXISTS idx_match_logs_created_at ON match_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_match_logs_version    ON match_logs(version);
```

**Indexes rationale:**
- `created_at` — match-history list view (Phase 2 Quick Sim aggregator
  + future "recent matches" drawer) sorts by recency.
- `version` — operators upgrading across a Phase 3 schema bump can
  query stale rows (`SELECT id FROM match_logs WHERE version < ?`)
  before running a migration.

**`payload` blob:** the full `IPostBattleReport` JSON, including the
event log. Not normalized into separate `unit_reports` / `events`
tables for Phase 1 — the read path is "load whole report, render";
no joins needed. If Phase 3 introduces row-level filters
(per-pilot match list), the API route can project `winner`/`reason`
columns and lazy-load `payload` on demand without a schema change.

**Version field is a top-level column AND inside the JSON blob.** The
column is the cheap server-side filter; the in-blob field is the
authoritative version (re-checked on read). On read:

```ts
// pages/api/matches/[id].ts (GET)
const row = db.prepare('SELECT payload FROM match_logs WHERE id = ?').get(id);
if (!row) return res.status(404).json({error: 'not found'});
const parsed = JSON.parse(row.payload) as Partial<IPostBattleReport>;
if (typeof parsed.version !== 'number') {
  return res.status(400).json({error: 'unversioned report'});
}
if (parsed.version !== POST_BATTLE_REPORT_VERSION) {
  return res.status(400).json({
    error: `unsupported report version ${parsed.version}, this build supports ${POST_BATTLE_REPORT_VERSION}`,
  });
}
return res.status(200).json(parsed);
```

**MekHQ cross-reference:** MekHQ's `ResolveScenarioTracker` persists
post-battle scenario state inside the campaign XML save (one big blob
per campaign). The blob-payload approach here is the same shape,
adapted to SQLite. We stay narrower than MekHQ's tracker because
salvage / repair / pilot XP are explicitly Phase 3 responsibilities of
`ICombatOutcome`, not Phase 1.

### D9: Capstone test owns the Phase 1 acceptance gate

`src/__tests__/integration/phase1Capstone.test.ts` (file already
exists; design here is to bring it to spec):

1. Build a seeded 2v2 force via the existing skirmish-setup fixtures.
2. Drive the session through every phase via `InteractiveSession`'s
   public API (no test-only back doors).
3. Assert: session reaches `Completed`; the log contains at least one
   each of `MovementLocked`, `AttackDeclared`, `AttackResolved`,
   `DamageApplied`, `PhysicalAttackResolved`, `HeatGenerated`, and at
   least one `PsrResolved` if any unit fell below run-MP or fell;
   `derivePostBattleReport` returns an `IPostBattleReport` with a
   non-null `mvpUnitId`, non-zero damage totals on the winning side,
   and `log.length > 0`; running the same seeded scenario twice yields
   `JSON.stringify(reportA) === JSON.stringify(reportB)`.

Pass = Phase 1 MVP is demonstrable.

## Risks / Trade-offs

- **[Replay drift on `Date.now()` / `Math.random()` inside derivation]**
  → `derivePostBattleReport` MUST be a pure function of the log + a
  stable `matchId`. No timestamps, no random IDs. Capstone replay
  assertion (`stringify(a) === stringify(b)`) catches regressions.

- **[SQLite write on the End-phase tick stalls the UI]**
  → Persistence runs via the `onCompleted` hook from the gameplay page,
  off the engine's critical path. The hook awaits but the UI has
  already navigated to the victory screen. A failed POST surfaces as a
  toast but does not block the victory screen from rendering — the
  derived report is in-memory and the user can still see results.

- **[Heat-problem definition is fuzzy]**
  → Defined narrowly as "count of `HeatGenerated` events where the
  unit's post-event heat triggered a shutdown or required an avoid-
  shutdown PSR." Tighter than "any heat above zero," loose enough to
  match what the player intuitively reads as a problem. Locked in §4.4
  unit tests.

- **[`IPostBattleReport.log` is the entire event log → large rows]**
  → Acceptable for Phase 1 (matches are short, ~hundreds of events).
  Phase 2 Quick Sim opts out of persistence entirely. If Phase 3
  matches grow, we can compress / chunk the log column behind the same
  API surface without breaking the schema.

- **[Concede mid-phase produces inconsistent state]**
  → `concede()` only appends `GameEnded`. The reducer's existing
  `Completed`-status guard prevents further phase transitions. Any
  in-flight `AttackDeclared` without a matching `AttackResolved`
  remains in the log — which is fine for derivation (it doesn't
  contribute damage) and matches BattleTech's "the round just ends"
  intuition.

- **[Capstone test is slow]**
  → Targeted budget: ≤ 5s on a developer laptop. Uses fixed seeds, no
  network, no DB; exits as soon as `Completed` fires. If it grows
  beyond budget, mark `@slow` and let CI run it on a dedicated job.

- **[`ICombatOutcome` envelope vs `IPostBattleReport` versioning could
  diverge]**
  → They are independently versioned today (`COMBAT_OUTCOME_VERSION`
  vs `POST_BATTLE_REPORT_VERSION`, both literal `1`). Any future
  Phase 3 schema change to the inner report MUST bump both. Documented
  in the JSDoc of `IPostBattleReport` and surfaced in the
  `add-combat-outcome-model` change for the Phase 3 wave.

## Migration Plan

This is additive — no existing match logs to migrate.

Deployment order:

1. Land schema + types: `IPostBattleReport`, `IUnitReport`,
   `VictoryReason`, `Winner`, version constants
2. Land `derivePostBattleReport` + unit tests (§4 tasks)
3. Land `InteractiveSession.concede` + reducer turn-limit branch + unit
   tests (§1 tasks)
4. Land API route + SQLite table + version-rejection tests (§6 + §4.5)
5. Land `combatResolution.finalize(session, opts)` (§ combat-resolution
   spec)
6. Land UI: store selector, concede button, victory screen,
   post-battle screen, MVP highlight (§2, §3, §5)
7. Land draw-handling UI variants (§9)
8. Land integration + capstone tests (§10)
9. `openspec validate add-victory-and-post-battle-summary --strict`
   passes clean (§11)

Rollback: pure additive change. Disable the concede button, revert the
turn-limit branch, leave the schema in place — existing destruction-only
flow keeps working.

## Resolved Questions

(All previously open questions resolved during the
`add-victory-and-post-battle-summary` close-out pass; left here for
the apply-wave reviewer audit trail.)

- **Existing scaffolding alignment** — five Phase 1 files already exist
  (`postBattleReport.ts`, `victory.tsx`, `MvpDisplay.tsx`,
  `ConcedeButton.tsx`, `phase1Capstone.test.ts`) plus
  `InteractiveSession.concede()` and the `combatOutcome` derivation.
  See "Starting State Inventory" above for the file-by-file delta. Net
  result: this change is **bring-into-compliance work**, not greenfield.
  Apply-wave subagents MUST audit each existing file before writing
  new code.
- **Persistence schema** — `match_logs(id, version, winner, reason,
  turn_count, payload, created_at)` with two indexes (`created_at`,
  `version`); `payload` is the JSON-stringified report; version is
  validated both as a column (server-side filter) and inside the JSON
  blob (read authority). See D10.
- **Concede-as-event payload** — `GameEnded` with `{winner: opposite(side),
  reason: 'concede'}`; `ICombatOutcome.endReason` maps via
  `combatOutcome.toCombatEndReason('concede') → CombatEndReason.Concede`.
  Conceding side's units carry their final state (heat, armor, structure)
  — `concede()` does not synthesize "all units wrecked." Matches MegaMek
  `PlayerAgreedVictory` semantics. See D2 reconciliation.
- **End-phase turn-limit + 5% draw tolerance** — concrete predicate in
  D3: `|player - opponent| / max(player, opponent) ≤ 0.05` with
  `max === 0` short-circuiting to `'draw'`. Constant
  `TURN_LIMIT_DRAW_TOLERANCE = 0.05` in `gameSessionCore.ts`.
  Existing `GameOutcomeCalculator.ts:212` uses surviving-unit count
  instead — apply wave must replace that branch. Spec
  `game-session-management` covers this with two SHALL scenarios
  ("clear damage winner" and "near-equal damage is draw").
- **MVP tie-break determinism** — final tie-break is `unitId.localeCompare`
  after `damageDealt → damageReceived → designation`. Designation
  collisions on duplicate chassis are common; without a unitId guard
  the picker would depend on input ordering and break replay equality.
  See D6.
- **Should the post-battle screen show enemy-side units?** Yes — both
  sides. Spec §5.2 ("one row per unit") covers all units; capstone
  test asserts both sides appear in `report.units`.
- **Does "physicalAttacks" count successful only, or all declared?**
  All declared (one per `PhysicalAttackResolved` event authored by the
  unit, hit or miss). Mirrors how `damageDealt` is counted from
  outcomes, not declarations. Existing impl in `postBattleReport.ts`
  already counts every `PhysicalAttackResolved` regardless of hit
  result.
- **Should concede confirm dialog block on a 200ms delay to prevent
  double-clicks?** No new debounce — the existing `DialogTemplate`
  component's disabled-on-pending state handles this. Confirmed by
  audit of `ConcedeButton.tsx`.
