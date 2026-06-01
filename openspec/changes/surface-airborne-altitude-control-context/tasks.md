# Tasks: Surface Airborne Altitude-Control Context

## 1. Movement Projection Context

- [x] 1.1 Carry altitude-control required/mode/altitude on blocked VTOL/WiGE
      movement projections.
- [x] 1.2 Preserve preview and commit rejection agreement from the existing
      airborne VTOL/WiGE blockers.
- [x] 1.3 Preserve same-hex option metadata so multi-mode badges can explain
      which options are owned by altitude controls.

## 2. Player-Facing Map Context

- [x] 2.1 Expose altitude-control context on top-down hex metadata.
- [x] 2.2 Add non-color badge/aria/tooltip context for altitude-control blocked
      movement.
- [x] 2.3 Cover the rendered map behavior with a focused component test.

## 3. Documentation

- [x] 3.1 Add an OpenSpec delta for altitude-control context visibility.
- [x] 3.2 Update tactical-map audits with the source-backed outcome.

## 4. Verification

- [x] 4.1 Run focused runtime movement capability tests.
- [x] 4.2 Run focused reachable/commit validation tests.
- [x] 4.3 Run focused HexMapDisplay altitude-control context tests.
- [x] 4.4 Run OpenSpec validation for this change.
