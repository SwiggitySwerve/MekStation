# Aerospace BV rules

The aerospace construction module owns aerospace BV calculations. Its public
entry is `aerospaceBV.ts`; `aerospaceBVCalculator.ts` owns the defensive pool.

## Defensive thrust factor

There is no thrust-based defensive multiplier. `defensiveFactor` remains in
the public breakdown as 1. Maximum thrust still feeds the existing offensive
speed calculation.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`AeroBVCalculator.java:137-138` (empty `processDefensiveFactor`), invoked after
the separate type modifier by `BVCalculator.java:274-280`.

The aircraft type modifier at `AeroBVCalculator.java:118-134`, SI valuation,
armor bonuses, arc/heat handling and final subtype scaling remain separate
parity work. This rule does not assert full-unit parity. Construction SI
defaults, source movement and shared thrust helpers are outside this correction.

Enforcement: `aerospaceBV.defensiveFactorParity.test.ts` checks the Boeing
oracle reference and thrust independence for all supported subtypes. The
UL-19-first corpus comparison also checks that unrelated breakdown terms
remain identical for every converted source.
