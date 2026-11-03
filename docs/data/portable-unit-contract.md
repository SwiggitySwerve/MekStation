# Portable unit document 1.0.0

The normative wire shape is
[`unit-schema.json`](../../public/data/equipment/_schema/unit-schema.json), JSON
Schema draft-07, including its conditional requirements and family alternatives.
`UnitContract` is generated from it by `npm run schema:gen`; readers validate at
that boundary. This document describes the existing shape, including its
permissive non-Mech admission. Validation alone certifies neither construction
legality, equipment availability, combat support nor numerical parity.

## Versions and identity

`schemaVersion` is optional on input; absence means `"1.0.0"` (major 1).
Readers report that through the generated `unitSchemaVersionOf` and never add
the field to a loaded record, so unversioned catalogs keep their on-disk shape.
Explicit versions are strings of three decimal components without leading zeros,
prerelease or build suffixes. Readers accept every `1.MINOR.PATCH` and retain
the declared version; all other majors fail with the found version and supported
major in the diagnostic. Minor versions add optional fields only; patches clarify
compatible behavior; breaking changes require a major increment. Explicit legacy
migration is described below. The generated `CURRENT_UNIT_SCHEMA_VERSION` owns the current
write version, derived from the schema default. Existing editable-family library
serializers write it on save, including when the input had no version.

The separate save-envelope `formatVersion` (`CURRENT_FORMAT_VERSION`), catalog
index `version`, chassis-index numeric version and replay/schema fingerprints
version their own containers or protocols. None substitutes for this field.

Identity is `(family, id)`, never `id` alone. IDs are nonempty, whitespace-free
strings whose punctuation, case and Unicode must be retained. Different families
may share an ID. `family` belongs to the lookup/reference context; canonical
documents may omit it. A family-less **reference** means `battlemechs`, not a
guess from the document. String references use `family:id` for non-Mechs.
Readers check `unitType` against the requested family. Saved library documents
carry non-Mech `family` as a root extension. A custom library ID, source ID,
campaign instance ID and MUL ID are separate identities.

`sourceDefinition`, when present, requires `source` (`canonical` or `custom`)
and `id`; its optional integer `version` identifies a saved source revision.
That nested object rejects unknown fields, so it currently cannot carry family.
Family-aware application references are richer than this wire object; consumers
must retain family separately. `mulId` is an optional integer or digit/hyphen
string; text such as leading zeros must not be normalized.

## Required fields and families

Every document requires `id` and `unitType`. All other fields are optional except
the Mech list below and requirements inside any supplied object. Presence and
zero are distinct from absence; do not invent missing non-Mech facts. The schema
enumerations, aliases and numeric limits are authoritative.

| Family        | Accepted `unitType`                                                                     | Additional root requirements and family fields                                                                                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `battlemechs` | `BattleMech`, `OmniMech`, `IndustrialMech`                                              | Required: `chassis`, `model`, `configuration`, `techBase`, `rulesLevel`, `era`, `year`, `tonnage`, `engine`, `gyro`, `cockpit`, `structure`, `armor`, `heatSinks`, `movement`, `equipment`, `criticalSlots`. Movement requires `walk` and `jump`.       |
| `vehicles`    | `Vehicle`, `VTOL`, `Support Vehicle`, `SupportVehicle`                                  | Optional native `motionType`, movement `cruiseMP`/`flankMP`, `armor.byLocation`, patchwork types/BAR by location, `isTrailer`, tech ratings, fuel and per-turret base-chassis allowances.                                                               |
| `aerospace`   | `Aerospace`, `Conventional Fighter`, `ConventionalFighter`, `Small Craft`, `SmallCraft` | Optional native `subType`, `motionType`, `structuralIntegrity`, `movement.safeThrust`/`maxThrust`, `armor.byArc`, native `typeByArc`, heat sinks, fuel and bombs. FixedWingSupport is a subtype in this family.                                         |
| `capital`     | `DropShip`, `JumpShip`, `WarShip`, `Space Station`                                      | Optional aerospace facts plus `otherCrew`, `driveCoreType`, `jumpRange`, `hasSail`, `hasLFBattery`, `hasHPG`, `gravDecks`, `dockingCollars`, `isModular`; existing capital editor is read-only.                                                         |
| `battlearmor` | `Battle Armor`, `BattleArmor`, `BATTLEARMOR`                                            | Optional `squadSize`, `weightClass`, `chassisType`, `motionType`, `armorPerTrooper`, `armor.perTrooper`, `armor.sourceTechLevel`, manipulators, chassis flags, turret fields, mount qualifiers and ground/jump/UMU/VTOL movement.                       |
| `infantry`    | `Infantry`                                                                              | Optional `platoon` (if supplied, requires `squadSize`, `squadCount`, `totalTroopers`), motive/motion/beast mount, primary/secondary weapons, armor kit/flags/divisors, specializations, augmentations, prosthetics, SRM munition and disposable weapon. |
| `protomechs`  | `ProtoMech`                                                                             | Optional native configuration flags, engine/movement, `armor.byLocation`, equipment and main gun. These native root facts currently use the open extension surface.                                                                                     |

