# Mech BV heat and movement inputs

deriveBvHeatAndMovement owns heat capacity and movement inputs for Mech BV.
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
