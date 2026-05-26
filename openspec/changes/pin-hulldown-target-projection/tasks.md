# Tasks

## 1. Spec

- [x] 1.1 Add OpenSpec delta for MegaMek-backed hull-down target projection.

## 2. Implementation

- [x] 2.1 Add represented hull-down state to game unit state.
- [x] 2.2 Align hull-down target modifier calculation with MegaMek +2 when
      cover is present.
- [x] 2.3 Thread hull-down state through tactical combat projection,
      committed attack declaration, and quick-sim attack to-hit calculation.
- [x] 2.4 Expose hull-down cover metadata through tactical-map attributes,
      cover overlay data, and hover cover context.

## 3. Verification

- [x] 3.1 Add focused to-hit and combat projection tests.
- [x] 3.2 Add preview/commit agreement coverage for a hull-down covered target.
