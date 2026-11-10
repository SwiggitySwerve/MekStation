# Unit definition loading

FU-101 restores audited crit-only physical mounts. Native groups
consume the shared variable-sizing owner's number of slots per mount and reserve
any groups represented by summary mounts before adding missing instances. Unit
tonnage is loader context; no sizing arithmetic is copied into slot recovery.
Existing summary mounts and ranged/split/rear handling retain their projections.
An empty summary admits these audited classes while retaining its existing skip
of ammunition and heat-sink restoration. Other physical sizing and identity
prerequisites remain deferred to the coordinator's catalog lane.
Pinned MegaMek 48fcb2f64: MtfFile.java:1049-1085,1133-1180;
MiscType.java:508-515,1075-1081 (Hatchet, Lance, Mace sizing).

Native `CLAN_XL` retains its explicit engine technology. Unresolved MTF
critical-slot lookup removes `(OMNIPOD)` before the rear marker, matching
pinned MtfFile.java:1010-1020. Already resolved decorated spellings retain
their catalog IDs, including specialized ammunition bin identities.

Mixed-tech equipment retains its own explicit Clan/IS identity before location
or chassis preferences, including when a saved critical grid uses display names.
The existing `ownTechSide` resolver owns this precedence. Unqualified source IDs
still use critical hints and the same-location other-tech twin join; pure-mode
routing remains unchanged. No serializer or catalog rewrite is required.
Pinned MegaMek 48fcb2f64: `MtfFile.getEquipmentType` passes no tech restriction
to `EquipmentType.get` for a Mixed-tech unit.

Critical-slot joins use both the catalog ID and the ammo/non-ammo category.
Custom mech saves retain category with optional `isAmmo` metadata only when the
existing ID classifier alone would choose a different ammo/non-ammo category;
unambiguous portable records retain their literal shape. For optional metadata,
absent markers remain undefined. The category-qualified catalog lookup selects
the saved mount's own record before sizing. Older placed saves recover category
only from complete, consistent resolved criticals with the same saved ID.
Empty, partial, conflicting or neighbouring placements do not supply category.
An explicit category without a matching record fails with a diagnostic.
Ammunition never inherits launcher heat. Derived metadata is omitted from the
library fingerprint projection; existing edit/draft category tracking and
literal fingerprint bytes remain unchanged.
When registry fallback reaches a shared launcher/ammo ID, getMountedById selects
the token's record through the normalization owner's ammo classification. An
existing resolved definition retains precedence. Claiming launcher cells cannot
consume ammo cells with that ID, and recovery reserves existing ammo mounts.
Pinned MegaMek 48fcb2f64: MtfFile.java:1052-1056,1133-1149.

This module owns validated definition loading and editor-session admission.
`UnitIndex.UNIT_FAMILIES` owns the catalog family names. The definition family
registry owns their accepted contract discriminators and available store mapper.

- Canonical identity is `(family, id)`; omitted family means `battlemechs`.
- `loadUnitDefinition(id)` and `loadUnitDefinition(family, id)` read canonical
  definitions. A third source argument selects custom definitions. The existing
  reader/reference overload remains available for import and validation callers.
- The legacy reader/reference overload validates supplied data without looking
  up a catalog. An omitted family means `battlemechs`; every call checks the
  definition's discriminator against its family.
- Successful definitions retain their family and contract type. Non-mech source
  references include family; BattleMech references retain their existing shape.
- Unknown family, absent catalog, absent unit, source failure, invalid contract,
  and unavailable editor mapper remain distinguishable through stable codes.
- Browser and Node strict canonical reads propagate indexed-file read and JSON
  errors, allowing definition readers to report `read-failed`. Unknown IDs
  remain absent; tolerant reads return null on source failures. Failed reads
  never populate the unit cache, so corrected files can be retried.
- Family/type disagreement fails validation. Loading a definition does not
  initialize equipment or create store state. Only registered store mappers may
  create an editor session; other families return `unsupported-store-family`.
- Editor loading routes by the family's registered store: BattleMechs to
  `state`; vehicles (`mapToVehicleState`) and aerospace fighters and small craft
  (`mapAerospaceDefinitionToState`) to `familyState`. The library-open flow
  registers `familyState` in its own store and opens a tab of the state's unit
  type. ProtoMechs and battle armor use `smallUnitDefinitionMapper` and their
  existing stores and shells. Infantry uses the same registered-store route.
