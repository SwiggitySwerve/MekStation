# Change: Add ECM Core-Engine To-Hit Modifier

## Why

The `EcmCoverageMap` (Wave 2 AI work) already computes ECM bubbles and feeds them to the tactical AI's awareness layer. The combat-resolution to-hit calculation, however, has **no ECM-aware modifier** — units fighting inside an ECM bubble currently roll the same to-hit numbers as units in the clear. The MegaMek reference applies a `+1 to-hit` for any unit firing into or out of an ECM bubble that affects an electronic-aided weapon (C3-linked, Artemis-guided, targeting-computer-assisted, NARC-linked).

The Waves 1-5 playtest closeout logged this as known-limitation gap #1. It's deferred from Wave 6.2 polish because:
1. The fix touches the combat-resolution to-hit path, not a peripheral subsystem
2. The interaction matrix (which weapon types degrade in ECM, by how much, against what guidance) is well-defined per the MegaMek rules but needs careful spec
3. The fix needs unit-test coverage across each weapon-guidance combination

## What Changes

- ADDED ECM-aware to-hit modifier to the core combat-resolution engine in `src/engine/combatResolution/toHitCalculator.ts` (or equivalent file)
- ADDED `ECM_TO_HIT_MODIFIERS` constant defining the per-guidance-type modifiers:
  - C3-linked weapons: `+1` when shooter OR target is inside an ECM bubble (C3 network broken)
  - Artemis-IV guided LRM/SRM: `+1` when target is inside an ECM bubble (lock degraded)
  - Targeting-computer-assisted: `+1` when shooter is inside an ECM bubble (TC effectiveness degraded)
  - NARC-linked: `+1` when target is inside an ECM bubble (homing degraded)
- ADDED `EcmCoverageMap` consumer integration on the to-hit calculator so the modifier is applied at hit-resolution time
- ADDED unit-test coverage across each guidance / ECM-position combination (shooter inside, target inside, both inside, neither inside)
- ADDED a regression entry in the combat-fidelity test suite asserting the modifier matches MegaMek's calculated to-hit on a fixed-seed scenario

## Dependencies

- **Requires (already shipped)**: `EcmCoverageMap` (Wave 2 AI tactical layer)
- **Requires (already shipped)**: combat-resolution engine with the existing to-hit pipeline
- **No new types, no new transport** — extends existing modifier-stacking

## Impact

- Affected specs: `combat-resolution` (or equivalent — the to-hit pipeline capability spec)
- Affected code:
  - `src/engine/combatResolution/toHitCalculator.ts` — primary change
  - `src/engine/combatResolution/__tests__/toHitCalculator.test.ts` — coverage matrix
  - `src/types/combat/ToHitModifier.ts` — possibly extend with the new modifier kinds
- No database migrations
- No new components, hooks, or types beyond modifier-kind extension
- The fix may shift balance — units with electronic-aided weapons take a marginal hit in ECM coverage. The unit-test suite should include a balance-sanity check (no unit's BV needs adjustment because ECM is a positional concern, not a per-unit one).

## Non-Goals

- ECM bubble manipulation UI for the player (the bubble is computed from equipment placement; manipulation = equipment swap, which is the existing mech-bay workflow)
- ECM-targeted electronic-warfare gameplay (ECCM, ECM-vs-ECM cancellation) — out of scope; the modifier here is the simplest correct application of MegaMek's basic ECM-to-hit rule
- Per-weapon-system ECM-immunity flags beyond the four canonical guidance types listed above (those would expand the modifier table; not in this change)
- AI ECM-awareness in tactical decision-making (already in Wave 2; this change is engine-side, not AI-side)
