# Ammunition projection for previews

`weapons.ts` owns `ammoFromWeapons`. The adapter keeps its public re-export.
The preserving extraction retains positive-capacity filtering, name-based bin
matching and summed remaining rounds. It does not create ammunition quantities.

The planning section uses that projection when `ammoState` is present; an
absent bin-state field retains the legacy `ammo` map. An explicit empty bin
state yields zero for counted weapons. The selector and forecast modal pass
the projected count to `previewAttackOutcome` without adding damage rules.
Missing counts stay undefined. Ammo-only updates invalidate selector previews.
Both planning sections memoize projection by weapons, legacy ammo and live bin
state. Unrelated renders reuse the map and the selector's preview results.

This changes depleted previews and, when live bins are present, the planning
section's weapon availability and forecast-button gating. Energy and absent
legacy-map behavior remain with existing owners. Unknown-capacity missiles,
mode-specific selection, native quantities and damage magnitude are separate.

The current `CombatPlanningPanel` weapon-phase route returns null in favor of
the attack intent composer. The Physical Attack route is live: its locked weapon
list now shows current Ammo: N / No ammo badges. Component tests cover that
display and stable projection; they do not prove a browser journey or the active
weapon composer. A legacy -1 count on an ammo weapon reaches the preview owner
unchanged and gives zero damage; no production writer of that sentinel is known.
