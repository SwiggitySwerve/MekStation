# Editable mech BV transport

`editableMechProjection.ts` transports live editor selections to the existing
BattleMech BV owner. It does not implement CASE, heat, or BV arithmetic.

- `resolveUnitChassisTechBase` in `TechBaseConfiguration.ts` owns decoding the
  source chassis fact. Missing or invalid evidence remains unknown.
- The loader's binary component defaults do not establish chassis provenance.
  Without an explicit source chassis, omit the BV input's component fact so the
  BV owner's current compatibility fallback remains unchanged.
- Once a source establishes chassis identity, use the live chassis selection.
  Structure material, armor technology, equipment, and unit names are not
  alternative evidence.
- Preserve the unit's explicit technology mode independently of the binary
  component setting. The shared encoders also serve custom-unit serialization.
- Status, saved quick-game construction, and serialization already have source
  BV context. Preview transports only the chassis source and live selections;
  supplying that evidence must not opt Preview into other source-BV repairs.
- Tests cover the unlisted Clan synthetic, the legacy listed Clan default,
  all 43 source-IS counterexamples, caller refresh, and explicit save/reopen.
  The pinned rules remain in `openspec/specs/battle-value-system/spec.md`.
