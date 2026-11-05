# Mech BV heat and movement inputs

deriveBvHeatAndMovement owns heat capacity and movement inputs for Mech BV.
partialWingBonus owns the shared tonnage-sensitive jump bonus. Jet callers
retain their existing guards, critical counts and already-included bonus rule.
Enforcement: validate-bv-mechanical-jump.test.ts partial-wing compatibility
cases and representative calculation output equality across the extraction.

parseEquipmentSizeNumber in utils/equipmentSize.ts owns the decimal equipment
size token grammar. The ProtoMek parser retains its trimming and error policy.
BlkProtoEquipmentEntry.test.ts enforces that unchanged public contract.
