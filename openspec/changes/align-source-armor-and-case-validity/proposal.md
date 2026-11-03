# Align source armor guidance and CASE legality

Pinned TestMek.java:682-713 checks armor maxima, not minimum armor percentages. Low armor remains useful advice but must not reject legal construction. TestTank.java:979-981,1079-1089 requires native CASE mounts in the body; Bellona currently lacks that error.

Change the existing armor rule to warning severity and add the CASE check in the vehicle validation owner, consumed by the source handler. Preserve source loading, upper armor/weight/slot checks, all catalog data and BV. Named corpus comparisons, real-source regressions, mutation checks and all-family agreement guard the change. Other missing checks remain separately classified.

## Measured agreement

Fixed merged main base: fbcf6bba90f49fd389b06ef7d8e755e4b0659b9b. All 9,815 pinned sources load in both phases. Both phases include the merged #2607 loading corrections. No row newly disagrees. The CI repair changes tests only; the original 9,815-row paired BV comparison on e610556930c974bef862849ee1a5ac73ce24603f records zero BV/status changes. Full named diagnostics and earlier measurements remain in unit-loading/L-VAL-MECH.

| Family | Both valid | Both invalid | Java valid only | Local valid only | Not loadable |
| --- | ---: | ---: | ---: | ---: | ---: |
| AeroSpaceFighter | 499 -> 499 | 3 -> 3 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| BattleArmor | 1184 -> 1184 | 4 -> 4 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| BipedMek | 3589 -> 3600 | 2 -> 2 | 473 -> 462 | 2 -> 2 | 0 -> 0 |
| ConvFighter | 46 -> 46 | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| ConvInfantry | 1790 -> 1790 | 30 -> 30 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| Dropship | 202 -> 202 | 7 -> 7 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| FixedWingSupport | 29 -> 29 | 4 -> 4 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| Jumpship | 26 -> 26 | 3 -> 3 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| LandAirMek | 20 -> 20 | 0 -> 0 | 2 -> 2 | 1 -> 1 | 0 -> 0 |
| LargeSupportTank | 20 -> 20 | 2 -> 2 | 0 -> 0 | 3 -> 3 | 0 -> 0 |
| ProtoMek | 85 -> 85 | 1 -> 1 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| QuadMek | 104 -> 104 | 1 -> 1 | 45 -> 45 | 0 -> 0 | 0 -> 0 |
| QuadVee | 13 -> 13 | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| SmallCraft | 37 -> 37 | 2 -> 2 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| SpaceStation | 17 -> 17 | 16 -> 16 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| SuperHeavyTank | 11 -> 11 | 0 -> 0 | 0 -> 0 | 1 -> 1 | 0 -> 0 |
| SupportTank | 169 -> 169 | 6 -> 6 | 0 -> 0 | 3 -> 3 | 0 -> 0 |
| SupportVTOL | 23 -> 23 | 1 -> 1 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| Tank | 1066 -> 1066 | 0 -> 1 | 0 -> 0 | 8 -> 7 | 0 -> 0 |
| TripodMek | 2 -> 3 | 0 -> 0 | 9 -> 8 | 0 -> 0 | 0 -> 0 |
| VTOL | 131 -> 131 | 0 -> 0 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| Warship | 105 -> 105 | 18 -> 18 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
