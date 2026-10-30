# Battle value movement calculations

`battleValueMovement.ts` owns the shared offensive speed exponent and rounding
in `calculateOffensiveSpeedFactorForMP`. Callers select effective movement
points before invoking this kernel; selection remains specific to each unit
family. The existing facade exports and return shapes remain unchanged.

The kernel matches the expression in pinned MegaMek
`48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`megamek/common/battleValue/BVCalculator.java::offensiveSpeedFactor`.
It raises `1 + (mp - 5) / 10` to 1.2 and rounds to two decimal places.
The shared Run/Jump/UMU entry point selects Run plus rounded half the greater
of Jump and UMU. Vehicle callers already use that entry point.

The initial extraction preserved ProtoMek Walk/Jump and aerospace average-thrust
selection, including fractional, negative and nonfinite inputs. The subsequent
ProtoMek correction uses the shared Run/Jump entry point with UMU zero, matching
the pinned ProtoMek calculator. Aerospace selection remains unchanged and is
not certified by this correction. The existing TMM and legacy defensive speed
helpers are unchanged and require their own source comparisons.

Representative before/after observations cover the three public callers,
explicit nonfinite/signed-zero results, and all 86 pinned ProtoMek source BV
breakdowns. Full BV, equipment resolution and invalid-input admission remain
separate contracts; no whole-unit numerical parity follows from this refactor.

## Standard TMM thresholds

`src/constants/movement.ts` owns the standard bracket table and the pure
`getTMMByUpperBound` selector. Construction and the legacy validation BV helper
call that selector, retaining negative/fractional/nonfinite behavior. The
validation helper in `src/types/validation/BattleValue.ts` first takes the
greater raw Run/Jump MP, without a jump bonus. Either input being NaN retains
TMM six; its `getDefensiveSpeedFactor` consumer is unchanged.

Shared construction `calculateTMM` compares running TMM plus a caller-supplied
bonus against positive-jump TMM plus one. Vehicle callers retain effective MP,
submarine nullish overrides and the VTOL running bonus. Gameplay to-hit reads
the same table through its constants facade, with explicit lower and upper
bounds and stationary/zero guards. These different input contracts remain
separate. The legacy gameplay `movement/modifiers.ts` ceil(distance/5)
approximation is a different rule and is not corrected here.

The preserving extraction changes no numeric outputs. Optional MaxTech
movement brackets and invalid-input admission remain outside this default
construction contract. Threshold ownership is checked by source inspection;
behavior tests and before/after captures cover the retained caller policies,
but no automated gate detects arbitrary future threshold copies.
