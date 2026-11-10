# Campaign refit construction input (ledger 3.1)

The campaign extractor now delegates to `projectMechBuildConfig` in
`src/utils/validation/mechValidationProjection.ts`. Every component selection
comes from `getMechConstructionSelections`; allocated armor is summed by the
existing `getTotalAllocatedArmor` owner. There is no new construction formula.
The adapter retains the old fields and adds `configuration` and
`frankenStructure`. The construction schema and non-campaign projection are
unchanged.

The command bar subscribes to this adapter with Zustand `useShallow`, so preview
and save receive the same input and donor-only state updates trigger validation.
Reopening a stored refit also preserves its configuration and donor sections;
armor allocation uses that configuration.

## Before and after

These are synthetic boundary cases, not canonical unit designs. All use standard
structure, a 300-rated standard engine, 160 standard armor points and 20 single
heat sinks, except FrankenMek (21 sinks) and superheavy (150 tons, superheavy gyro
and cockpit). The other cases weigh 50 tons. FrankenMek has endo-steel head and
three torso donors, with unspecified sections retaining standard structure.

| Case           | Before structure / total (t) | Before refit admission | After structure / total (t) | After refit admission | Executed Java structure (t), parity verdict |
| -------------- | ---------------------------- | ---------------------- | --------------------------- | --------------------- | ------------------------------------------- |
| Tripod         | 5 / 50                       | In progress            | 5.5 / 50.5                  | Proposed, overweight  | 5.5, PASS                                   |
| FrankenMek     | 5 / 51                       | Proposed, overweight   | 3.5 / 49.5                  | In progress           | 3.5, PASS                                   |
| Superheavy     | 30 / 79                      | In progress            | 30 / 79                     | In progress           | 30, PASS                                    |
| Bimodal LAM    | 5 / 50                       | In progress            | 5 / 50                      | In progress           | 5, PASS                                     |
| Mixed          | 5 / 50                       | In progress            | 5 / 50                      | In progress           | 5, PASS                                     |
| Ordinary biped | 5 / 50                       | In progress            | 5 / 50                      | In progress           | 5, PASS                                     |

The Java verdict covers **structure mass only**. This does not claim full Java
construction validity: the campaign construction validator does not include LAM
conversion equipment, mixed-tech legality, equipment payload or complete slot
validation. Those existing limitations are outside this projection fix.

Java was executed in a small source-file probe with `-Xmx128m`, using the existing
compiled reference runtime and JDK under
`E:/Projects/Personal/MekStation-wt/_reports/2026-10-28/upstream-crosscheck/implementation/runtime-reference`.
The reference checkout HEAD was verified as the `goalPins.megamek` pin,
`48fcb2f64a1b3f2d575707ce5653dad64927b587`. The moving checkout at
`E:/Projects/Personal/megamek` was read with `git show <pin>:<path>`.
No Gradle build or fixture regeneration was run.

The probe called `Structure.getWeightStructure` for ordinary/Tripod/superheavy
cases and `TestMek.getWeightStructure` on a donor-configured `BipedMek` for
FrankenMek. The runtime emitted a Log4j configuration diagnostic, then returned
all six values and exit 0.

Pinned citations:

