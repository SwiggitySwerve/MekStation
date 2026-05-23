# Design: Tactical Map Rules Projection Alignment

## Source-Of-Truth Order

1. Official BattleTech rules are normative where the rule can be cited or encoded directly.
2. MegaMek tactical code/behavior is the practical oracle for tactical ambiguity and edge cases.
3. MekHQ is not a tactical movement/combat oracle; use it only for campaign, scenario, personnel, repair, and logistics context.
4. OpenSpec deltas plus Jest/Playwright fixtures are the local acceptance contract once the rule source has been pinned.

## Projection Ownership

The tactical map must render projections supplied by shared engine/rules utilities. It must not compute independent legality for movement, weapon range, firing arc, LOS, fog targetability, terrain cost, or elevation cost inside view components.

The preferred flow is:

1. Engine state plus selected unit/action goes into a projection utility.
2. Projection utility returns hex-level facts: legal state, cost, terrain/elevation explanation, range band, LOS, arc, cover, and invalid reason.
3. Map renders those facts consistently in top-down and isometric modes.
4. Commit validation consumes the same rule inputs and either accepts the same action or returns a reason the preview already exposed.

## Movement Projection

Movement overlays must distinguish walk, run, jump, and unit-type-specific movement. Hexes need enough explanation for a player to understand why a destination is legal, costly, or blocked:

- movement mode and available MP
- cumulative MP cost
- terrain cost and terrain restrictions
- elevation delta and elevation cost/restriction
- jump landing legality and jump heat
- path/facing preview
- invalid reason for blocked hexes

This applies to ground units first and remains extensible for vehicles, VTOL, infantry, battle armor, ProtoMechs, and aerospace-adjacent tactical units.

## Combat Projection

Combat overlays must be weapon-backed when the selected unit has configured weapons. Legacy raw `attackRange` is allowed only as a compatibility fallback when no configured weapon list exists.

The combat projection must expose range band, selected weapons, firing arc, LOS, cover, fog visibility, heat/ammo impact, and invalid reasons. Selected-weapon firing-arc overlays must respect mounted arcs; weapons with all-arc/unknown mounting keep the broader overlay rather than pretending a narrower arc is authoritative.

## Visibility/Fog

Fog targetability and rendered token state must use the same grid and LOS assumptions as attack validation. Hidden or last-known contacts may render as intelligence, but they must not remain active/valid targets unless the rules projection says the current viewer can legally target them.

## Top-Down Presentation

Top-down mode remains the primary playable surface. It should read like a clear board-game hex map: terrain is visually distinct, elevation is a readable number on the hex, and overlays remain legible when movement/combat/LOS/firing-arc layers stack.

## Isometric Presentation

Isometric mode is presentation state only. It must use the same axial coordinates, terrain/elevation data, movement projection, combat projection, LOS, cover, and firing arcs as top-down mode.

Isometric mode must add:

- visible stacked elevation/layer depth
- camera rotation around the battlefield
- selection and highlighting for units behind large elevations
- occlusion aids such as transparency, ghost outlines, outline-on-hover, or layer slicing
- top-down parity tests for the same sample state

## Completion Gate

Each tactical map mechanic that affects legality must have at least one preview-vs-commit fixture before the change is archived:

- a legal case
- a costly-but-legal case
- a blocked/invalid case with reason
- a top-down rendering check
- an isometric parity/readability check where the mechanic is visible in isometric mode
