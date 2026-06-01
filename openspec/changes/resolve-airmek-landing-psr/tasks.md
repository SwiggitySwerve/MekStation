# Tasks: Resolve AirMek Landing PSRs

## 1. Runtime Resolution

- [x] 1.1 Pass the interactive-session d6 roller into runtime movement-state
      actions.
- [x] 1.2 Resolve required AirMek landing PSRs immediately after
      `PSRTriggered`.
- [x] 1.3 Emit `PSRResolved` for both passing and failing landing checks.

## 2. Failure Consequences

- [x] 2.1 Carry represented landing fall height on the runtime movement-state
      payload.
- [x] 2.2 Convert failed AirMek landing checks into `UnitFell` and `PilotHit`
      events using the current engine fall model.
- [x] 2.3 Leave armor/internal crash damage as a documented follow-up.

## 3. Coverage And Documentation

- [x] 3.1 Update command tests for landing fall-height metadata.
- [x] 3.2 Add runtime tests for passing and failing AirMek landing PSRs.
- [x] 3.3 Update OpenSpec and tactical-map audit notes.
