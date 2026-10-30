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
