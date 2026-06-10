# Tasks: Block Airborne VTOL/WiGE Ground Projection

## 1. Projection And Commit Guard

- [x] 1.1 Detect represented airborne altitude state for VTOL/WiGE motive
      movement.
- [x] 1.2 Return a blocked movement projection instead of legal ground movement
      when an airborne VTOL/WiGE destination is evaluated.
- [x] 1.3 Ensure committed movement reuses the projection reason and rejects
      with matching details.

## 2. Source Proof

- [x] 2.1 Preserve landed/hover VTOL/WiGE projection behavior.
- [x] 2.2 Add focused projection and commit-validation coverage for airborne
      VTOL/WiGE blocked details.
- [x] 2.3 Update tactical-map audits with the MegaMek-backed source pin.

## 3. Verification

- [x] 3.1 Run focused runtime movement capability tests.
- [x] 3.2 Run focused movement reachability/commit-validation tests.
- [x] 3.3 Run OpenSpec validation for this change.
