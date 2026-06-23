## Context

MekStation already has a catalog-backed BattleMech combat validation substrate in `src/simulation/runner/CombatValidationCatalog.ts`, `CombatValidationRequirementSupport.*`, `CombatValidationGapInventory.ts`, and the `battlemechCombatCatalog.*` Jest fragments. The runnable command surface is also present: `npm.cmd run validate:combat:gaps`, `npm.cmd run validate:combat`, and `npm.cmd run verify:rules`.

Wave 10 does not need a second validation framework. It needs to tighten the existing one around official combat catalog rows so official ranged weapons, ammunition, physical weapons, and special-mode behavior are either proven by catalog-backed tests or listed as explicit gaps. The main architectural constraint is honesty: synthetic/static fallback data and broad `knownLimitations` suppression must not make unsupported mechanics look supported.

## Goals / Non-Goals

**Goals:**

- Define a single BattleMech combat catalog parity matrix for official ranged weapon, ammunition, physical weapon, and special-mode rows.
- Extend the existing gap exporter so newly closed or newly discovered rows are visible and expectation-gated.
- Add focused tests that prove newly represented rows are loaded from official/catalog-backed data and consumed by runtime behavior.
- Keep unsupported, helper-only, modifier-only, and non-BattleMech rows explicit.

**Non-Goals:**

- Do not rewrite combat resolution or tactical map projection.
- Do not add UI controls in this wave.
- Do not claim full non-BattleMech rules parity.
- Do not remove `knownLimitations` buckets except where focused tests prove the bucket is no longer required.

## Decisions

### Decision 1: Extend the existing combat validation catalog

Wave 10 SHALL add rows, support references, and fragment tests under the existing combat validation catalog surface instead of introducing a separate catalog-parity runner.

Alternative considered: create a new standalone catalog audit command. Rejected because `validate:combat:gaps` and `validate:combat` already provide the on-demand evidence and gap accounting surface.

### Decision 2: Classify every official row before claiming support

Each catalog row SHALL land in one explicit classification: integrated runtime behavior, represented helper/modifier behavior, partial/unsupported gap, or out-of-scope split. Physical weapons need a separate standalone-attack vs modifier-only split so claws/talons-style equipment does not inflate selectable attack support.

Alternative considered: only add tests for newly supported rows. Rejected because unclassified official rows are the failure mode this wave is meant to expose.

### Decision 3: Treat fallback data as a failure unless explicitly marked as fixture-only

Runtime parity SHALL not use static/synthetic fallback data to satisfy official catalog coverage. Tests should pin that official catalog assets loaded and that missing catalog rows fail with named gap refs.

Alternative considered: keep fallback rows to keep tests stable. Rejected because fallback data hides the exact class of regression the user wants surfaced.

### Decision 4: Audit known limitations instead of deleting them broadly

`knownLimitations` SHALL remain a legacy-detector suppression layer, not a feature-status ledger. Wave 10 should add tests that bypass or trap suppressions for the targeted catalog rows, and only narrow suppressions when the targeted detector proof exists.

Alternative considered: remove broad known-limitation buckets now. Rejected because unrelated legacy detectors could start producing noisy false positives without proving catalog parity.

## Risks / Trade-offs

- [Risk] Catalog parity work becomes too broad for one PR. -> Mitigation: focus on BattleMech ranged weapons/ammunition/physical weapons and special-mode rows named in the proposal; split non-BattleMech rows.
- [Risk] Existing support maps already contain many rows and a broad edit could regress unrelated validation. -> Mitigation: use focused fragment tests plus `validate:combat:gaps`, `validate:combat`, and `verify:rules` before archive.
- [Risk] Official catalog names differ across equipment JSON, runner weapon IDs, and MegaMek references. -> Mitigation: add alias/mapping tests that fail loudly when a row has no source-backed mapping.
- [Risk] MML-style damage hazards have mixed runtime/display semantics. -> Mitigation: classify MML rows explicitly as integrated, helper-only, partial, or unsupported rather than leaving string-damage hazards implicit.

## Migration Plan

1. Capture the current gap inventory summary with `npm.cmd run validate:combat:gaps -- --format=summary`.
2. Add/adjust catalog support rows and focused fragment tests for official ranged weapons, ammunition, physical weapons, and special modes.
3. Add expectation-gated gap checks for rows that should disappear or remain explicit.
4. Run focused Jest fragments, `npm.cmd run validate:combat:gaps`, `npm.cmd run validate:combat`, `npm.cmd run verify:rules`, `npm.cmd run typecheck`, and OpenSpec strict validation.
5. Sync specs, archive the change, open PR, wait for CI, merge, reset/prune local state.

## Open Questions

- Which remaining unresolved refs should Wave 10 close first if the current gap summary is larger than expected?
- Should the MML hazard classification live under ammunition compatibility, weapon resolution, or a dedicated missile-family support map?
