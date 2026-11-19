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
- One shared projection input, built by the owner
  (`buildEditableMechProjectionInput`), feeds the status bar, the record sheet
  (Preview tab, canvas, PDF, print), saved quick-game construction, and
  serialization. All of them carry the unit's `bvContext`. Preview and print use
  it deliberately: without it, 2,609 of 4,263 printed BattleMech BVs were wrong
  (the record sheet and the status bar disagreed; measurement in
  `_scratch/sm-audit-reports/parity-preview-bv/RESULT.md`). `chassisSource`
  remains only as an explicit override for a caller that has no `bvContext`.
- Enforcement: `projectEditableMech` accepts only the owner's branded
  `EditableMechProjectionInput`, so no caller can hand-build an input, however it
  imports. `editableMechProjection.callers.test.ts` pins every caller and the
  arguments given to the owner (TypeScript AST, import aliases resolved).
- Tests cover the unlisted Clan synthetic, the legacy listed Clan default,
  all 43 source-IS counterexamples, caller refresh, and explicit save/reopen.
  The pinned rules remain in `openspec/specs/battle-value-system/spec.md`.
