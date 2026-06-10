# Tasks: Pin LAM AirMek To Mek Conversion Steps

## 1. Conversion Metadata

- [x] 1.1 Detect represented LAM AirMek-to-Mek conversion as a two-step
      conversion path.
- [x] 1.2 Keep the represented conversion MP cost at 0 for LAM conversion steps.
- [x] 1.3 Preserve existing standard LAM direct Mek/Fighter gating.

## 2. Projection And Event Agreement

- [x] 2.1 Prove tactical movement commands emit two conversion steps for
      AirMek-to-Mek conversion.
- [x] 2.2 Prove runtime movement-state replay carries the two pending conversion
      steps into movement projection.
- [x] 2.3 Prove movement event serialization emits two represented convert-mode
      steps before the path movement step.

## 3. Verification

- [x] 3.1 Run focused tactical command, runtime movement-state, and game-event
      tests.
- [x] 3.2 Run OpenSpec validation for this change.
- [x] 3.3 Run type, lint, format, build, and diff checks before opening the PR.
