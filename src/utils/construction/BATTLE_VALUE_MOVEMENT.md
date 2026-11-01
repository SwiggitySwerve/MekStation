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

The active `validate:bv` calculator adapter in
`scripts/validate-bv-calculator-setup.ts` uses the same selector and the owner's
`getMinimumMPForTMM` inverse lookup. It is a calculator input adapter, not an
independent reference oracle. It retains the positive maximum of Jump/UMU plus
one, compared with running TMM. Its returned TMM can be seven, while its
representative Run remains capped at the final standard bracket minimum (25).
The inverse helper returns the exact matching bracket minimum or the final
minimum for an unmatched value. This adapter only produces integer TMM 0–7.

Shared construction `calculateTMM` compares running TMM plus a caller-supplied
bonus against positive-jump TMM plus one. The public `calculateVehicleTMM`
wrapper keeps effective MP/submarine overrides, the unconditional VTOL running
bonus and the positive-only jump guard, including NaN rejection.
The separate `calculateVehicleBVDefensiveTMM` used only by vehicle defense uses flank MP,
guards zero movement and adds one for moving VTOL/WiGE and two for represented
uniform stealth. Within BV arithmetic, the submarine override remains only in offensive selection.
Gameplay to-hit reads
the same table through its constants facade, with explicit lower and upper
bounds and stationary/zero guards. These different input contracts remain
separate. The legacy gameplay `movement/modifiers.ts` ceil(distance/5)
approximation is a different rule and is not corrected here.

The preserving extraction changes no numeric outputs. Optional MaxTech
movement brackets and invalid-input admission remain outside this default
construction contract. Threshold ownership is checked by source inspection;
behavior tests and before/after captures cover the retained caller policies,
but no automated gate detects arbitrary future threshold copies.
