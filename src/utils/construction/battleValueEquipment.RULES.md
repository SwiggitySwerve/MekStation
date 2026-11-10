# Defensive equipment BV

`battleValueEquipment.ts` owns defensive identities, sums and AMS/APDS caps.
Mech's raw-name guard retains its separate contract. See pinned MegaMek
`48fcb2f64`: BVCalculator.java:518-646,1000-1031 and
MiscType.java:1373-1386. Missing catalog data stays unresolved.

Mech weapon collection honors canonical defensive identities before retaining
its legacy raw-name fallback. M-Pods use that existing shared role and their
raw critical mounts enter defensive BV; they do not enter weapon BV or an
explosion deduction. Pinned 48fcb2f64: BVCalculator.java:522-526,936-946;
EquipmentType.java:448-460; CoreRulesExplosions.java:241-247.
validate-bv-mpod-eligibility.test.ts checks raw/canonical agreement and the
Hachiwara HCA-3T aggregates, retaining every native critical slot in its fixture.

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

Represented Artillery entries are offensive weapons. They enter weapon heat,
fire-control, rear weighting and matching ammo caps rather than flat misc BV.
Pinned MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587: Sniper.java:52-76,
ArtilleryWeapon.java:60; BVCalculator.java:834-836,936-952.
The rear-Sniper contract regression pins weapon BV 218.5 and total 792.

Native B-Pod display-name resolution can select the imported ISBPod identity.
Both that identity and legacy `b-pod` retain the native defensive F_B_POD role.
Pinned MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
ISBPod.java:49-53; BPodWeapon.java:79-80; BVCalculator.java:522-526.

`chassis.ts` owns implicit CASE and Blue Shield chassis identity.
Explicit Mixed Tech `componentTechBases.chassis` takes precedence over legacy names.
Pinned MtfFile.java:867-902; MekBVCalculator.java:514-523 (48fcb2f64).

Construction B-Pods retain their defensive equipment BV without an explosive
deduction. The weapon flag alone does not establish mounted eligibility:
EquipmentType.java:448-460 and CoreRulesExplosions.java:241-247 at pin
48fcb2f64 exclude pods. validate-bv-bpod-eligibility.test.ts enforces the
separate defensive identity and unrelated explosive deductions. M-Pod's
legacy offense assignment and explosion deduction remain a separate coupled
correction so neither half moves compensated totals away from Java.

MASS mounts from the critical grid use the existing resolved canonical identity
and catalog BV in defensive equipment. Each one-slot mount is counted, including
adjacent mounts. No new alias or value is inferred; unresolved identities stay
unresolved. Pinned MegaMek 48fcb2f64 MiscType.java:4942-4956 and
BVCalculator.java:527-543. validate-bv-mass.test.ts checks the shared calculator.

Bridge layers use their resolved catalog BV in defense, once per mounted slot
run, and contribute no offensive miscellaneous BV. The critical scanner passes
their identities to the existing defensive equipment owner. Pinned MegaMek
48fcb2f64: BVCalculator.java:534-536,1004-1006; MiscType.java:7200-7264.

Ram plates add one damage point per torso location with working spikes after
halving maximum charge damage and before the 1.1 BV multiplier. Keep distinct
spike locations in the critical scan; limb spikes and repeated mounts at one
location do not add extra ram damage. Existing defensive spike BV is unchanged.
Pinned MegaMek 48fcb2f64: MiscType.java:1405-1418.

HarJel II/III retain their signed catalog BV (-1/-2) in defensive equipment,
separately from the existing armor bonus. The critical scanner includes one
repair system per location, including the two-slot HarJel III mount; native
construction forbids multiple repair systems at one location. Do not clamp
these values before summing defense or the mech total. Pinned MegaMek 48fcb2f64:
MiscType.java:8981-8992,9014-9025; BVCalculator.java:596-603;
TestMek.java:1505-1515.
