# Tasks: Import Vehicle Critical Target Equipment Availability

## 1. Spec Contract

- [x] 1.1 Add combat-resolution requirements for represented target vehicle
  equipment availability in critical fallthrough
- [x] 1.2 Keep cargo, stabilizer runtime mutation, dual-turret identity, and
  external oracle sweeps explicitly bounded as follow-up work

## 2. Implementation

- [x] 2.1 Add optional vehicle critical availability metadata to session unit
  bindings
- [x] 2.2 Derive represented vehicle weapon mount locations and live weapon
  locations from adapted target weapons during session setup
- [x] 2.3 Feed committed session vehicle critical dispatch from target
  availability metadata while preserving optimistic defaults for unknown facts

## 3. Verification

- [x] 3.1 Add focused resolver coverage for no-weapon and no-cargo fallthrough
- [x] 3.2 Add session coverage proving target weapon availability changes the
  emitted critical result
- [x] 3.3 Add setup coverage proving adapted vehicle mount metadata is copied
  into session unit bindings
- [x] 3.4 Run focused tests, typecheck/lint/format, and OpenSpec validation
