# add-battlearmor-construction — Decisions Log

## [2026-04-25 apply] Close-out wave

Remaining 8 tasks closed as a mix of real code work and scope-bounded deferrals.

### Real work landed (5 tasks)

- **3.4 Squad homogeneity invariant** — implemented `assertSquadHomogeneous` in `src/utils/construction/battlearmor/squad.ts` and wired into `validateBattleArmorConstruction` at `validation.ts:233-241`. Acts as runtime guard against future refactors that might break the per-trooper-loadout-identical invariant; the type system already enforces it for callers using `IBattleArmorUnit`, but the runtime check catches any future widening.

- **4.5 Extra-MP mass cost** — extended `computeTrooperMass` in `mass.ts` to accept optional `{groundMP, jumpMP, umuMP, weightClass}` and add the per-class `EXTRA_MP_MASS_KG` cost for each MP point beyond base 1. Cited in Total Warfare trooper mass tables. Pipelines through `validation.ts:244-258` where trooper-mass check is anchored.

- **7.1 Heavy-weapon weight-class gate** — new `src/utils/construction/battlearmor/weaponGates.ts` with `validateHeavyWeaponClass` (min Medium class via `MIN_CLASS_FOR_HEAVY_WEAPON`), `validateAllHeavyWeaponClasses` aggregator, wired into validator at `validation.ts:219-224`. Returns `VAL-BA-CLASS` errors per Total Warfare p.259.

- **8.4 AP-weapon-slot class gate** — same `weaponGates.ts` file adds `AP_WEAPON_SLOT_CLASS = Light` + `validateAPWeaponSlot`, wired at `validation.ts:226-228`. Per Tactical Operations: the dedicated AP weapon mount is a Light-class feature only; PA(L) relies on inherent pistols, Medium+ replaces the slot.

- **11.1 Spec validation** — `openspec validate add-battlearmor-construction --strict` passes.

### Deferred (3 tasks — all UI-layer)

All three deferrals concern UI-tab / diagram integration, which is intentionally out of scope for the construction-rule wiring change:

- **10.2 Hook calculators into `BattleArmorStructureTab` / `BattleArmorSquadTab` / `BattleArmorDiagram`** — UI wiring is a downstream consumer of the rule layer. Deferring avoids bundling unrelated component edits into a data-model change.

- **10.3 Diagram with trooper silhouette + armor/arm/leg mounts** — visual diagram work lives in the parallel `add-per-type-armor-diagrams` change (currently 69.6% in-progress) which owns per-type diagram rendering across all unit types. Duplicating that here would conflict.

- **10.4 New `BattleArmorEquipmentTab`** — a new tab belongs with a broader unit-editor UX pass (not yet an OpenSpec change), not bundled with construction-rule wiring.

### Cross-spec references

- Parallel: `add-per-type-armor-diagrams` (diagram work)
- Parallel: `add-vehicle-construction`, `add-aerospace-construction` (sibling construction-rule changes)
- Downstream: BattleArmor BV calculation (already at 100% parity per `MEMORY.md`) — do not break.
