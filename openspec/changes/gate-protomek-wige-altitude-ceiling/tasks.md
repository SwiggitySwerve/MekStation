# Tasks: Gate ProtoMek WiGE Altitude Ceiling

## 1. Rules Projection

- [x] 1.1 Add ProtoMek Glider altitude to the runtime movement command context.
- [x] 1.2 Dispatch replayable `protoAltitude` runtime movement-state changes.
- [x] 1.3 Cap Glider Climb availability at represented WiGE altitude 12.
- [x] 1.4 Mark airborne Glider ground movement projection as altitude-control
      owned.

## 2. Coverage

- [x] 2.1 Add command tests for Glider Climb/Descend payloads and max ceiling.
- [x] 2.2 Add runtime projection tests for airborne/grounded Glider altitude
      ownership.
- [x] 2.3 Add reducer/projection tests proving `protoAltitude` replay reserves
      altitude-control MP before later movement.

## 3. Documentation

- [x] 3.1 Add this OpenSpec delta.
- [x] 3.2 Update tactical-map audit and PR coverage notes with the reduced
      ProtoMek follow-up gap.
