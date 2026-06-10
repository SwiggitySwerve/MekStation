# Tasks: Pin Infantry Mount Runtime Height

## 1. Runtime Capability

- [x] 1.1 Resolve `infantryMounted: false` as height 0 even when a stale runtime `unitHeight` remains on the unit state.
- [x] 1.2 Preserve mounted runtime height from `infantryMountHeight` or explicit runtime `unitHeight` when the unit is still mounted.
- [x] 1.3 Keep non-infantry conversion profiles using the existing explicit runtime height precedence.

## 2. Projection And Commit Proof

- [x] 2.1 Add focused runtime capability coverage for mounted and dismounted infantry height precedence.
- [x] 2.2 Add a tactical-map movement fixture proving projection and commit validation agree for mounted-height blocked movement and dismounted-height legal movement.
- [x] 2.3 Update rule-source and PR-spec coverage notes with the narrowed infantry mount-state boundary.

## 3. Verification

- [x] 3.1 Run focused runtime capability tests.
- [x] 3.2 Run focused reachable movement tests.
- [x] 3.3 Run focused tactical-map movement scenario tests.
