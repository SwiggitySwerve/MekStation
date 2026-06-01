# Tasks: Gate Altitude Controls By Clearance

## 1. Rules Projection

- [x] 1.1 Derive VTOL/WiGE altitude-command min/max bounds from selected-hex
      terrain features and represented unit height.
- [x] 1.2 Preserve legal Climb/Descend runtime payloads and MP reserve metadata.
- [x] 1.3 Refresh command-registry dependencies when selected terrain/elevation
      changes.

## 2. Coverage

- [x] 2.1 Add focused command tests for water, woods, building, and bridge
      descent gates.
- [x] 2.2 Add focused command tests for VTOL under-bridge climb blocking and
      WiGE building-top climb allowance.

## 3. Documentation

- [x] 3.1 Add an OpenSpec delta for altitude-control terrain clearance.
- [x] 3.2 Update tactical-map audit and PR coverage notes with the reduced
      follow-up gap.
