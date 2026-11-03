# BattleMech validity: native loading facts

Pinned MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587; mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985. Fixed comparison base f6aacf32922f554493a0d26665b0e3f95285fd40.

The 9,815-row construction-validity harness reproduces the editor projections and real source handlers. First rejecting errors classify every Java-valid rejected mech; multiple errors can affect the same unit. Java reports no construction diagnostic on these valid rows.

| First rejecting rule | Before |
| -------------------- | -----: |
| VAL-UNIV-014         |   1008 |
| VAL-UNIV-015         |    611 |
| VAL-UNIV-013         |     27 |
| VAL-BM-001           |     16 |

969 overweight rows carry serialized CLAN_XL. The loader discarded that identity and selected a standard engine. MtfFile.java:387-403 keeps explicit engine technology and Engine.java:416-418 halves XL engine mass before rounding. Nova A therefore loads with a 6.5 t engine and 50 t total instead of 12.5 t and 56 t. No weight check or arithmetic is weakened.

MtfFile.java:1010-1020 removes (OMNIPOD) before the rear marker and equipment lookup. The shared loading parser now applies that ordering both when restoring critical slots and matching mixed-tech evidence. Avatar AV1-OR also demonstrates why the technology hint must use the stripped token. Native mount markers are kept separate from equipment identity.

| Family      |   Both valid | Both invalid | Java valid only | Local valid only | Not loadable |
| ----------- | -----------: | -----------: | --------------: | ---------------: | -----------: |
| aerospace   |   611 -> 611 |       9 -> 9 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| battlearmor | 1184 -> 1184 |       4 -> 4 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| battlemechs | 2595 -> 3728 |       3 -> 3 |     1662 -> 529 |           3 -> 3 |       0 -> 0 |
| capital     |   350 -> 350 |     44 -> 44 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| infantry    | 1790 -> 1790 |     30 -> 30 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| protomeks   |     85 -> 85 |       1 -> 1 |          0 -> 0 |           0 -> 0 |       0 -> 0 |
| vehicles    | 1420 -> 1420 |       9 -> 9 |          0 -> 0 |         15 -> 15 |       0 -> 0 |

1,133 additional mechs now agree with Java. Every source still loads, no row newly disagrees, and all 9,815 strict-comparator BV/status rows remain unchanged. Canonical unit data, catalogs and validator rules are untouched. The subsequent main merge contains only #2603 custom-alias precedence; its default 42,527-name snapshot was unchanged, so it does not alter this source-corpus measurement.

Four real-unit/projection regressions fail before and pass after. Three mutants are killed: wrong Clan XL identity, retained pod suffix, and decorated mixed-tech hint. Both TypeScript projects, lint, repository formatting, and mech validation/customizer suites are recorded in L-VAL-MECH evidence.

Remaining first-error classes:

| Rule         | After |
| ------------ | ----: |
| VAL-UNIV-015 |   442 |
| VAL-UNIV-014 |    43 |
| VAL-UNIV-013 |    27 |
| VAL-BM-001   |    17 |

The remaining detailed records and all 18 locally-only-valid units, including Java diagnostics, are preserved in causes.json and pr1-after-causes.json. Split critical locations, cockpit-specific fixed topology, catalog facts, low-armor guidance and native tonnage constraints need separate bounded changes. No unknown identity or unrepresented construction fact is replaced with an assumed legal result.
