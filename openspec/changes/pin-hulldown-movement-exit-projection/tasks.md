# Tasks: Pin Hull-Down Movement Exit Projection

## 1. Rules Source Alignment

- [x] 1.1 Cross-check MegaMek `GetUpStep`, `MoveStep`, `MovePath`, and movement
      display handling for hull-down exit semantics
- [x] 1.2 Keep the remaining hull-down entry/vehicle-side-table gaps
      explicit in audits

## 2. Implementation

- [x] 2.1 Reserve `GET_UP` MP in hull-down ground movement projections
- [x] 2.2 Surface hull-down exit cost in map metadata and context rows
- [x] 2.3 Clear hull-down state through replay-safe movement declaration metadata
- [x] 2.4 Gate direct hull-down jump attempts until posture exit

## 3. Verification

- [x] 3.1 Add focused projection coverage for hull-down ground and jump previews
- [x] 3.2 Add focused engine/replay coverage for committed hull-down exit
- [x] 3.3 Run OpenSpec validation and focused movement tests
