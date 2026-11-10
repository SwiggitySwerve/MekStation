# Equipment category and lookup rules

`scripts/equipment-catalog/` adds pinned Java registry identities with the
lowercase kebab-case internal name plus `-registry`. It rejects ID collisions and
preserves every existing catalog item. Java lookup results
decide shared alias ownership. Both registry lookup and BV use the catalog's
existing name-mappings owner. The five approved Q1 reroutes are declared in
`public/data/equipment/registry-routing.json`; other aliases retain their values.
That file also preserves canonical IDs required by existing consumers. Identity
resolution does not establish legality.
`EquipmentFacts.java` discovers prototype weapons through
`WeaponType.F_PROTOTYPE`. Gap-selected prototype entries use their own Java BV
and tech; prototype-only expansion is deferred to a separate reviewed batch.
The generator records variable Java sentinels in `special`; numeric zero is
the catalog's existing variable-value convention, not a calculated mass/BV.
`kgPerShot` and infantry kit `damageDivisor` are intrinsic Java facts; the
ProtoMech and infantry BV stopgap consumers remain until a separate migration.
Ammo compatibility keeps the extractor's platform/technology priority because
some existing BV readers use the first compatible weapon as their pool key.
Represented weapon links use the normalizer owner as well as explicit aliases;
the alias JSON alone omits valid Clan LRM identities.
The extractor orders full launchers before `F_ONE_SHOT` weapons, then exact
technology before `ALL` and other technology. This keeps standard ammo pools
from binding to a one-shot launcher; Java compatibility sets stay unchanged.
`protected-aliases.json` freezes existing resolver results and explicit alias
owner targets; generation preserves them alongside the unchanged alias map.

`EquipmentParsers` owns conversion of catalog category strings to equipment
enums. The miscellaneous parser explicitly maps Heat Sink, Jump Jet, Movement
Enhancement, Defensive, Myomer, Industrial and Miscellaneous. Unrecognized
strings become `MiscEquipmentCategory.UNKNOWN`; inherited object properties
are not category mappings. This preserves the parser's permissive loading
policy without assigning an unrelated category.

`EquipmentLookupService` retains Miscellaneous and Unknown definitions for ID
lookup, category queries and search. This establishes identity, not construction
legality or unit compatibility.

Heat Sink and Jump Jet definitions remain excluded from this lookup because
the BattleMech Structure tab configures them through dedicated equipment
utilities. The underlying loader still exposes them to configuration callers.

`getAllEquipment()` preserves the legacy inventory for validation, the catalog
API, ammunition identity recovery and availability audits. Its Miscellaneous
and Unknown exclusions use record identity, since physical weapons can share
their IDs. Rebuilding the source cache also rebuilds these exclusions.

`getBrowserEquipment(unitType)` owns family picker admission. An explicit list
admits only its members; an empty list admits none. An absent list preserves
legacy membership, including the exclusion of unpinned generic misc. Pinned
Miscellaneous and Unknown records become browser candidates only for their
listed types. The five converters and all lookup mappings, ammunition included,
preserve the distinction between absent and empty. Loader searches keep their
existing absent fallback: BattleMech, Vehicle and Aerospace.

Mech, vehicle, aerospace and battle-armor pickers retain their existing treatment
of unknown applicability. ProtoMech additionally keeps its existing pinned
`isProtoMechCatalogEquipment` policy: ammo is offered, other items need the
ProtoMech list. Explicit empty or excluding ammo lists still reject that ammo.
Infantry uses its separate personal-weapon and field-gun selectors. Picker
policy does not change placement validation or reinterpret an absent list as
illegal. The hook filters caller-local candidates before ammunition matching,
totals and pagination; the shared store keeps the legacy inventory.

`ammunitionCompatibility` owns the fallback for bins without declared compatible
IDs. Launcher display suffixes `(Clan)` and `(ProtoMech)` additionally match the
undecorated bin name only within the same tech base. Existing matches remain;
explicit compatible IDs take precedence, including lists excluding the launcher.
The row component imports this owner's complete six-category weapon predicate.

The official-corpus regression suite in
`__tests__/EquipmentLookupService.categories.test.ts` enforces category
conversion, unknown retention, configuration exclusions and shared-ID browser
preservation. Corpus-wide list and normalization comparisons are lane evidence,
not a permanent CI gate.

Generated Java records have one identity policy in `equipmentBVCatalogData.ts`.
Consumers preserve their prior catalog result, except for the five declared
Java replacements, and may resolve imported records through their exact ids
and Java-owned aliases. Imported records never populate synthesized names or
fuzzy/prefix fallback candidates. This prevents new battle-armor and prototype
records from displacing existing Mech/Clan lookups (the original regression was
`clan-medium-laser` selecting `isbamediumlaser-registry`). The policy covers the
BV normalizer, registry and suggestions, hydration, Compendium, MegaMekLab
conversion, and record sheets. `equipmentCatalogResolution.test.ts` runs the
merged-main resolution snapshot and exact-id/fallback assertions in ordinary Jest CI.
UnitLoader registry recovery also preserves the ammunition/non-ammunition
boundary. Synthetic registry responses in that snapshot guard both category
directions and reject generated entries from recovery candidates.

Native Java lookup corrections are owned by
`utils/construction/equipmentBV/sourceLookupAliases.ts` through
`nativeIdentityId`. Exact catalog IDs remain stable. Proven native names
precede fuzzy aliases and unit-tech preferences across loading, conversion, BV,
hydration and printing. Missing Java identities require catalog generation;
never substitute a related technology or unit-family variant. FU-79's pinned
identity review supplies the corrections and defers unrepresented identities.

Explicitly registered custom name mappings retain precedence over the native
source defaults. Native corrections precede inferred tech and fuzzy fallbacks.

Physical sizing is owned by variableEquipmentFormulas and EquipmentCalculatorService.
Sword and Retractable Blade public helpers delegate there; no loader sizing arithmetic
is copied. Pinned MiscType.java:512-517,1075-1083 (48fcb2f64) uses half-ton
rounding for blade mass and independent integer critical-slot counts. Other legacy
PhysicalWeaponTypes sizing helpers keep their compatibility results until ported.
