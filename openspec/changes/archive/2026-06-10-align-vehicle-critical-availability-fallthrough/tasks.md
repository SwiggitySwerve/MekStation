# Tasks: Align Vehicle Critical Availability Fallthrough

## 1. Spec Contract

- [x] 1.1 Add combat-resolution requirements for represented vehicle critical
  availability fallthrough
- [x] 1.2 Keep unrepresented equipment import parity explicitly out of scope

## 2. Implementation

- [x] 2.1 Replace fixed location-table lookups with MegaMek-style fallthrough
  selection
- [x] 2.2 Supply session represented state to the critical table context
- [x] 2.3 Preserve legacy direct-call behavior when availability context is not
  provided

## 3. Verification

- [x] 3.1 Add focused resolver tests for ammo, crew, engine, turret, and rotor
  fallthrough
- [x] 3.2 Add session coverage proving no-ammo turret criticals emit the
  fallen-through result instead of suppressing to no effect
- [x] 3.3 Run focused tests, typecheck/lint/format, and OpenSpec validation
