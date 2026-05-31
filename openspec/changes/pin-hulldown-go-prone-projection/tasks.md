# Tasks: Pin Hull-Down Go-Prone Projection

## 1. Rules Source Alignment

- [x] 1.1 Cross-check MegaMek `GoProneStep` and `MoveStep` handling for
      hull-down `GO_PRONE` legality, cost, and posture mutation
- [x] 1.2 Keep hull-down entry and vehicle/QuadVee side-table gaps explicit in
      audits

## 2. Implementation

- [x] 2.1 Add a movement action-dock command for hull-down Mek-style go-prone
- [x] 2.2 Commit go-prone through movement declaration and movement locking
- [x] 2.3 Replay go-prone declarations by setting prone and clearing hull-down
- [x] 2.4 Block non-hull-down, already-prone, and non-Mek-style attempts

## 3. Verification

- [x] 3.1 Add focused command availability and dispatch coverage
- [x] 3.2 Add focused engine/replay coverage for committed go-prone
- [x] 3.3 Run OpenSpec validation and focused movement tests
