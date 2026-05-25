# Tasks: Show VTOL Altitude Token Context

## 1. Spec Contract

- [x] 1.1 Author proposal/tasks/spec delta for VTOL altitude token context
- [x] 1.2 Validate the focused OpenSpec change

## 2. Implementation

- [x] 2.1 Project VTOL altitude from represented vehicle combat state into `IVehicleToken`
- [x] 2.2 Render a visible VTOL altitude badge without changing non-VTOL vehicle tokens
- [x] 2.3 Expose VTOL altitude as wrapper metadata and accessible token context
- [x] 2.4 Preserve VTOL altitude metadata on isometric scene token wrappers

## 3. Verification

- [x] 3.1 Add adapter coverage for VTOL altitude projection and non-VTOL suppression
- [x] 3.2 Add vehicle token coverage for airborne, hover, and non-VTOL badge behavior
- [x] 3.3 Add dispatcher coverage for token metadata and aria context
- [x] 3.4 Add browser harness coverage for top-down and isometric VTOL altitude metadata and badge rendering
- [x] 3.5 Focused Jest tests pass
- [x] 3.6 Typecheck, lint, format, diff, and strict OpenSpec validation pass
