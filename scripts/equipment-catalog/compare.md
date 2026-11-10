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
and writes `capital-bv.json`, keyed by catalog ID. This supplement adds missing
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

## Raw sided technology facts (G1; scratch plans only)

`TechnologyAdvancementFacts.java <mekfiles> <scratch-output.json>` enumerates
equipment types once and reads raw `EquipmentType.getTechAdvancement()` values.
Compile/run against the verified pinned runtime, one JVM at a time, with a
timeout wrapper. The mekfiles path configures Java; no unit files are loaded.
The output uses exact native internal names, sorted once per type, and refuses
to overwrite an extraction. Preserve ALL, DATE_NONE (-1), both sides' five raw
advancement dates and approximation flags, static level and faction sets.
Source: pinned `TechAdvancement.java` (`getISAdvancement`, `getClanAdvancement`,
`getISApproximate`, `getClanApproximate` and faction getters), and
`EquipmentType.java` (`getInternalName`, `getTechAdvancement`).

`technology-advancement-provenance.json` binds exact extractor/extraction bytes
to the pin; these are scratch extraction receipts, not published identities.
`technology-advancement-source.json` stays unreleased with no bindings. A future
reviewed manifest names `revision` and nonempty `entries`, each with exact
`file`, stable `index`, `id` and `nativeTechnologyNames`. Physical weapons use
their existing `weapons/physical.json` file. No binary-tech, alias, first-match,
weight or BV inference resolves an identity. The 115 unresolved records remain
incomplete for the later legality consumer; no catalog record is deleted.

Run `node scripts/equipment-catalog/technology-advancement.mjs --plan
<scratch-manifest.json> <verified-extraction.json>` for a read-only summary;
`--check` additionally requires references and sidecar to be current. G1 has no
apply/write mode. The pure planner and renderer prepare additive changes in
memory: catalog reference arrays, one sidecar fact per referenced native type,
and the matching existing baseline item/hash. Every identity, preimage and
rendered output validates before a plan returns. Existing text outside those
fields is retained; equal applications are no-ops. D-batch release, reviewed
identities and a later explicit apply path are required before writing data.

Full `generate.mjs` regeneration checks metadata before its first write. When
native references exist, pass `--technology-facts <verified-extraction.json>`;
missing/changed facts, lost registry records and conflicting bindings fail.
Existing registry references survive; metadata-absent generation and
`--aliases-only` retain their behavior. Tests: `node --test
scripts/equipment-catalog/technology-advancement.test.mjs
scripts/equipment-catalog/generate.test.mjs`.

The shared JSON Schema/generated contracts remain the shape owner. G1 supplies
facts, not getter-view or legality rules. PR B must document EquipmentType versus
raw TechAdvancement view at each call site (the retained 3,745-type discrepancy
remains a regression requirement). Runtime consumers will load the sidecar from
public, never statically import facts; `EquipmentConverters.ts` binary
`parseTechBase` remains unchanged. Bytes/memory are report-only under section 24;
the first fact-shipping PR reports measured package bytes. G1 ships no facts,
catalog changes, baseline changes, runtime consumers or component selectors.
