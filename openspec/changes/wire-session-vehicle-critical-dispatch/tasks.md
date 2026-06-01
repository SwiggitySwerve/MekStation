# Tasks

## 1. Spec

- [x] 1.1 Add OpenSpec deltas for session-level vehicle critical dispatch and
      replayed vehicle critical-state mutation.

## 2. Implementation

- [x] 2.1 Preserve vehicle engine type and ammo explosion damage metadata in
      session state.
- [x] 2.2 Trigger vehicle critical resolution from committed vehicle weapon
      hits on TAC or structure exposure.
- [x] 2.3 Emit replay-visible vehicle critical, crew-stun,
      component-destroyed, ammo-explosion, and destruction events.
- [x] 2.4 Update reducers so vehicle critical replay mutates the vehicle
      combat-state envelope.

## 3. Verification

- [x] 3.1 Add session attack coverage for vehicle TAC crew-stun criticals.
- [x] 3.2 Add session attack coverage for crit-induced vehicle ammo
      explosions.
