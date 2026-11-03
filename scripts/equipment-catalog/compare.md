# Existing equipment comparison rules

Run `node scripts/equipment-catalog/compare.mjs <registry.json> <facts.json> <megamek-checkout> <output-dir>`.
Use L-EQ3's registry and CAT-Q2's `EquipmentFacts.java` enriched by `SweepFacts.java`, all from verified MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`.
Compile both Java files against the pinned runtime; run `SweepFacts <facts.json> <mm-data/mekfiles>`.
The existing BV alias owner maps items; ambiguous or unmatched items are never compared. Native getters own approximate dates. Variable quantities stay separate; missing catalog fields appear as null. Compatibility uses represented IDs and `java:` names for unrepresented weapons.
The tool only writes deterministic reports, with field groups and committed-unit counts per family (units, not mounts). Callers verify input provenance. Corrections require direct source review; schema omissions are not correction candidates.
Tests: `node --test scripts/equipment-catalog/compare.test.mjs`.
