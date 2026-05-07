# Denormalize side onto the event envelope + close emission-contract gaps

## Why

Two pain points surfaced when reading the just-shipped always-on event log:

1. **Side derivation duplication**: `MetricsCollector.sideFromUnitId(unitId)` derives `'player' | 'opponent'` from the `player-` / `opponent-` prefix on `unitId`. Every consumer (metrics, scenario tests, the readable formatter, future UI replays) reinvents the same lookup. A field on the envelope removes the duplication and lets line-level renderers show side for events whose `actorId` is empty (turn-lifecycle, game-ended, initiative-rolled).
2. **Schema gaps the readable formatter expects**: PR A's seven-scenario spec reveals fields the engine doesn't carry today — `IPSRTriggeredPayload.basePilotingSkill`, `IUnitFellPayload.location` and `reason`, `IGameEndedPayload.turns`. Those fields exist in the runner's internal state at emit time; they just aren't propagated to the payload.

Concurrent research (omo-explore Java oracle against `E:/Projects/megamek/`) also surfaced an **emission-contract gap**: several lifecycle events shipped during the combat-fidelity-suite (PRs #517-528) lack an explicit `### Requirement: ... emits ...` heading in their owning spec — `turn_started` / `turn_ended` / `phase_changed` / `attacks_revealed` / `location_destroyed` / `transfer_damage` / `pilot_hit`. The events fire correctly but no spec requires them by name, so future regressions wouldn't be caught by spec-verifier.

## What

### Code changes

1. Add `readonly side?: GameSide` to `IGameEventBase` (line 320 of `src/types/gameplay/GameSessionInterfaces.ts`).
2. Extend `createGameEvent` (`src/simulation/runner/phases/utils.ts`) to derive `side` from `actorId` via the same prefix lookup `MetricsCollector.sideFromUnitId` uses. The derivation runs at emission time so every event lands with the field populated.
3. Backfill `IPSRTriggeredPayload` with `readonly basePilotingSkill?: number` and propagate from `unit.pilot.piloting` at emit sites.
4. Backfill `IUnitFellPayload` with `readonly location?: string` and `readonly reason?: string` (string-typed for now; PR E tightens to `PSRReasonCode`).
5. Backfill `IGameEndedPayload` with `readonly turns?: number` (final turn count from runner state).

### Spec extensions

Each delta scopes only the **emission-contract gap** it owns — no behavioral changes, just naming what the runner already does:

- `game-event-system`: ADD `Requirement: Event Envelope Side Denormalization` (every emitted event SHALL carry `side` derived from `actorId`); ADD `Requirement: Turn Lifecycle Event Emission` (covers turn_started / turn_ended / phase_changed); ADD `Requirement: Initiative Event Emission` (initiative_rolled / initiative_order_set).
- `combat-resolution`: ADD `Requirement: AttackResolved Side Effect Chain` (location_destroyed → transfer_damage → critical_hit cascade ordering contract).
- `damage-system`: ADD `Requirement: DamageApplied Emission Contract` (every armor/structure mutation produces a `damage_applied` event; cascade order: damage_applied → location_destroyed → transfer_damage).
- `piloting-skill-rolls`: ADD `Requirement: PSRTriggered Carries Base Skill` (`basePilotingSkill` field); ADD `Requirement: UnitFell Carries Location and Reason` (location of fall + reason classification, free-string-typed for back-compat).

## Impact

- **Affected types**: `IGameEventBase`, `IPSRTriggeredPayload`, `IUnitFellPayload`, `IGameEndedPayload`.
- **Affected code**: `src/simulation/runner/phases/utils.ts` (single chokepoint — adds derivation), 4-6 PSR/fall/end emit sites.
- **Affected specs**: `game-event-system`, `combat-resolution`, `damage-system`, `piloting-skill-rolls`.
- **Risk**: low. Every new field is OPTIONAL — legacy event streams compile and replay unchanged. The single-chokepoint `createGameEvent` change means we don't touch all 94 emit sites.
- **Visible improvement**: every readable-companion line shows side, and PSR / unit-fell / game-ended lines show the data the formatter already tries to print.

## Out of scope

- `forceId` as a domain concept above `GameSide` (deferred per Decision Summary in plan).
- Tightening `IPSRTriggeredPayload.reason` and `IUnitFellPayload.reason` to a discriminated `PSRReasonCode` enum (PR E).
- New movement / charge / DFA event types (PR C, follow-on changes).
- Heat-threshold / gyro-variant / cockpit-cascade spec extensions (named follow-on changes).