Ordinary tonnage is at most 250 t, Support Vehicle 600 t and capital 2,500,000 t;
zero is schema-valid. Native keys listed above may be permitted extensions rather
than independently constrained fields; do not treat an open key as a validated
domain rule. Use the family adapter for richer runtime admission.

## Fields and units

| Fields                                                                                                                         | Meaning and units                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chassis`, `model`, `variant`, `role`, `source`, `fluff`, `quirks`                                                             | Names, publication text and flavor/quirk metadata, with no physical units. `configuration`, `cockpit`, component `type` and rules tags use the schema's exact strings.                                                                                                                                  |
| `tonnage`; `baseChassisTurretWeight`, `baseChassisTurret2Weight`, `baseChassisSponsonPintleWeight`, `baseChassisFireConWeight` | Metric tons (1 t = 1,000 kg); explicit zero is meaningful. Each turret allowance is independent, not a total Omni pod budget.                                                                                                                                                                           |
| Battle armor `tonnage`                                                                                                         | Existing converter payloads use squad-size nominal tonnage (trooper count); do not reinterpret it as actual squad mass. Construction mass in kg belongs to the BA construction owner and equipment data, not a new portable `kg` field.                                                                 |
| `engine`                                                                                                                       | Requires `type`; optional `rating` is a game rating, not mass or horsepower. Support effective ratings can be fractional. `gyro` and `structure`, if supplied, require `type`.                                                                                                                          |
| `armor`                                                                                                                        | Requires `type` and at least one of `allocation`, `byLocation`, `byArc`, `perTrooper`. Values are nonnegative integer armor points; Mech allocations may be `{front, rear}`. Patchwork type codes and BAR ratings are not points. BAR is 2–10; source type codes may include sentinel −1 where allowed. |
| `heatSinks`                                                                                                                    | Requires `type` and integer `count` (installed sink count, not dissipation capacity). `omniPodHeatSinks` is a count.                                                                                                                                                                                    |
| `movement`                                                                                                                     | Walk/jump/cruise/flank/ground/UMU/VTOL quantities are game MP, not km/h; safe/max thrust are game thrust points. Jump-jet tags and enhancement strings identify equipment effects. Native movement extensions remain open.                                                                              |
| `equipment`                                                                                                                    | Ordered mounts, duplicates retained; each requires `id` and `location`. Optional `name`, zero-based critical `slots`, rear/removable/pod flags and `linkedAmmo` retain placement/link semantics. Equipment identity references another catalog; it is not a unit identity.                              |
| BA equipment qualifiers                                                                                                        | Optional `unitLocation`, detachable/support/AP flags, `shots` (round count) and `size` (native equipment-specific quantity). These fields are forbidden on other families. Do not assign a universal mass unit to `size`.                                                                               |
| `criticalSlots`                                                                                                                | Location-keyed ordered arrays of equipment/system strings or `null`; array positions are critical-slot indices. Preserve topology and rear markers.                                                                                                                                                     |
| `fuel`, `fuelType`, `transporters`                                                                                             | Fuel is tons on support vehicles and native fuel points on aerospace/capital. Transporter strings retain source syntax and type-dependent quantities; no universal seats/tons conversion is implied.                                                                                                    |
| `structuralTechRating`, `engineTechRating`, `armorTechRating`; `internalType`, `clanEngine`, `isOmni`                          | Ratings are integer codes 0–5 (A–F); other values are native codes/flags, not physical units or substitutions for the whole-unit tech base.                                                                                                                                                             |
| Capital native quantities                                                                                                      | Crew/docking collars are counts, `gravDecks` are diameters in meters, `jumpRange` is light-years; SI, drive-core codes and thrust are game quantities.                                                                                                                                                  |
| Infantry quantities                                                                                                            | Platoon and weapon counts are integers; armor damage divisors are positive dimensionless multipliers; flags/specializations are identifiers/bitmasks.                                                                                                                                                   |

BV is a dimensionless Battle Value 2.0 score. `bv` and calculation results are
currently open root extensions, not required or normatively shaped by this unit
schema. The calculation owner distinguishes `calculationScope: "complete"` from
`"defensive-only"`; the latter has no `final` or offensive score. Never display a
defensive subtotal as total BV, or interpret absent BV as zero. Index BV, stored
BV and freshly calculated BV have separate provenance; parsing attests none.

## Technology, years and extensions

`techBase` is exactly `INNER_SPHERE`, `CLAN` or `MIXED`; `rulesLevel` is a separate
complexity classification, not a date or construction-validity result. Installed
component technology can differ from whole-unit technology. `year` is the unit's
introduction year (integer 1000–9999), not every installed item's production date.
`era` is a stored label; application indexes derive era from usable introduction
years through the temporal owner, rather than directory names.

Equipment `introductionYear` is a different catalog fact: pinned Java uses its
prototype introduction date, including approximate-date adjustment, rather than
the production/common date (#2594). See MegaMek `TechAdvancement.java:691–697,731`
at `48fcb2f64a1b3f2d575707ce5653dad64927b587`. Do not infer equipment availability
by replacing that date with production, or rewrite a unit year from equipment.

Root objects and `movement` permit unknown fields. Compatible consumers ignore
unknown optional semantics and preserve opaque values when forwarding documents;
extensions must not override core fields or introduce required behavior under a
minor version. Namespaced extension names are recommended. Closed nested objects
(`engine`, `gyro`, `structure`, `armor`, mount items, `heatSinks`, `fluff`,
`sourceDefinition`, and constrained family objects) reject unknown keys. Minor
extensions must use an open surface; a closed-object change is breaking for
existing readers. Library serializers project known editor state, so opaque
extension preservation across editing is not yet guaranteed.

## Provenance and recorded combat

[`portable-source-provenance.md`](portable-source-provenance.md) defines a separate
source-origin document with immutable repository/commit/path/blob and original
byte hashes. `sourceDefinition` is only an application lookup reference; `source`
is publication text. Neither carries that provenance contract or replaces its
hashes. There is no embedded provenance envelope or recoverable source bundle.

Recorded combat construction has its own strict contract. `schemaVersion` does
not enter it; BattleMech snapshots retain their exact 21 keys and bytes. A saved
unit document and a recorded combat snapshot are distinct serialization surfaces.

## Explicit migration and generated examples

`migratePortableUnitDocument` in `src/utils/serialization/portableUnitDocument.ts`
is the single version-keyed migration owner. Call it explicitly with a string
reference or `{id, family}`; a bare string or omitted reference family means
BattleMech. The reference and document must agree. Existing loader APIs retain
their read behavior; this operation does not silently migrate stored libraries.

Unversioned and `1.0.0` legacy documents normalize to `1.0.0`: older flat armor
plus `armorType`, or root `armorAllocation`, become a nested armor object; native
allocation maps become `byLocation` or `byArc`. Vehicle/aerospace `BAR_N` becomes
`BAR` plus its explicit rating, and legacy root/editor BAR ratings are lifted.
Armor points, explicit zero and live turret configuration remain unchanged.
Only retired turret `currentWeight` and `maxWeight` caches are removed, at root
and inside `vehicleEditor`. Conflicting old/new declarations fail. Migration
copies data and preserves other opaque extensions; it computes no mass or BV.

Compatible newer minor versions retain their version and opaque data on read.
`serializePortableUnitDocument` normalizes and writes the current version from
the generated constant. Other majors and malformed versions fail before migration;
no historical major-zero protocol is invented.

There is one committed [example per family](examples/). Regenerate with
`node --import tsx scripts/generate-portable-unit-examples.ts`; `--check` refuses
drift. The six editable examples pass through their production family serializers;
the read-only capital example uses validated document serialization. Examples
validate and round-trip through the portable boundary. Stable fixture mount IDs
replace transient editor IDs without changing equipment identities.
The opaque `org.mekstation:example` annotation identifies the real catalog JSON
path and its byte hash, not original MTF/BLK provenance. Examples retain source
design identities in their own collection; they are not new catalog entries.

## Independent conformance

`scripts/portable_unit_reader.py` is a second consumer written only from this
document and the JSON Schema; it imports the Python standard library and
`jsonschema`, never application loaders or converters. It reads absent
`schemaVersion` as `1.0.0` without adding the field, checks `unitType` against
the lookup family and `family:id` references, keeps battle armor `tonnage` as an
integer nominal trooper count equal to `squadSize`, and keeps missing, stored,
complete and defensive-only BV distinct. Run `python scripts/portable_unit_reader.py`
to read every committed catalog record and one example per family; its tests in
`scripts/__tests__/test_portable_unit_reader.py` run with `test:conversion:python`.
