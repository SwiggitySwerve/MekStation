# Tasks: Pin Hull-Down Entry Projection

## 1. Rules Source Alignment

- [x] 1.1 Cross-check MegaMek `HullDownStep`, `MoveStep`, and Mek
      `canGoHullDown` handling for standing entry legality, cost, and posture
      mutation
- [x] 1.2 Keep prone-entry and vehicle/QuadVee side-table hull-down gaps
      explicit in audits

## 2. Implementation

- [x] 2.1 Add a movement action-dock command for standing Mek-style hull-down
      entry
- [x] 2.2 Commit hull-down entry through movement declaration and movement
      locking
- [x] 2.3 Replay hull-down entry declarations by setting hull-down and clearing
      prone
- [x] 2.4 Block prone, already-hull-down, non-Mek-style, insufficient-MP, and
      destroyed-gyro attempts

## 3. Verification

- [x] 3.1 Add focused command availability and dispatch coverage
- [x] 3.2 Add focused engine/replay coverage for committed hull-down entry
- [x] 3.3 Run OpenSpec validation and focused movement tests
