# Change: Add ProtoMech Construction

## Why

ProtoMechs are Clan-only, rare, and the last priority in Phase 6, but they're canonical units that must build and cost correctly for Clan-era campaigns. The existing `protomech-unit-system` spec covers weight classes and main-gun slots but leaves construction enforcement thin. This change completes ProtoMech construction so Phase 6 BV and combat can operate on legal input. Scope is deliberately narrower than the other four unit types (~18 tasks) because ProtoMechs have fewer configuration axes.

## What Changes

- Add tonnage selection 2–15 tons (Ultraheavy 10–15, Standard 2–9) with weight class bucketing
- Add chassis type: Biped / Quad / Glider / Ultraheavy
- Add movement: walk / run / jump with MP caps by weight (Light max 8, Medium max 6, Heavy max 4, Ultraheavy max 3)
- Add structure / armor per location (Head, Torso, MainGun, LeftArm, RightArm, Legs); Quad uses FrontLegs / RearLegs
- Add per-location armor max from tonnage
- Add main gun system: single heavy weapon in dedicated MainGun location; otherwise no large weapons
- Add myomer booster (optional, +1 MP), glider wings (Glider chassis only)
- Add engine — fusion only — with weight = rating × factor
- Add construction validation rule set `VAL-PROTO-*` covering tonnage range, chassis compatibility, MP cap, main gun rules, tech-base lock (Clan only)
- Wire into protomech store and customizer tabs

## Non-goals

- ProtoMech combat (point composition, damage) — `add-protomech-combat-behavior`
- BV calculation — `add-protomech-battle-value`
- Inner Sphere ProtoMechs (IS ProtoMechs do not exist in canon)

## Dependencies

- **Requires**: existing `protomech-unit-system` spec stubs, `construction-services`, `equipment-database`
- **Blocks**: `add-protomech-battle-value`, `add-protomech-combat-behavior`

## Ordering in Phase 6

ProtoMech is fifth and last (niche, Clan-only, rare in campaigns).

## Impact

- **Affected specs**: `protomech-unit-system` (ADDED — tonnage / chassis / movement / main gun / validation)
- **Affected code**: `src/stores/protomech/`, `src/utils/construction/protomech/`, `src/components/customizer/protomech/*`
- **New files**: proto weight class table, chassis table, MP cap table, main gun approved weapon list
