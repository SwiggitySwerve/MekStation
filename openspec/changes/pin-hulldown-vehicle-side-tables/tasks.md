# Tasks

## 1. Spec

- [x] 1.1 Add OpenSpec deltas for hull-down vehicle fixed hit locations and
      backed-entry replay state.

## 2. Implementation

- [x] 2.1 Extend vehicle hit-location options/results with hull-down fixed
      location metadata.
- [x] 2.2 Resolve protected hull-down vehicle hits without consuming normal
      table dice.
- [x] 2.3 Persist backward hull-down entry state from movement declaration
      step chains.

## 3. Verification

- [x] 3.1 Add focused vehicle hit-location tests for turret, side, exposed
      opposite arc, backed entry, and VTOL interaction.
- [x] 3.2 Add replay reducer coverage for backward entry and clearing on
      hull-down exit.
