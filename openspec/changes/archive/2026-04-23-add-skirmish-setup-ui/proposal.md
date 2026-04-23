# Change: Add Skirmish Setup UI

## Why

Phase 1 delivers a playable 4-mech skirmish, but the entry point is missing. The
engine (`InteractiveSession`, `EncounterService`, `preBattleSessionBuilder`) can
launch a session when handed a fully configured encounter, yet there is no
interactive surface that lets a player assemble one. Players need a pre-battle
screen where they can pick two mechs and two pilots per side, size the map,
pick a terrain preset, confirm deployment zones, and launch the match. Without
this, every Lane B combat UI change has no way to start a game.

## What Changes

- Add a pre-battle skirmish configuration surface at
  `/gameplay/encounters/[id]/pre-battle` that collects per-side unit picks,
  pilot assignments, map radius, terrain preset, and deployment zones.
- Add `game-session-management` requirements for a `configureSkirmish` input
  shape that captures player/opponent force composition and the launch
  handshake into `InteractiveSession`.
- Add `tactical-map-interface` requirements for map-setup visualization:
  radius selection preview, terrain preset color legend, deployment zone
  overlays for each side, and pre-battle viewport framing.

## Dependencies

- **Requires**: `game-session-management` (exists), `tactical-map-interface`
  (exists), `terrain-system` (exists), `preBattleSessionBuilder` helper
- **Related**: Lane A rule-accuracy changes (A1–A5) — not blocking for UI
  scaffolding but outcomes from this screen will only be meaningful once the
  engine side is wired.
- **Required By**: `add-interactive-combat-core-ui` (the launched session
  renders in the core combat surface), `add-movement-phase-ui`,
  `add-attack-phase-ui`.

## Impact

- Affected specs: `game-session-management` (MODIFIED — adds skirmish launch
  handshake), `tactical-map-interface` (ADDED — pre-battle preview
  requirements).
- Affected code: `src/pages/gameplay/encounters/[id]/pre-battle.tsx` (new
  UI), `src/components/gameplay/pages/preBattleSessionBuilder.ts` (extended
  to accept the richer config), `src/stores/useEncounterStore.ts` (read
  existing encounter for pre-fill).
- Non-goals: force builder (out — player re-uses saved forces), OpFor BV
  generation (out — existing `encounter-system` archive covers it),
  campaign-bound encounters (out — Phase 3 territory).
- Database: no schema changes; encounter record already exists.
