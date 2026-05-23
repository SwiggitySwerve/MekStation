# Add Combat Tooltip Weapon Impact

## Why

Combat projection already tells the tactical map whether a target is in range, in arc, visible, covered, and attackable. It also lists the available weapon ids, but the map explanation layer does not expose the heat or ammo impact of those weapons.

That leaves an important BattleTech decision hidden in the planning panel instead of the battlefield itself: a player can see that an attack is legal without seeing what firing the currently available weapons costs.

## What Changes

- Extend shared combat projection data with available weapon impact metadata derived from the projected available weapons.
- Show projected weapon heat and ammo use in combat-only hover tooltips.
- Show the same weapon impact row in combined movement+combat hover tooltips.
- Preserve existing range, LOS, arc, cover, visibility, to-hit, indirect-fire, and blocked-reason rows.

## Out of Scope

- Changing attack resolution, weapon selection, ammo bin consumption order, or target legality.
- Estimating hit probability or detailed damage distribution.
