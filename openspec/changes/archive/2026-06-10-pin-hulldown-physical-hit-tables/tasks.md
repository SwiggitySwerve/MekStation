# Tasks

## 1. Spec

- [x] 1.1 Add OpenSpec deltas for MegaMek-backed hull-down physical hit-table
      projection.

## 2. Implementation

- [x] 2.1 Add shared physical hit-table selection for hull-down punches and
      represented Mek-style melee weapon attacks.
- [x] 2.2 Persist the selected physical hit table on physical attack
      declarations.
- [x] 2.3 Make physical resolution consume the declared hit table so preview
      and commit cannot drift when target-specific elevation context is absent
      from the later resolver map.

## 3. Verification

- [x] 3.1 Add focused physical projection/damage/resolution tests for
      hull-down punch and club hit-table selection.
- [x] 3.2 Add declaration-payload coverage proving the selected hit table is
      persisted.
