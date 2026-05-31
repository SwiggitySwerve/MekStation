# Tasks: Wire VTOL/WiGE Altitude Controls

## 1. Runtime State

- [x] 1.1 Add a replayable runtime movement-state altitude-control source.
- [x] 1.2 Replay vehicle altitude changes into represented vehicle combat
      state.
- [x] 1.3 Prove the updated altitude feeds the existing movement projection
      blocker.

## 2. Command Surface

- [x] 2.1 Surface Climb/Descend commands for represented VTOL/WiGE vehicles in
      the movement command family.
- [x] 2.2 Gate altitude commands by turn ownership, movement lock state, current
      preview state, current altitude, and conservative VTOL/WiGE altitude
      bounds.
- [x] 2.3 Route command commits through `runtime-movement-state`.

## 3. Documentation

- [x] 3.1 Add an OpenSpec delta for altitude-control commands.
- [x] 3.2 Update tactical-map audits with the new actionable altitude-control
      state path.

## 4. Verification

- [x] 4.1 Run focused command-registry tests.
- [x] 4.2 Run focused runtime movement-state reducer/projection tests.
- [x] 4.3 Run OpenSpec validation for this change.
