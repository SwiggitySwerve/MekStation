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

Represented TacOps infantry pavement movement is pinned to MegaMek tactical
behavior: `ConvInfantry.isEligibleForPavementOrRoadBonus()` only grants the
+1 pavement/road MP bonus when `ADVANCED_TAC_OPS_INF_PAVE_BONUS` is enabled
and the stored infantry motive is tracked, wheeled, hover, or motorized.
MekStation therefore carries an explicit infantry road-bonus capability flag
from adapter data and activates it only from the session optional rule instead
of letting those infantry units inherit vehicle road-bonus eligibility.

UMU and Mek swim movement projection is pinned to MegaMek tactical behavior:
`MovementDisplay` only enables Mek swim gear for underwater units,
`MovementType.getMovementType(...)` classifies `BIPED_SWIM`, `QUAD_SWIM`, and
`INF_UMU` as water movement, and `MoveStep.calcMovementCostFor(...)` excludes
biped/quad swim from ordinary terrain and water-depth surcharges.
`TWGameManager.addMovementHeat()` applies a flat UMU heat point to biped/quad
swim movement. MekStation's represented layer therefore keeps biped/quad swim
destinations in water terrain, does not charge represented ground-elevation
rises while swimming, applies the represented flat swim heat, and leaves
infantry UMU land-entry behavior to the existing UMU-specific projection.

Represented Frogman deep-water movement is pinned to MegaMek tactical behavior:
`MoveStep.calcMovementCostFor(...)` reduces the non-amphibious depth-2+
water surcharge for Frogman Mek/ProtoMek movement from the normal deep-water
cost to +2 MP. MekStation carries this only when the movement capability
explicitly represents the Frogman specialist flag, so ordinary deep-water
movement and amphibious equipment behavior remain unchanged.

## Combat Projection

Combat overlays must be weapon-backed when the selected unit has configured weapons. Legacy raw `attackRange` is allowed only as a compatibility fallback when no configured weapon list exists.

The combat projection must expose range band, selected weapons, firing arc, LOS, cover, fog visibility, heat/ammo impact, and invalid reasons. Selected-weapon firing-arc overlays must respect mounted arcs; weapons with all-arc/unknown mounting keep the broader overlay rather than pretending a narrower arc is authoritative.

Weapon range projection is pinned to MegaMek tactical behavior:
`RangeType.rangeBracket(...)` assigns short/medium/long/extreme/out-of-range by
comparing distance to the represented weapon range cutoffs, and
`Compute.getRangeMods(...)` applies the range modifier. The minimum-range
modifier is `(minimum - distance) + 1`, applies only when minimum range is
positive and the attack is represented as ground-to-ground, and must be exposed
by both map preview and committed `AttackDeclared` modifiers.

Underwater and torpedo attack legality is pinned to MegaMek tactical behavior:
`Compute.getRangeMods(...)` rejects underwater targets when the weapon is not
underwater-capable, rejects torpedo weapons against non-water targets, and
`ComputeToHitIsImpossible(...)` rejects torpedo lines whose minimum water depth
falls below 1. MekStation's represented map layer currently treats water depth
2+ as underwater for target legality, water depth 1+ as a valid water line for
torpedoes, and threads the same invalid reason through map preview and
committed attack validation.

C3 range projection is pinned to MegaMek tactical behavior:
`Compute.getRangeMods(...)` asks `ComputeC3Spotter.findC3Spotter(...)`, then
`RangeType.rangeBracketC3(...)` can improve the attacker's direct-fire range
bracket when a connected C3 spotter has a better bracket to the target. C3 does
not replace indirect-fire resolution, and minimum-range penalties continue to
use the attacker's distance.

Indirect-fire spotter projection is pinned to MegaMek tactical behavior:
`Entity.canSpot()` rejects sprinting/evading/off-board spotters, not ordinary
run or jump movement, and `Compute.getSpotterMovementModifier(...)` applies
walk/run/jump penalties of +1/+2/+3 while exempting infantry. MekStation's
current represented movement set has no sprint/evade state, so run and jump
spotters remain legal and carry the movement penalty through both map preview
and committed attack declaration.

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
