# Change: Add Damage Feedback UI

## Why

Once attacks resolve and damage is applied (via `damage.ts` post-A4), the
player needs visual confirmation that a hit landed, that armor decayed,
that a critical hit happened, and that a pilot rolled consciousness. Right
now events silently update the session's state; nothing flashes, nothing
animates, nothing draws the player's eye. This change wires damage-related
session events into visible feedback on both the map and the action panel.

## What Changes

- Animate the `ArmorPip` decay on the action panel when the selected unit
  takes damage — pips fade from filled to empty with a brief red flash
- Display a critical hit indicator (burst animation) on the affected
  token when a critical hit resolves
- Add per-hit entries in the event log: hit location, weapon, damage
  amount, crit flag, transfer chain
- Show a pilot-wound flash on the action panel's pilot wound track when a
  consciousness roll fires (regardless of pass/fail), plus a badge if
  the pilot becomes unconscious

## Dependencies

- **Requires**: `add-interactive-combat-core-ui` (action panel + event
  log), `add-attack-phase-ui` (attacks actually get fired from the UI),
  Lane A A4 `integrate-damage-pipeline` (damage events must flow from
  `damage.ts`)
- **Required By**: `add-victory-and-post-battle-summary` (victory
  detection reads the same damage events)

## Impact

- Affected specs: `damage-system` (MODIFIED — emit structured
  `DamageApplied`, `CriticalHit`, and `ConsciousnessRoll` events with
  enough detail for UI rendering), `tactical-map-interface` (ADDED — pip
  decay animation, crit burst overlay, pilot-wound flash)
- Affected code: `src/components/gameplay/ArmorPip.tsx` (animated
  decay state), new `CritHitOverlay` component on
  `HexMapDisplay`, `EventLogDisplay` entry renderer extended for damage
  events
- Non-goals: full replay scrubber (Phase 2 territory), 3D wreck effects
  (3D shelved), sound effects (out)
