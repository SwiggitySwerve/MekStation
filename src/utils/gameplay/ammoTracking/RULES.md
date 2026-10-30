# Ammunition projection for previews

`weapons.ts` owns `ammoFromWeapons`. The adapter keeps its public re-export.
The preserving extraction retains positive-capacity filtering, name-based bin
matching and summed remaining rounds. It does not create ammunition quantities.

The planning section uses that projection when `ammoState` is present; an
absent bin-state field retains the legacy `ammo` map. An explicit empty bin
state yields zero for counted weapons. The selector and forecast modal pass
the projected count to `previewAttackOutcome` without adding damage rules.
Missing counts stay undefined. Ammo-only updates invalidate selector previews.

This changes depleted previews and, when live bins are present, the planning
section's weapon availability and forecast-button gating. Energy and absent
legacy-map behavior remain with existing owners. Unknown-capacity missiles,
mode-specific selection, native quantities and damage magnitude are separate.

The current `CombatPlanningPanel` weapon-phase route returns null in favor of
the attack intent composer. Tests exercise these reusable components and their
section directly; this is not browser or active-composer workflow proof.
