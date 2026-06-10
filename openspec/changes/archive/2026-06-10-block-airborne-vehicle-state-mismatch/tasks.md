# Tasks: Block Airborne Vehicle State Mismatch

## 1. Movement Projection

- [x] 1.1 Use represented vehicle combat-state motion type to select the
      airborne VTOL/WiGE ground-projection blocker.
- [x] 1.2 Preserve landed VTOL/WiGE behavior when represented altitude is zero.
- [x] 1.3 Keep stale or mismatched movement capabilities fail-closed.

## 2. Documentation

- [x] 2.1 Add an OpenSpec delta for stale-capability airborne vehicle state.
- [x] 2.2 Update tactical-map audits with the state-mismatch source pin.

## 3. Verification

- [x] 3.1 Run focused runtime movement capability tests.
- [x] 3.2 Run focused reachable/commit validation tests.
- [x] 3.3 Run OpenSpec validation for this change.
