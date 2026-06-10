# Tasks: Gate LAM AirMek WiGE Altitude Ceiling

## 1. Rules Projection

- [x] 1.1 Add LAM AirMek WiGE elevation to the runtime movement command
      context.
- [x] 1.2 Dispatch replayable `lamAirMekAltitude` runtime movement-state
      changes.
- [x] 1.3 Cap AirMek Climb availability at represented WiGE elevation 25.
- [x] 1.4 Mark elevated AirMek ground movement projection as altitude-control
      owned.

## 2. Coverage

- [x] 2.1 Add command tests for AirMek Climb/Descend payloads and max ceiling.
- [x] 2.2 Add runtime projection tests for elevated/grounded AirMek altitude
      ownership.
- [x] 2.3 Add reducer/projection tests proving `lamAirMekAltitude` replay
      reserves altitude-control MP before later movement.

## 3. Documentation

- [x] 3.1 Add this OpenSpec delta.
- [x] 3.2 Update tactical-map audit and PR coverage notes with the reduced LAM
      AirMek follow-up gap.
