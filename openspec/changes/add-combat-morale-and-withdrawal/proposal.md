# Change: Add Combat Morale and Withdrawal

## Why

Bot units already retreat when crippled — `add-bot-retreat-behavior` (archived) shipped `RetreatTriggered` / `UnitRetreated`, edge resolution, and the withdrawal movement model. Two gaps remain for full tabletop play.

First, there is no in-battle morale. Morale exists only as campaign-layer post-scenario state (`src/lib/campaign/scenario/morale.ts`, `combat-resolution` → `Contract Morale Tracking`) and never responds to events during a battle.

Second, withdrawal is bot-only. `add-bot-retreat-behavior` listed player-driven retreat as an explicit non-goal, so a human player cannot formally withdraw a unit — they can only decline to move it — and there is no unit-agnostic Forced Withdrawal rule.

This change adds an in-battle morale state machine and a player-and-bot withdrawal action, so any unit can disengage and exit the map.

## What Changes

- ADDED in-battle morale: a per-side morale level that shifts in response to combat events within the current battle (unit destroyed, vital-component critical, commander lost), distinct from campaign morale
- ADDED player withdrawal declaration: a human player can mark a unit as withdrawing; it then moves toward a chosen map edge and exits via the existing `UnitRetreated` event
- ADDED the Forced Withdrawal rule: when enabled on a scenario, a unit whose side morale breaks — or that is crippled — is compelled to withdraw, applied uniformly to player and bot units
- ADDED withdrawal eligibility and map-edge exit for player units, generalizing the previously bot-only edge logic
- ADDED failed-withdrawal handling: a withdrawing unit destroyed before reaching the edge counts as a combat loss, not a withdrawal

## Dependencies

- **Requires**: `add-bot-retreat-behavior` (archived) — reuses `UnitRetreated`, edge resolution, and the withdrawal movement model
- **Requires**: `combat-resolution` — in-battle morale reads combat events; campaign `Contract Morale Tracking` is untouched and stays a separate system
- **Required By**: Wave 2 AI changes (morale-aware AI); Wave 4 campaign loop (battle-end morale may feed campaign morale)

## Impact

- Affected specs: `combat-morale-and-withdrawal` (new capability)
- Affected code: `src/utils/gameplay/` (morale state and reducer), `src/engine/GameEngine.phases.ts` and `src/engine/InteractiveSession.ts` (withdrawal action and forced-withdrawal check), `src/simulation/ai/RetreatAI.ts` (morale as an additional trigger), `src/types/gameplay/GameSessionCoreTypes.ts` (morale state and events), gameplay UI (withdraw control, morale indicator)
- New event types: `MoraleShifted`, `WithdrawalDeclared`, `ForcedWithdrawalTriggered`
- No database migrations

## Non-Goals

- Replacing campaign-layer morale — `Contract Morale Tracking` remains the post-scenario system; this change is in-battle only
- Per-unit morale — morale is tracked per side here; per-unit morale is deferred
- Surrender / concede negotiation in multiplayer — Wave 3 scope
- Coordinated team-wide withdrawal AI — Wave 2 AI scope
- Re-entry after a unit exits the map
