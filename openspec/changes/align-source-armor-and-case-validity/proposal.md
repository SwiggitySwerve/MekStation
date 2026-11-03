# Align source armor guidance and CASE legality

Pinned TestMek.java:682-713 checks armor maxima, not minimum armor percentages. Low armor remains useful advice but must not reject legal construction. TestTank.java:979-981,1079-1089 requires native CASE mounts in the body; Bellona currently lacks that error.

Change the existing armor rule to warning severity and add the CASE check in the vehicle validation owner, consumed by the source handler. Preserve source loading, upper armor/weight/slot checks, all catalog data and BV. Named corpus comparisons, real-source regressions, mutation checks and all-family agreement guard the change. Other missing checks remain separately classified.

## Measured agreement

Fixed main base: e610556930c974bef862849ee1a5ac73ce24603f. All 9,815 pinned sources load in both phases. The independent loading fixes in #2607 are present only if included by this fixed base. No row newly disagrees and all 9,815 BV/status rows are unchanged.

| Family | Both valid | Both invalid | Java valid only | Local valid only | Not loadable |
| --- | ---: | ---: | ---: | ---: | ---: |
| aerospace | 611 -> 611 | 9 -> 9 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| battlearmor | 1184 -> 1184 | 4 -> 4 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| battlemechs | 2595 -> 2607 | 3 -> 3 | 1662 -> 1650 | 3 -> 3 | 0 -> 0 |
| capital | 350 -> 350 | 44 -> 44 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| infantry | 1790 -> 1790 | 30 -> 30 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| protomeks | 85 -> 85 | 1 -> 1 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| vehicles | 1420 -> 1420 | 9 -> 10 | 0 -> 0 | 15 -> 14 | 0 -> 0 |

Full named diagnostics and Java canon/design-quirk exceptions are retained in unit-loading/L-VAL-MECH.