- Capital ships (DropShip, JumpShip, WarShip, Space Station) open read-only
  (UL-14). `mapCapitalDefinitionToView` maps the definition to a deep-frozen
  view (`capitalShipView.ts`), kept in memory by tab id; no editor store is
  created. Custom definitions may persist under a new identity at version 1,
  while view sessions do not persist: a reloaded capital tab asks to be reopened
  from the library. Custom views retain a copied, frozen source reference for
  Preview, print and PDF; canonical view output is unchanged. BV comes from the
  unified dispatcher with its scope: complete
  DropShips show the total; `defensive-only` shows the defensive value with a
  plain "not available yet" note and never as the total.
- Capital saved details offer Open read-only through the same family-aware
  loader as the library dialog. `mapCustomUnitIndexEntry` owns their shared
  index-to-load-entry projection, preserving family, identity and version.
  The family registry owns capital read-only classification. `UnitRepository`
  owns the write-access check used by updates and `VersionRepository.revert`;
  capital writes fail before changing data, versions or timestamps. Initial
  creation, deletion and JSON backup remain available. Editor save/overwrite,
  saved-history actions and native/vault design exports remain unavailable.
- BattleMech equipment mapping, normalization and session creation stay unchanged.
  No fallback creates a BattleMech from a different family.
- Saved vehicle designs carry family `vehicles` in their persisted JSON and
  library index. A saved design without family means BattleMech; requesting a
  different family fails validation. Force/roster references require UL-24's
  separate persistence and resolver changes.
- CustomUnitSerializer owns vehicle store serialization into UnitContract.
  The vehicle mapper validates its vehicleEditor extension for editor-only
  construction/mount facts. Session IDs, timestamps and dirty flags renew;
  construction values and linked-mount relationships survive JSON save/reopen.
  Vehicle saves clear the submitted draft's dirty flag only when no newer edit
  arrived. Vehicle saved-history receipts remain unavailable in this slice.

## Vehicle definition mapping

- Aerospace fighter, conventional fighter, FixedWingSupport and small-craft saves
  use CustomUnitSerializer and family `aerospace`. The mapper validates the
  aerospaceEditor extension for exact construction, crew, bay and mount facts.
  Session IDs, timestamps and dirty flags renew; mount IDs renew with links
  retargeted by index. Capital ships stay read-only; aerospace saved history
  receipts remain unavailable. Newer edits remain dirty after an in-flight save.

- `mapToVehicleState` accepts contract JSON or a loaded vehicle definition.
  `normalizeVehicleConfiguration` validates required vehicle facts and maps them
  deterministically; `createVehicleSession` assigns fresh editor identity and
  copies mutable state. It uses the existing vehicle store, and the library-open
  flow routes vehicles to it (UL-13). The vehicle mapper hydrates every source
  mount using the shared equipment resolver and location/mount owners.
- Engine identities use the BLK engine owner. Unsupported identities throw
  `UnsupportedVehicleConfigurationError`,
  a subtype of `UnsupportedUnitConfigurationError`, with code
  `unsupported-configuration`, field and value. Unsupported motion and armor
  identities also fail explicitly. Invalid/missing facts remain parse errors.
  The error message is plain sentence-case copy shown to users, such as "The
  vehicle editor cannot open vehicles with heavy industrial armor yet."; it never
  names contract fields.
- Ferro-Lamellor and Ballistic-Reinforced armor use MegaMek points per ton
  (16 x 0.875 and 16 x 0.75, `ArmorType.java`). Small craft `HULL` equipment
  maps to the internal fuselage (`SmallCraft.java:75-78`).
- Source engine ratings are retained; missing ratings use the vehicle engine and
  suspension owner. Flank MP always uses the movement owner.
- Armor uses named `armor.byLocation` entries and the shared converter-location
  owner; no positional order is inferred. Zero-valued turret entries still
  install turrets. Turret presence and equipment flags use `equipmentMounts.ts`.
- A missing support-vehicle source BAR rating maps to `null`, preserving the BV
  owner's native zero default instead of the new-editor BAR 7. Explicit source
  ratings and saved `vehicleEditor.barRating` overrides remain authoritative.
  MegaMek 48fcb2f64: SupportTank.java:63,79; BLKFile.java:484-529;
  BVCalculator.java:430-434. `vehicleSourceBV.test.ts` enforces source-to-sheet
  totals, save/reopen preservation and the separate new-editor default.
