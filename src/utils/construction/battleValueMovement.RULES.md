# Mech BV heat and movement inputs

deriveBvHeatAndMovement owns heat capacity and movement inputs for Mech BV.
mechMovement.ts owns running arithmetic for the guarded BV caller and the
movementCalculations.ts facade. Callers retain their own walk adjustments:
BV still applies TSM, shield and chain-drape effects before calculating run.
calculateMechRunMP uses ceil(walk _ 1.5), walk _ 2 with either booster, and
ceil(walk \* 2.5) with both, then subtracts the hardened-armor run penalty.
Pinned MegaMek 48fcb2f64: Entity.java:4015-4016;
MPBoosters.java:79-86; Mek.java:1748-1761,6669-6671.

The facade retains calculateRunMP's nonpositive clamp. Improved jump caps
retain their former unclamped input policy. The legacy enhancement preview
keeps its floor rounding and flat bonus unchanged in this preserving refactor;
it is a separate compatibility policy, not the pinned BV calculation.
Enforcement: mechMovement.test.ts and validate-bv-movement-derived.test.ts
cover booster combinations, post-multiplier hardened armor and caller guards.
The FU-13 PR1 evidence captures every catalog Mech's complete BV result and
movement inputs plus synthetic boundary cases before and after extraction.

partialWingBonus owns the shared tonnage-sensitive jump bonus. Jet callers
retain their existing guards, critical counts and already-included bonus rule.
Enforcement: validate-bv-mechanical-jump.test.ts partial-wing compatibility
cases and representative calculation output equality across the extraction.

parseEquipmentSizeNumber in utils/equipmentSize.ts owns the decimal equipment
size token grammar. The ProtoMek parser retains its trimming and error policy.
BlkProtoEquipmentEntry.test.ts enforces that unchanged public contract.

Mechanical boosters use the first mount's rounded size, never repeated critical
slot counts. BV movement takes max(jets, boosters); only jet movement contributes
jump heat. Partial wings apply to either movement source. Large shields suppress
boosters and medium shields reduce booster MP. The shared Mech calculator consumes
these inputs for both live units and strict comparison.
Pinned MegaMek 48fcb2f64: BVCalculator.java:333-334;
Mek.java:1883-1926,2036-2056; MekBVCalculator.java:338-345.
Enforcement: validate-bv-mechanical-jump.test.ts covers the three affected source
movement profiles, duplicated slots, native decimal sizes, wings, shields and heat.
