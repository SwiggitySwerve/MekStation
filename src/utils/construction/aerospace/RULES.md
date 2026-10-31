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
