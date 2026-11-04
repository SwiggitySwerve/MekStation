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

Represented `ISAPDS Ammo` bins join the shared AMS/APDS defensive pool;
its cap remains the combined listed weapon BV, including duplicate bins.
Pinned MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
AmmoType.java:12242-12254; BVCalculator.java:570-572,629-635.
The unchanged Padilla contract regression pins defense 647.36 and total 1155.

Native B-Pod display-name resolution can select the imported ISBPod identity.
Both that identity and legacy `b-pod` retain the native defensive F_B_POD role.
Pinned MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
ISBPod.java:49-53; BPodWeapon.java:79-80; BVCalculator.java:522-526.
