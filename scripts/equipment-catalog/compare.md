# Existing equipment comparison rules

Run `node scripts/equipment-catalog/compare.mjs <registry.json> <facts.json> <megamek-checkout> <output-dir>`. Tests: `node --test scripts/equipment-catalog/compare.test.mjs`.
Use L-EQ3's registry and CAT-Q2's `EquipmentFacts.java` enriched by `SweepFacts.java`, all from verified MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`.
Compile both Java files against the pinned runtime; run `SweepFacts <facts.json> <mm-data/mekfiles>`.
The existing BV alias owner maps items; ambiguous or unmatched items are never compared. Native getters own approximate dates. Variable quantities and getter errors stay separate; missing catalog fields appear as null. Compatibility uses represented IDs and `java:` names for unrepresented weapons.
The tool only writes deterministic reports, with field groups and committed-unit counts per family (units, not mounts). Callers verify input provenance. Corrections require direct source review; schema omissions are not correction candidates.

## Capital additions

`CapitalFacts.java` extracts capital/sub-capital flags, screen class, range-bracket
attack values and native ammo type/rack keys from the same pinned runtime.
It excludes bay containers and includes every ammo variant of those weapon types.
Format `capital-source.json` with oxfmt before recording its source-pins hash.
The existing generator selects these identities without requiring mounted gaps,
and writes `src/utils/construction/equipmentBV/data/capital-bv.json`, keyed by catalog ID. This supplement adds missing
facts while preserving all existing catalog values and ammo compatibility lists.
New selections append after the original selection so frozen row indices remain
stable. BV, heat and shots per ton continue to come from the equipment entries.

For registered records missing converted spellings, `generate.mjs` accepts
`--aliases-only` after its three pinned input paths. It adds Java-owned slugs
without changing prior alias targets, catalog entries or their frozen baseline.
Every target must already exist. This preserves fields added by later generators.

## Vehicle slots

`SweepFacts.java` also writes `tankSlots` and `supportVehicleSlots` (null where
Java computes them from the unit). Run
`node scripts/equipment-catalog/vehicle-slots.mjs <registry.json> <facts.json>`
after `generate.mjs`: it adds `vehicleSlots` to every non-ammo record whose
Java types (same alias owner) agree, and folds exactly that field into
`baseline.json`. Reruns are no-ops. Ammo is counted per distinct type instead.
Tests: `node --test scripts/equipment-catalog/vehicle-slots.test.mjs`.

`capital-alias-inputs.json` is the audited list of eight converted spellings
from the remaining capital inventory. Only those additional slugs are derived;
unrelated one-shot aliases remain outside this change. Existing native aliases
and previously generated gap inputs retain their separate contracts.

## Plain catalog weapon applicability

`allowed-unit-types.mjs <pinned-java-facts.json>` adds only the reviewed
`allowedUnitTypes` arrays in `allowed-unit-types-source.json` and refreshes the
matching frozen baseline rows. Run `EquipmentFacts.java` against the verified
pinned runtime first; the updater verifies the extraction's SHA-256. The
manifest records native identities and inherited flag source lines, and every
retained identity must agree on the complete array. This field is emitted for
Java WeaponType records, including TAG and C3 masters filed as electronics.

The updater rejects stale baseline rows, conflicting existing arrays, unknown
identities and empty arrays before writing anything. Empty arrays remain held
until the loader preserves their meaning. Other values, identities and alias
ownership do not change; two runs must be identical. Format the touched JSON
with oxfmt after updating. Tests: `node --test
scripts/equipment-catalog/allowed-unit-types.test.mjs`.
