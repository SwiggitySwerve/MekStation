# BattleMech validity: native loading facts

Pinned MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587; mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985. Fixed comparison base e610556930c974bef862849ee1a5ac73ce24603f.

The 9,815-row construction-validity harness reproduces the editor projections and real source handlers. First rejecting errors classify every Java-valid rejected mech; multiple errors can affect the same unit. Java diagnostics are retained verbatim. Four Java-valid corpus mechs carry diagnostics under the canon/design-quirk exception in TestMek.java:779-782; Java validity is not inferred from empty text. See JAVA-VALID-EXCEPTIONS.json.

| First rejecting rule | Before |
| -------------------- | -----: |
| VAL-UNIV-014         |   1008 |
| VAL-UNIV-015         |    611 |
| VAL-UNIV-013         |     27 |
| VAL-BM-001           |     16 |

969 overweight rows carry serialized CLAN_XL. The loader discarded that identity and selected a standard engine. MtfFile.java:387-403 keeps explicit engine technology and Engine.java:416-418 halves XL engine mass before rounding. Nova A therefore loads with a 6.5 t engine and 50 t total instead of 12.5 t and 56 t. No weight check or arithmetic is weakened.

MtfFile.java:1010-1020 removes (OMNIPOD) before the rear marker and equipment lookup. The shared loading parser now applies that ordering both when restoring critical slots and matching mixed-tech evidence. Avatar AV1-OR also demonstrates why the technology hint must use the stripped token. Native mount markers are kept separate from equipment identity. Already resolved decorated spellings retain their catalog IDs; the CI-exercised half-ton MG bin remains mg-ammo-half.

| Family      |   Both valid | Both invalid | Java valid only | Local valid only | Not loadable |
| ----------- | -----------: | -----------: | --------------: | ---------------: | -----------: |
| aerospace   |   611 -> 611 |       9 -> 9 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| battlearmor | 1184 -> 1184 |       4 -> 4 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| battlemechs | 2595 -> 3728 |       3 -> 3 |     1662 -> 529 |           3 -> 3 |       0 -> 0 |
| capital     |   350 -> 350 |     44 -> 44 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| infantry    | 1790 -> 1790 |     30 -> 30 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| protomeks   |     85 -> 85 |       1 -> 1 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| vehicles    | 1420 -> 1420 |       9 -> 9 |          0 -> 0 |         15 -> 15 |       0 -> 0 |

1,133 additional mechs now agree with Java. Every source still loads, no row newly disagrees, and all 9,815 strict-comparator BV/status rows remain unchanged. Canonical unit data, catalogs and validator rules are untouched. Both phases were refreshed on the same merged source base by restoring only the three executable loading files changed by this PR to that base for the before run, then restoring final bytes in finally. Incoming main changes are present in both phases.

The native loading regressions fail before and pass after, including the ammunition compatibility case surfaced by CI. Four mutants are killed: wrong Clan XL identity, retained pod suffix, decorated mixed-tech hint and loss of an established decorated identity. Both TypeScript projects, lint, repository formatting, and mech validation/customizer suites are recorded in L-VAL-MECH evidence.

Remaining first-error classes:

| Rule         | After |
| ------------ | ----: |
| VAL-UNIV-015 |   444 |
| VAL-UNIV-014 |    41 |
| VAL-UNIV-013 |    27 |
| VAL-BM-001   |    17 |

The remaining detailed records and all 18 locally-only-valid units, including Java diagnostics, are preserved in causes.json and pr1-after-causes.json. Split critical locations, cockpit-specific fixed topology, catalog facts and native tonnage constraints need separate bounded changes. The independent armor/CASE correction is tracked in #2608. No unknown identity or unrepresented construction fact is replaced with an assumed legal result.

The later #2609 merge only moves equipment initialization in asynchronous loadUnit. This harness initializes both services explicitly and calls synchronous mapToUnitState and source handlers; the fixed paired calculations remain unchanged. See pr1-main-impact.json.
