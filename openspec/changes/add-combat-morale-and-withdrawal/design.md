# Design: Add Combat Morale and Withdrawal

## Context

`add-bot-retreat-behavior` built a complete withdrawal mechanism — but it is reachable only through the bot's damage-based trigger. The withdrawal *machinery* (edge resolution via `RetreatAI.resolveEdge`, edge-ward movement scoring, `UnitRetreated` emission, the victory-check exclusion of `hasRetreated` units) is sound and reusable. This change does not fork that machinery; it adds two new *entry points* into it — a player action and a morale-driven forced trigger — and adds the in-battle morale state those triggers consult.

## Goals / Non-Goals

**Goals:**

- An in-battle, per-side morale level that reacts to combat events deterministically.
- A first-class withdrawal action a human player can take.
- A Forced Withdrawal optional rule that applies uniformly to player and bot units.
- Reuse the existing withdrawal machinery — no parallel retreat code path.

**Non-Goals:**

- Replacing campaign morale; per-unit morale; multiplayer surrender; team-coordinated AI withdrawal.

## Decisions

### D1. Morale is per-side, reusing the 7-level ordinal scale

Morale is tracked as `battleMorale: Record<GameSide, MoraleLevel>` on the session. `MoraleLevel` reuses the existing 7-level ordinal scale from campaign morale (`ROUTED -3 … STEADY 0 … OVERWHELMING +3`) for vocabulary consistency, but the *state* is wholly separate — no shared store. Per-unit morale is deferred (KISS).

### D2. Morale shifts are a deterministic function of the event log

A pure function maps combat events to a morale delta for the affected side: an enemy unit destroyed is positive; an own unit destroyed is negative; an own vital-component critical is a small negative; loss of the side's heaviest unit is a larger negative. Because the shift is derived from the event log, replaying the log reconstructs morale exactly.

### D3. In-battle morale is separate state from campaign morale

This change writes nothing to `src/lib/campaign/scenario/morale.ts`. Battle-end morale MAY be exported for Wave 4 to feed campaign morale, but that wiring is explicitly out of scope here. Keeping the two systems separate avoids coupling a battle-runtime concern to campaign persistence.

### D4. Player withdrawal is a declared action routed through existing machinery

A new `WithdrawalDeclared` action flags a unit `isWithdrawing` and records a player-chosen target edge. From that point the unit is routed through the same edge-ward movement and `UnitRetreated` exit the bot uses. Bots continue to resolve the edge via `RetreatAI.resolveEdge`; players pick it explicitly.

### D5. Forced Withdrawal is a scenario config flag

`forcedWithdrawal: boolean` on the scenario config. When enabled, an end-of-phase check withdraws any unit whose side morale is `BROKEN` or worse, or that is crippled (a vital-component critical, or more than 50% internal-structure loss). For bots this composes with the existing `RetreatAI` damage triggers — it does not replace them. For players it surfaces a forced-withdrawal notice and auto-flags the unit `isWithdrawing`. When the flag is off, nothing is forced and units fight to destruction as today.

### D6. Reuse, do not fork

`UnitRetreated`, `RetreatAI.resolveEdge`, `RetreatAI.hasReachedEdge`, and the victory-check exclusion of `hasRetreated` units are all reused unchanged. This change generalizes the *entry points*, not the withdrawal mechanics. A withdrawing player unit and a retreating bot unit converge on the same exit path.

### D7. Failed withdrawal uses the existing first-event-wins discriminator

If `UnitDestroyed` fires for a unit before its `UnitRetreated`, it is a combat loss; if `UnitRetreated` fires first, it is a withdrawal. This is the discriminator already established by `add-bot-retreat-behavior` and is reused without change.

### D8. Type contracts

```typescript
type MoraleLevel =
  | 'ROUTED' | 'BROKEN' | 'SHAKEN' | 'STEADY'
  | 'CONFIDENT' | 'INSPIRED' | 'OVERWHELMING';

interface ISessionMoraleState {
  readonly battleMorale: Record<GameSide, MoraleLevel>;
}

GameEventType.MoraleShifted             = 'MoraleShifted';
GameEventType.WithdrawalDeclared        = 'WithdrawalDeclared';
GameEventType.ForcedWithdrawalTriggered = 'ForcedWithdrawalTriggered';

interface IMoraleShiftedPayload {
  readonly side: GameSide;
  readonly from: MoraleLevel;
  readonly to: MoraleLevel;
  readonly cause: string;
  readonly turn: number;
}
interface IWithdrawalDeclaredPayload {
  readonly unitId: string;
  readonly edge: 'north' | 'south' | 'east' | 'west';
  readonly declaredBy: 'player' | 'forced';
  readonly turn: number;
}
interface IForcedWithdrawalTriggeredPayload {
  readonly unitId: string;
  readonly reason: 'morale-broken' | 'crippled';
  readonly turn: number;
}
```

## Risks / Trade-offs

- **[Risk] Morale shift double-counts an event already processed by the bot retreat trigger** → Mitigation: morale and the bot damage trigger are independent inputs to the same withdrawal entry point; `isWithdrawing` / `isRetreating` are sticky, so a unit cannot be withdrawn twice.
- **[Risk] Forced Withdrawal empties the board and ends a match abruptly** → Mitigation: the victory check already treats withdrawn units as removed; an abrupt end is the correct BattleTech Forced Withdrawal outcome. The rule is opt-in per scenario.
- **[Risk] Player declares withdrawal toward a blocked edge** → Mitigation: edge-ward movement reuses the bot's path candidate generation, which routes around blockers; an immobilized withdrawing unit stays in place without error, exactly as the bot case.
- **[Risk] In-battle morale confused with campaign morale by future contributors** → Mitigation: distinct state, distinct events, distinct spec capability; the design records the separation explicitly (D3).

## Migration Plan

Additive. `battleMorale` defaults every side to `STEADY`; `forcedWithdrawal` defaults to `false`, preserving current fight-to-destruction behavior. New event types are additive — existing consumers ignore unknown events. No database migrations. Rollback = revert the change-set; bot retreat continues to work because it was never modified.

## Open Questions

- Exact morale-delta magnitudes per event — proposed starting values: enemy unit destroyed `+1`, own unit destroyed `-1`, own vital crit `-1` (capped once per unit), heaviest own unit lost `-2`. Tunable after playtest.
- Whether Forced Withdrawal should be on by default for generated scenarios — proposed `false`; revisit once playtested.
