# Tasks

## 1. Spec

- [x] 1.1 Add OpenSpec deltas for session-level vehicle attack dispatch and
      replayed vehicle combat-state mutation.

## 2. Implementation

- [x] 2.1 Add `vehicleInit` session unit input and seed `kind: "vehicle"`
      combat state for vehicle-family units.
- [x] 2.2 Route represented vehicle targets through vehicle hit-location and
      damage resolution during session weapon attacks.
- [x] 2.3 Emit vehicle damage, motive, immobilization, VTOL crash, and
      destruction events from the committed session path.
- [x] 2.4 Update reducers so replayed vehicle events mutate the vehicle
      combat-state envelope.

## 3. Verification

- [x] 3.1 Add initialization coverage for vehicle and VTOL combat-state seeding.
- [x] 3.2 Add session attack coverage proving represented vehicle targets use
      vehicle locations/damage, hull-down fixed turret hits skip location dice,
      and VTOL rotor hits emit crash/immobilization events.