- Turrets reuse the existing store action. There is no turret capacity cap
  (owner ruling 5; removed in #2479), and this mapper adds none.
- Focused `vehicleMapping.test.ts` fixtures enforce this mapping and error
  contract. Full pinned-corpus comparison is external acceptance evidence, not a
  CI gate. `vehicleValidation.ts` is unchanged.

- Equipment normalization preserves order and repeated mounts; session creation
  gives mounts independent editor IDs. Resolved items use catalog IDs/names;
  unresolved items retain source IDs/names and a typed `resolutionWarning`.
- Rear, turret, sponson, chin, pintle and Omni pod flags come from the shared
  mount owner or explicit contract flags. Vehicle Omni identity is independent
  of individual pod flags. Base-chassis Omni mechanism allowances are not yet
  represented in this store; pod hydration does not infer those allowances.
- `vehicleEquipmentMapping.test.ts` enforces equipment hydration, unresolved
  visibility, all vehicle layouts and independent sessions.
- Ammunition tokens use the normalization owner's exact catalog identity and
  select only ammunition definitions. Missing variants never fall through to
  weapon lookup, registry aliases or another technology's ammo. Resolver tests
  enforce this even when ammunition and a weapon share a canonical ID.

## Small-unit library sessions

- ProtoMech armor, base movement, chassis, main-gun topology and every mount
  populate the existing store. Structure, engine rating, run MP and booster
  interpretation use their current owners. BODY mounts retain their original
  block in `blkSource` while occupying the store torso location.
  The store derives weight class from its construction owner; it has no Assault
  class; the catalog's original weight-class label remains in librarySource.
- Battle armor retains squad size, class-limit trooper mass, manipulators,
  motion, typed/numeric armor, mount options and every mount. Native source
  names and qualifiers feed the existing equipment/BV owner; suit location is
  separate from squad/point/trooper location. Catalog tonnage is trooper count.
- Editor limits: neither editor exposes era, role, source, fluff or quirks. ProtoMechs
  lack interface-cockpit and armor-tech declarations; the main-gun weapon list
  is represented by its mounts. BA lacks chassis tech, exoskeleton/HarJel,
  armor-tech declarations, abilities, turret capacity/modularity and distinct
  magnetic-claw selection. Original claw identities remain in equipment.
  BA VTOL MP has no separate store field; source jump MP is retained.
- The BV shown is the existing app owner's result, not a new parity verdict.
  ProtoMech and battle-armor library saves use CustomUnitSerializer with an
  explicit family. Infantry uses the same serializer and saved-family routing.
  Callers use the serializer facade; its adjacent smallUnits module implements
  the small-unit encoding without changing that public boundary.
- Both small-unit stores persist the full validated definition as librarySource.
  Saves retain every original fact there, including source tech, cockpit, abilities,
  turret declarations, raw mounts and provenance. A validated smallUnitEditor
  extension carries exact editor fields; session and mount IDs renew on reopening,
  and ammunition links renew with their targets. Cached BV is recomputed.
- Contract projections update edited facts while retaining unchanged source
  spellings and nested source-only fields. Saved history remains unavailable for
  these stores; family-less legacy saves still select BattleMechs.

## Infantry library sessions

- Infantry saves retain the complete original definition in librarySource and
  exact editor fields in the validated smallUnitEditor extension. Reopening
  restores composition, movement overrides, field-gun editor data, kit selections
  and flags without reconstructing unrepresentable native declarations. Original
  masks, kit/custom armor, explicit/effective flags, prosthetic slots/counts,
  movement source, ordered mounts and ammunition remain unchanged in librarySource.
- Contract projection updates edited composition and weapon facts; unchanged
  source spellings and source-only fields remain authoritative. Session metadata
  renews and BV is recomputed. Saved history remains unavailable.

- Infantry opens in its existing store and shell. Composition and weapon counts
  remain source values (secondary count is per squad); no setter clamps them.
  The catalog's absent transport tonnage remains the existing zero placeholder.
- `libraryMapping` projects identity, weapons, composition, movement and incoming
  protection. The existing infantry owners resolve native movement, kit flags,
  augmentations, masks and prosthetic effects. Source damageDivisor is already
  effective and is passed once to the BV owner. Source MP includes UMU.
- `librarySource` retains the full validated definition through store persistence:
  exact kit/custom protection, explicit/effective flags, source motive/beast,
  specialization mask (including zero), augmentations/prosthetic counts, every
  ordered mount/location, SRM tags, identity metadata and fluff. These original
  facts are provenance; they are not rewritten when editor fields change.
- Editor limits: the active enums cannot express exact source kits, beast/SCUBA
  motives, specialization combinations or prosthetic records. Raw facts remain
  available in librarySource; the shell shows effective protection/movement/BV.
  Only approved field guns with a resolved equipment identity populate the gun
  editor. Other guns/artillery and all explicit ammo remain in the original
  ordered source mounts. Ammo rounds are not inferred; projected guns start at
  zero rounds. The separate field-gun/BV lane owns expanded support and parity.
- Legacy infantry stores retain their previous BV path. Library states feed the
  current source-aware infantry BV owner; no calculator rules are changed here.

Armored source critical lookup removes the outer `(ARMORED)` marker before the OmniPod and rear markers, as MtfFile.java:952-956,1010-1020 do. Identity qualifiers such as `(OS)` stay part of the name. Established raw decorated identities and explicit assignments keep precedence. This lookup step does not model armored component mass or BV.

Primitive Industrial cockpit tags retain their own definition through both
loader paths and custom save/reload. CockpitType owns the native identity,
five-ton mass and 2295 introduction date (MegaMek 48fcb2f64
TestMek.java:238-242; Mek.java:3785-3793). Standard and Industrial cockpits are
not substitutes; source unit catalog data already preserves the distinct tag.

`CockpitType.getCockpitSystemSlots` owns cockpit head and auxiliary system positions, and cockpit slot counts must match it. Slot validation receives the selected cockpit, so small and torso-mounted cockpits never inherit standard head occupancy. The four canon exceptions and intro-year behaviour are unchanged.

A weapon of eight or more critical slots (WeaponType.java:2619-2621) whose own location holds only part of its source slots continues into one adjacent location: its inner location, or a location whose inner location is its own (MtfFile.java:1086-1124, Mek.java:489-496). The second part is `splitSlots`. Assignment counts and overlap checks include both parts (TestMek.java:462-477), and the free-slot query and slot usage treat the second part as occupied. Superheavy two-per-slot packing and splittable misc equipment are not modelled here.

Critical lookup also removes a trailing Mek turret marker `(T)` after the OmniPod marker and before the rear marker (MtfFile.java:1014-1021). As in Java, `(T)` is only removed when it is the outermost remaining suffix. Turret mounting itself is not modelled here.

Flail and Wrecking Ball use the shared formula owner for fixed mass and slots
(MiscType.java:4017-4021,7869-7878, pin 48fcb2f64).

Native `claw` keeps its catalog identity and is classified as physical at the
equipment lookup boundary (MiscType.java:3982-3992). It shares one sizing formula
with legacy `claws`: ceil(T/15) mass and nominal criticals, ceil(T\*200) cost
(688-689,1000-1001,1259-1260; pin 48fcb2f64). Public physical sizing helpers use
that owner. Crit-only Claws reuse ordinary physical recovery and the shared
superheavy consumed-entry conversion; existing mounts are reserved first.
The critical-slot join treats native `claw` and legacy `claws` as that same Java
type, while retaining the already mounted ID and its exact-ID sizing override.
The shared recovery branch passes the recovered item's actual ammo category to
the slot join. LAM bomb bays are miscellaneous mounts (MiscType.java:12413-12420),
so they must retain the non-ammo side of that join.

Talons sizing is one ceil(T/15) mass with four biped or eight quad criticals
(MiscType.java:688-689,1256-1258,4314; pin 48fcb2f64). Recovery must preserve one
spreadable mount across every native leg location, without charging mass per leg.
Mounted slot parts belong to slotOperations/parts; physical slot helpers delegate
to EquipmentCalculatorService. The optional isQuad sizing context defaults to false.

Spreadable Talons retain one mounted identity and mass, with extra locations in
spreadSlots. The shared mounted-parts owner feeds validation, free-slot queries and
custom saves. Reloading reconstructs those locations from the saved native grid;
already represented Talons are sized in place rather than duplicated.

Mounted critical-part traversal is owned by slotOperations/parts. Placement
re-exports its public helper; spreadable recovery must reuse that owner.

Commercial armor retains its native identity through both loaders and custom
saves. ArmorType owns its 24 points/t, zero slots and 2285 introduction date
(MegaMek 48fcb2f64 ArmorType.java:669-688); BlkArmorCodes owns code 10
(EquipmentType.java:95). Do not replace Commercial with Standard or lower
Standard introduction dates to accommodate industrial source units.

Non-mech Mixed identity is projected after components and saved binary editor
fields. The shared TechBaseConfiguration chassis accessor owns the family fact:
BA uses clanChassis, other families use componentTechBases.chassis. A known
chassis sets the binary editor side; an absent fact remains unknown. Serializers
apply typed Mixed mode and chassis after composing source declarations, so stale
librarySource snapshots cannot override typed infantry identity or resurrect an
unknown chassis. Pure units and legacy drafts retain absent metadata and their
literal save projections. This preserves BLKFile.setTechLevel's independent
Mixed designation and chassis side (MegaMek 48fcb2f64); Mixed editing and native
BLK export headers remain deferred.

Declared OmniMeks derive a represented mount's pod metadata from its owned native
critical cells, using `parseCriticalSlotToken` as the one token-decoding owner.
The marker is a suffix after removing outer armored and size metadata, before
turret/rear qualifiers (MegaMek 48fcb2f64 MtfFile.java:949-956,1005-1028).
Ordinary and spreadable mounts retain their creation token; split weapons use
the last visited critical, in native reverse-location/ascending-cell order
(:545-548,1054-1066,1086-1128). Explicit saved booleans, including false, win.
Missing source evidence is fixed; category or Omni identity alone never makes
an item pod-mounted. Mount discovery, aliases and placement remain unchanged.

This general recovery requires explicit `isOmni: true`. Absent/false declarations
retain the existing loader output, including legacy physical pod flags. This
preserves committed-catalog load/save/fingerprint bytes until the separately
owned Omni declarations land. TestEntity.java:1861-1882 validates pod flags on
non-Omnis; loading is not permission to rewrite an invalid source flag.
EquipmentType.isOmniFixedOnly (EquipmentType.java:630-635) is an eligibility
constraint checked separately, not a replacement for the source flag.
MegaMekLab 62bf193 UnitUtil.java:650-686 also checks fixed-only equipment and
fixed heat-sink quotas for newly authored pod mounts. No eligibility or
base-chassis heat-sink arithmetic is copied into this loading boundary.

## Equipment source-side markers

The loader admits a source item's own explicit tech side only when critical
slots are absent or the unit mode is Mixed:
`locationCriticalSlots === undefined || unitTechBaseMode === TechBaseMode.MIXED`.
Keep this #3211 admission condition unchanged. Recognized bracketed markers
retain their side before unit-mode variant fallback; Mixed slot hints retain
their existing matching and category guards. IS CASE II is 1.0 t and Clan
CASE II is 0.5 t (pinned MiscType.java:4809-4815,4839-4845 at 48fcb2f64).

Conversion's `normalizeNameWithTechBase` owns lexical facts used for fuzzy keys;
its named `TECH_PREFIX_PATTERN` also belongs to the normalization patterns.
Its historical lexical result for `Claws` is the key `aws` and Clan prefix
facts. The loader's `ownTechSide` instead requires stripping a marker to
normalize to the same catalog base, as well as the admission condition above.
It must not reinterpret the unprefixed catalog identity `claws` as `aws`.
These are different guarded decisions: sharing the conversion decision would
bypass the loader's catalog/context guards, while sharing the loader decision
would change existing fuzzy keys. Both public behaviors have regression tests.

Named residual `C5-CASE-II-CLAN-LITERAL`: the literal `CASE II [Clan]`
still resolves to `case ii [clan]` with no equipment definition in slotless
IS, Clan and Mixed modes. The base `f377ea995` census found this literal in
0 of 9,815 converted corpus paths and 0 of 9,828 public unit JSON files
(including index/metadata files). Its C5 residual entry and census receipts are
in the parity-3.2-y acceptance packet and the Clan CASE II PR-2 evidence.
This fix does not add a candidate fallback or alias for that unresolved input.

The bracket-suffix branch also checks the selected definition's actual tech
side through the existing variant selector. An unprefixed catalog ID does not
prove that the record is IS. For example, `Active Probe [IS]` must keep the
STANDARD `clan-active-probe` record: unprefixed `active-probe` is also Clan
but has UNOFFICIAL catalog metadata, while pinned `CLActiveProbe` is
Clan/STANDARD (MiscType.java:5803-5838, 48fcb2f64). Likewise both Light Active
Probe records are Clan (5848-5884). A mismatched actual side declines the suffix
and retains the existing fallback; it introduces no alias or candidate fallback.
