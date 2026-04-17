# Change: Add Attack Phase UI

## Why

The engine can resolve weapon attacks, compute to-hit numbers, roll, and
apply damage — but the player has no surface to pick weapons, see range
brackets against the target, preview the to-hit forecast, and confirm
fire. Without this UI the Weapon Attack phase is invisible to players.
This change introduces the weapon selector (multi-select, range-aware,
ammo-aware), the to-hit forecast modal (breaks down every modifier to a
final target number), and the fire-confirmation handshake. Damage
animation and post-resolution log entries land in `add-damage-feedback-ui`.

## What Changes

- Add a weapon selector in the action panel when phase is Weapon Attack
  and a target is locked in
- Each weapon row shows range badges (Short/Medium/Long vs. target),
  ammo count, and a checkbox to include it in the attack
- Add a to-hit forecast modal that opens when the player clicks "Preview
  Forecast", showing every modifier (base, range, attacker movement,
  target movement, terrain, heat, SPA adjustments) with a final TN per
  weapon
- Add fire confirmation: clicking "Fire" appends an `AttackDeclared`
  event; resolution happens when both sides lock (existing engine
  behavior)
- Resolution results stream into the event log as one entry per weapon

## Dependencies

- **Requires**: `add-interactive-combat-core-ui` (phase HUD, action
  panel), `add-movement-phase-ui` (movement must commit before attack),
  `to-hit-resolution`, `weapon-resolution-system`, Lane A A2/A3/A4
  (weapon data wired, firing arc resolved, damage pipeline connected)
- **Required By**: `add-damage-feedback-ui` (damage feedback depends on
  attacks being fireable from the UI)

## Impact

- Affected specs: `to-hit-resolution` (MODIFIED — forecast breakdown
  projection), `weapon-resolution-system` (MODIFIED — UI-facing weapon
  state projection including range-to-target and ammo), and
  `tactical-map-interface` (ADDED — target lock visualization, forecast
  modal contract)
- Affected code: `src/components/gameplay/ActionBar.tsx` (extend with
  weapon selector), `src/components/gameplay/` (new `ToHitForecastModal`
  component), `src/stores/useGameplayStore.ts` (target lock state +
  selected weapons set)
- Non-goals: multi-target attacks (secondary target support deferred),
  called shots (future rules-level feature), physical attack UI (Lane A
  A7)
