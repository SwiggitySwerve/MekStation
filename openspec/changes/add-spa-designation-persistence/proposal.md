# Change: Add SPA Designation Persistence

## Why

Several SPAs in the unified catalog require a player-supplied designation
at purchase time: Weapon Specialist designates a weapon type, Blood
Stalker designates a target, Range Master designates a range bracket,
Gunnery Specialist designates a weapon category, and so on. The picker
collects these designations and the editor persists them onto the pilot
record. What is still missing is the formal contract for how that
designation is stored, surfaced to the combat layer, and consumed by
`spa-combat-integration` when attacks resolve. Without this contract, the
combat layer cannot consistently tell _which_ weapon Weapon Specialist
buffs or _which_ target Blood Stalker hunts.

This change locks down the designation data shape, the pilot-side storage,
and the hand-off into combat modifier resolution. It is the final Phase 5
piece and is the prerequisite for any combat scenario that must honour
designation-dependent SPAs.

Phase 5 runs in parallel with Phases 1, 2, and 3. This change is contract
work — it formalises storage and retrieval — and will not conflict with
Lane A engine wiring or Lane B combat UI surfaces.

## What Changes

- Add `ISPADesignation` interface to the pilot types describing the
  discriminated-union shape keyed on `designationType`
  (weapon_type, weapon_category, target, range_bracket, skill, terrain).
- Extend `IPilotAbilityRef` with an optional `designation?:
ISPADesignation` field so the designation travels with the ability on
  the pilot record.
- Add `getPilotDesignation(pilot, spaId)` helper in
  `src/services/pilots/PilotService.ts` so the combat layer can look up a
  designation without reaching into the pilot structure directly.
- Extend the `spa-combat-integration` spec so every designation-dependent
  SPA (Weapon Specialist, Gunnery Specialist, Blood Stalker, Range
  Master, Oblique Attacker, etc.) is specified to read its designation
  from the pilot record via the new helper — replacing the current
  placeholder language of "the designated target".

## Dependencies

- **Requires**: `add-spa-picker-component` (the surface that captures
  designation), `add-pilot-spa-editor-integration` (the surface that
  persists designation), existing pilot types, existing
  `spa-combat-integration` spec (modified here).
- **Related**: can land in parallel with Phases 1/2/3. The combat-layer
  reads specified here align with changes already in progress for Lane A
  (`fix-combat-rule-accuracy`).
- **Required By**: any Phase 1 attack-resolution change that evaluates a
  designation-dependent SPA (B4 `add-attack-phase-ui` indirectly
  consumes this).

## Impact

- Affected specs: `pilot-system` (MODIFIED — adds designation shape and
  persistence requirements), `spa-combat-integration` (MODIFIED — each
  designation-dependent requirement now reads designation from the
  pilot record).
- Affected code: `src/types/pilot/PilotInterfaces.ts` (new
  `ISPADesignation` + extension of `IPilotAbilityRef`),
  `src/services/pilots/PilotService.ts` (new `getPilotDesignation`
  helper and wiring through `purchaseSPA`),
  `src/utils/gameplay/spaModifiers/` (reads designation via the helper,
  not ad-hoc lookups).
- Non-goals: changing the combat math for any SPA (the math is already
  specced in `spa-combat-integration`), adding new designation types
  beyond those already in `SPADesignationType`.
- Database: no schema change; the pilot record is JSON so the extended
  `IPilotAbilityRef` shape flows through existing storage.
