# Tasks

## 1. Spec

- [x] 1.1 Add OpenSpec delta for destroyed-gyro non-tracked movement blocking.

## 2. Implementation

- [x] 2.1 Block non-prone destroyed-gyro movement unless the active movement
      mode is tracked or wheeled.
- [x] 2.2 Preserve Playtest3 heavy-duty gyro thresholds when deciding whether
      the gyro is destroyed.
- [x] 2.3 Keep commit validation aligned with movement projection.

## 3. Verification

- [x] 3.1 Add focused projection and runtime-capability tests.
- [x] 3.2 Add InteractiveSession preview/commit coverage for blocked and
      tracked-exception movement.
