# Defensive equipment BV

`battleValueEquipment.ts` owns defensive identities, sums and AMS/APDS caps.
Mech's raw-name guard retains its separate contract. See pinned MegaMek
`48fcb2f64`: BVCalculator.java:518-646,1000-1031 and
MiscType.java:1373-1386. Missing catalog data stays unresolved.

Mounted Artemis allocation follows MekFileParser.java:422-457: first unlinked
compatible launcher in the same location. BVCalculator.java:690-699 selects
the stronger front/rear pool; 1000-1031 excludes Watchdog via F_BAP.
Drone weapon 0.8 precedes links; summary 0.95 precedes skill/rounding
(BVCalculator.java:835-887,1159-1188). Misc tools remain offensive equipment.

LRTWeapon.java:62 and SRTWeapon.java:68 also carry Artemis-compatible flags;
the canonical link classifier includes those torpedo identities.