- [Structure.java:64-109](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/verifier/Structure.java#L64): Tripod multiplier, superheavy divisors and half-ton rounding.
- [TestMek.java:118-139](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/verifier/TestMek.java#L118): section-weighted donor mass and final rounding.
- [Mek.java:1052-1060](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Mek.java#L1052): native section fractions.

## Complete selection audit

`getMechConstructionSelections` carries 17 fields. Seven were absent from the
previous refit config. Armor type was already present.

| Selection               | Previous refit input          | Read by `validateConstruction`? | Effect of this change                                                                  |
| ----------------------- | ----------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| `configuration`         | Dropped after armor summation | Yes, structure context          | Tripod ×1.1, configuration-aware donor location mapping                                |
| `frankenStructure`      | Dropped                       | Yes, structure context          | Uses `typeByLocation` and `locationTonnage`, including native fallback and rounding    |
| `lamType`               | Dropped                       | No                              | Remains outside `MechBuildConfig`; no conversion-mass change                           |
| `techBaseMode`          | Dropped                       | No                              | Remains outside `MechBuildConfig`; no mixed-tech legality change                       |
| `techBase`              | Dropped                       | No                              | Remains outside `MechBuildConfig`; concrete component enums retain their tech variants |
| `armorTonnage`          | Dropped                       | No                              | Remains outside `MechBuildConfig`; validator computes armor mass from points/type      |
| `jumpJetType`           | Dropped                       | No                              | Remains outside `MechBuildConfig`; no jump-jet calculation added                       |
| `tonnage`               | Carried                       | Yes                             | Unchanged, including existing superheavy behavior                                      |
| `engineType`            | Carried                       | Yes                             | Unchanged                                                                              |
| `engineRating`          | Carried                       | Yes                             | Unchanged                                                                              |
| `gyroType`              | Carried                       | Yes                             | Unchanged                                                                              |
| `internalStructureType` | Carried                       | Yes                             | Unchanged default type; donor overrides now reach the existing owner                   |
| `cockpitType`           | Carried                       | Yes                             | Unchanged                                                                              |
| `heatSinkType`          | Carried                       | Yes                             | Unchanged                                                                              |
| `heatSinkCount`         | Carried as `totalHeatSinks`   | Yes                             | Unchanged                                                                              |
| `armorType`             | Carried                       | Yes                             | Unchanged                                                                              |
| `jumpMP`                | Carried                       | No                              | Preserved; absent optional selection defaults to zero                                  |

`totalArmorPoints` is derived from allocation rather than a selection field. Its
existing configuration-aware sum is preserved, including center-leg armor.

## Regression and mutation evidence

- Before the fix, the refit input test had two failures (Tripod 5 versus 5.5;
  FrankenMek 5 versus 3.5) and four passing controls. The separate delegation
  test rejected the local extractor body. The command-bar tests failed because
  both invalid previews left save enabled. Reopening a stored Tripod failed
  because initialization returned Biped. Each passed after its corresponding fix.
- Drop `configuration` in the adapter: killed by the Tripod refit test (one
  failure, five controls pass).
- Drop `frankenStructure` in the adapter: killed by the FrankenMek refit test
  (one failure, five controls pass).
- Reintroduce a complete local mapping in the campaign extractor, preserving
  the fixed fields: killed by the delegation test. The test requires the exact
  object returned by the mocked shared adapter, not an equivalent copied value.
- Existing `useUnitValidation.test.tsx` ran against the baseline owner and the
  final owner. All eight recorded cases (complete input, options, UI state and
  diagnostics) were byte-identical: 76,783 bytes, SHA-256
  `a28878e9058dcdf8df306d4b489490551075217b802cc73559b539608d9bc703`.
  No non-campaign projection implementation or hook was changed.
- Store integration exercises `commitRefitOrder`, the actual admission gate,
  campaign store, server-save envelope and reload. Tripod remains proposed;
  donor structure reaches an in-progress order without being lost in persistence.

Raw local receipts, mutation logs, probe source and command logs are retained in
`.review/campaign-refit/` in this worktree. Hosted PR checks provide the broader
verification; no full/directory-wide Jest, census, guarded proof, build or
Playwright was run locally.

## Projection search and campaign caller review

`rg -n 'MechBuildConfig|extractMechBuildConfigFromUnitState' src` identified no
other production `UnitState` → `MechBuildConfig` projection. The remaining literal
in `refit/unitConfiguration.ts` is a fixed fallback, not a state projection.
Estimator/classifier/pipeline/store consumers accept existing configs; other
literals are tests. The command bar's manual partial-state list was removed.

C4 reviews the campaign callers, including initialization, preview, save and
the pipeline/store boundary. One pre-existing caller limitation remains:
`countConfigurationChanges` enumerates the stored current config's keys. Older
saves lacking optional context keys can omit a context-only edit from the change
count. The preview subscription test changes donors on an already edited build;
it does not claim that a donor-only edit to such a legacy save enables saving.

## Local gates

Both TypeScript projects passed via `npm run typecheck`. The 14 explicitly named
Jest files passed all 116 tests with `--maxWorkers=3`. All nine changed files
passed `oxfmt --check`. Configured lint passed with zero warnings/errors on the
three changed production files; the repository excludes tests from lint. A
separate check enabling test lint found two pre-existing hook-name errors and two
unused constants in `coopMutationPersistence.test.ts`; the other seven changed
TypeScript files passed that check. No OpenSpec files were changed.
