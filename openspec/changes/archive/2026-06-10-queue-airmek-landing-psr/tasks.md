# Tasks: Queue AirMek Landing PSRs

## 1. PSR Taxonomy

- [x] 1.1 Add canonical `airmek_landing` PSR trigger code.
- [x] 1.2 Add an AirMek landing PSR factory and reason-code category mapping.
- [x] 1.3 Preserve PSR `reasonCode` in pending session state.

## 2. Runtime Queueing

- [x] 2.1 Queue `PSRTriggered` after required AirMek landing-control runtime
      movement-state events.
- [x] 2.2 Leave clean AirMek landing events as explanation-only runtime state.

## 3. Modifier Semantics

- [x] 3.1 Resolve AirMek landing PSRs from landing-specific damage modifiers.
- [x] 3.2 Prevent generic gyro and actuator PSR modifiers from double-counting
      the landing-specific modifier.

## 4. Coverage And Documentation

- [x] 4.1 Add focused engine queueing tests.
- [x] 4.2 Add PSR factory/category/resolution tests.
- [x] 4.3 Update tactical-map source matrix and PR coverage audit notes.
