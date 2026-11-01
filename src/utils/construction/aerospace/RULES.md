# Aerospace construction rules

## Max thrust

`thrustCalculations.ts:calculateMaxThrust` owns the max thrust derived from safe
thrust. The aerospace and capital-vessel BLK basics, the small craft handler,
the default aerospace state, the safe-thrust and engine-rating store actions and
the new-unit template summary consume it; status bars, record sheets and the
aerospace BV adapter read the stored result. The owner keeps its current
rounding in this step; a characterization test
(`stores/__tests__/aerospaceMaxThrust.consumers.characterization.test.tsx`) pins
one safe-to-max table through every consumer so the rule changes in one place.

Not covered here: `BlkParserService.extractAerospace` (a parse result with no
production consumer) reports `2 x safeThrust`, and gameplay `runtimeCapability`
already rounds LAM fighter-mode run upward. Neither goes through the owner.

## Battle value

The aerospace construction module owns aerospace BV calculations. Its public
entry is `aerospaceBV.ts`; `aerospaceBVCalculator.ts` owns the defensive pool.

## Defensive thrust factor

There is no thrust-based defensive multiplier. `defensiveFactor` remains in
the public breakdown as 1. Maximum thrust still feeds the existing offensive
speed calculation.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`AeroBVCalculator.java:137-138` (empty `processDefensiveFactor`), invoked after
the separate type modifier by `BVCalculator.java:274-280`.

Armor bonuses, arc/heat handling and final subtype scaling remain separate
parity work. This rule does not assert full-unit parity. Construction SI
defaults, source movement and shared thrust helpers are outside this correction.

Enforcement: `aerospaceBV.defensiveFactorParity.test.ts` checks the Boeing
oracle reference and thrust independence for all supported subtypes. The
UL-19-first corpus comparison also checks that unrelated breakdown terms
remain identical for every converted source.

## Structural integrity valuation

SI contributes `SI × 2` to defensive BV, independently of tonnage, for ASF,
conventional fighters, FixedWingSupport and small craft. Source: the same
MegaMek pin, `AeroBVCalculator.java:64-70`. `BVCalculator.java:103-118` routes
all four families through that calculator: `AeroSpaceFighter.java:44` extends
`Aero`; `ConvFighter.java:54` extends `AeroSpaceFighter`;
`FixedWingSupport.java:57` extends `ConvFighter`; `SmallCraft.java:70` extends
`Aero`. There is no separate small-craft SI formula.

Java also multiplies this contribution by 1.2 with working Blue Shield.
`IAerospaceBVInput` cannot express that state, so Blue Shield remains a later
term. This correction changes neither construction SI defaults/weight nor
source SI, armor, equipment, movement or final subtype scaling.

Enforcement: `aerospaceBV.siParity.test.ts` checks the Boeing (SI BV 18), Sabre
(22), Mosquito (12) and Dragonstar (12) references through the contract BV
adapter, plus tonnage independence for every supported subtype. UL-19-si's
620-row comparison asserts that only `siBV`, `defensive` and `final` change.

## Aircraft type modifier

After armor, SI, defensive equipment and explosive penalties, multiply the
complete defensive pool by 1.2 for ASF, 1.1 for conventional fighters and 1
for support vehicles or small craft. Support classification takes precedence:
FixedWingSupport extends ConvFighter but is a support vehicle. The contract
adapter carries that source subtype as `isSupportVehicle` to the BV owner.

Non-patchwork stealth armor adds 0.3 to the selected modifier (1.5 ASF,
1.4 CF, 1.3 support/small craft). Patchwork gets no stealth bonus. Java's
`hasStealth()` checks armor identity; it does not require active stealth mode
or working ECM. Source: the same MegaMek pin, `AeroBVCalculator.java:118-134`,
`Entity.java:16132-16136`, `FixedWingSupport.java:131-132` and defensive stage
ordering in `BVCalculator.java:274-280`. The thrust factor stays neutral.

The existing CF/FWS final 0.8 scales defense plus offense later. Pinned Java
has no matching generic final factor (`BVCalculator.java:1159-1193` and
`AeroBVCalculator.java:159-179`); it is a different term left for later work.
This correction does not establish full-unit BV parity.

Enforcement: `aerospaceBV.typeParity.test.ts` checks Sabre defense 347.4,
Boeing defense 63.8, Boomerang support defense 8, each classification and
Saroyan's stealth contribution, plus synthetic stealth/patchwork inputs.
The converter preserves vehicle stealth code 22 as STEALTH, matching code 8;
`test_blk_aerospace_qualifiers.py` enforces both identities. Twelve aircraft
in the pinned 620-row corpus use code 22. UL-19-type's comparison asserts every breakdown field other
than `defensive` and `final` is unchanged for all 620 sources.
