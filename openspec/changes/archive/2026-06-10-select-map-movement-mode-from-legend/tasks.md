## 1. Implementation

- [x] Add an optional MP legend movement-mode selection callback.
- [x] Forward the callback from the game session movement planning hook through the gameplay layout and map overlays.
- [x] Seed selected-unit planned movement from legend selections using the existing movement projection path.

## 2. Verification

- [x] Add focused unit coverage for legend row selectability and callback behavior.
- [x] Add focused helper coverage for legend mode-to-movement-type mapping.
- [x] Run focused Jest tests.
- [x] Run strict OpenSpec validation.
- [x] Run typecheck, lint, format, build, and diff checks.
