# Unit source import

`importBLKDefinition` admits `protomechs`, `vehicles`, `aerospace`, `battlearmor` and `infantry` through the existing BLK
parser, family handlers and shared definition validator. Vehicles dispatch to the
combat-vehicle, VTOL or support handler using the parser's discriminator, including
LargeSupportTank and SupportVTOL. Aerospace uses the fighter, conventional-fighter,
small-craft and dedicated FixedWingSupport handlers; the support handler's public
`canHandle` contract selects that subtype, including sources in the vehicle folder.
Aerospace armor retains the handler's arcs in `armor.byArc`, and movement retains
safe/max thrust. Heat sinks retain their count and use the native BV adapter's
shared `resolveBlkAerospaceHeatSinkType` mapping for the contract identity.
Full native facts and construction diagnostics remain in `blkSource`.
Battle armor uses `BattleArmorUnitHandler` and the shared
`projectBattleArmorDefinition` projection also consumed by custom editor saves.
Its contract tonnage is the nominal trooper count, with armor retained both as
`armorPerTrooper` and `armor.perTrooper`. Squad size, class, chassis, movement,
manipulators, mount flags and ordered equipment retain the current handler facts;
original native qualifiers and entity locations remain in the source snapshots.
Projection does not decode additional native mount effects or replace handler
movement/manipulator interpretation with converter semantics.
Infantry uses `InfantryUnitHandler` and `projectInfantryDefinition`, extracted
from the infantry editor-save branch without changing its output. Platoon
composition, primary/secondary weapon declarations and per-squad secondary counts
use that shared projection. `mapInfantryDefinition` remains the existing reverse
projection into editor state. Native motive declarations, augmentations,
specialization masks and effective protection flags remain available alongside
the handler's normalized facts. Infantry has no general handler equipment array;
the importer uses the existing line-list parser on retained raw tags to project
ordered equipment under `TROOPERS` and `FIELD_GUNS` contract locations, including
repeated guns, ammunition and armor kits.
It does not call the unimplemented handler deserializer or infer new native
movement, specialization or anti-Mek rules from the legacy editor enums.
Other BLK families are explicitly unsupported until their serial slices land.
Capital remains unsupported in this slice; its eventual import will be read-only
under owner ruling O2.

Capital custom records have a read-only lifecycle under O2 and the capital
owner ruling: creation assigns a new identity at version 1, and subsequent
construction updates, overwrites and history reverts are rejected by the shared
repository write-access boundary. Both update and revert APIs return 403 with
`READ_ONLY`. The check covers the persisted type, saved definition and proposed
or reverted definition, so changing or clearing discriminators cannot bypass it.
Initial creation/import and library deletion remain available. This lifecycle
does not yet admit capital BLK sources.

Saved capital records reopen in the existing frozen viewer without an editor
store. Preview resolves the custom source reference, preserving print and PDF.
The existing JSON backup download remains available as a read operation. Native
MTF/BLK and vault design exports remain unavailable; this adds no capital
construction save or editing workflow.

Construction-invalid but structurally representable
records remain loadable; handler diagnostics are retained, not used as a new gate.
No handler serializer is called. `blkSource` retains exact text, the full parsed
document, the complete handler unit and diagnostics. The definition projects
armor, movement and ordered equipment into the shared shape; native syntax,
original mount IDs/blocks and source-only fields remain in the snapshot.
`src/types/formats/blk-armor-codes.json` owns native armor-code-to-contract tags
for Python conversion and vehicle/aerospace BLK import, including BAR. Battle armor
reuses the existing `battleArmorContractArmorType` compatibility mapping. The editor-specific
encoder/decoder retains its existing supported subset and compatibility aliases.
ProtoMech import retains its existing `PROTO_ARMOR_CODES` admission subset.
Shared schema defaults do not certify native mount effects. Blank native model names
remain blank. This API does not promise new editor admission or native parity;
capital admission remains open.

`importMTFDefinition` owns MTF source-to-definition orchestration. It calls the
existing MTF parser and `loadUnitDefinition` admission contract; it owns no native
parsing, construction, equipment, legality or BV rule. Structural admission does
not establish construction validity. No new construction-validity gate applies.

`POST /api/units/import` accepts `{ sourceFormat: 'mtf' | 'blk', sourceText: string }`
alongside existing raw JSON and versioned JSON envelopes. Failed parsing and
unsupported contract fields return client diagnostics, retaining parser warnings.
The mounted unit-library import entry reaches this API through `useUnitImport`
and `CustomUnitApiService.importUnit`; source parsing remains owned by the API.
Accepted definitions retain source text and parser metadata through repository
persistence; the repository allocates a distinct custom identity. Existing name
conflicts return 409 without overwriting saved units.

The API does not authenticate caller-declared provenance as a pinned source.
The source text is provenance of this import, not proof of upstream equivalence.
`importMTF.test.ts` verifies pinned original bytes separately and exercises real
SQLite persistence and shared definition reload. It does not establish complete
MTF semantic or numerical parity. `importBLK.test.ts` verifies eight pinned
original-byte vehicle fixtures and eight aerospace sources through real SQLite,
the saved-unit API/client and shared definition reload, including pinned invalid
designs with retained construction diagnostics. Aerospace covers fighters,
conventional fighters, aerodyne/spheroid small craft and small/large FixedWingSupport.
Eight original-byte battle armor sources cover IS/Clan, squad sizes 1/3/4/5/6,
all five weight classes, biped/quad, jump/ground/UMU/VTOL, manipulators and AP
mounts. The Water Elemental Mining Suit remains loadable with its armor-date
diagnostic. A separately labelled **synthetic** modular-mount source supplements
these fixtures: none of the 1,188 pinned sources encodes a modular mount in its
equipment blocks. This synthetic case makes no claim of pinned modular coverage.
Capital admission remains separate work.

Fourteen original-byte infantry fixtures cover Clan/IS, foot, jump, motorized,
tracked, wheeled, hover, native Microcopter, Motorized SCUBA and Submarine,
primary/secondary weapons, field guns/artillery, anti-Mek equipment, paratroops,
marines, armor kits and augmentations. Every fixture persists through real SQLite
and reloads through the saved-unit API/client and shared loader, retaining exact
source snapshots and platoon composition. The Clan Mechanized Tracked Point
(Laser) remains loadable with its `Maximum squad count is 4` diagnostic. This
proves import/persistence preservation, not full native semantics or BV parity.

The legacy `IMTFImporter` runtime-object interface and `MTFImportService` are
retired under owner ruling O2. Their exports, singleton factories and
`services.conversion.importer` registry entry are removed. No live caller used
the service or its JSON helpers. MTF source import uses `importMTFDefinition`
through `POST /api/units/import`; retirement changes no saved format or native
import rule.
