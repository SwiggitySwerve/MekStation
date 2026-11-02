# Unit definition loading

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
  view (`capitalShipView.ts`), kept in memory by tab id; no store is created and
  nothing persists, so a reloaded capital tab asks to be reopened from the
  library. BV comes from the unified dispatcher with its scope: complete
  DropShips show the total; `defensive-only` shows the defensive value with a
  plain "not available yet" note and never as the total.
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
  explicit family. Infantry saving remains gated for the next slice.
- Both small-unit stores persist the full validated definition as librarySource.
  Saves retain every original fact there, including source tech, cockpit, abilities,
  turret declarations, raw mounts and provenance. A validated smallUnitEditor
  extension carries exact editor fields; session and mount IDs renew on reopening,
  and ammunition links renew with their targets. Cached BV is recomputed.
- Contract projections update edited facts while retaining unchanged source
  spellings and nested source-only fields. Saved history remains unavailable for
  these stores; family-less legacy saves still select BattleMechs.

## Infantry library sessions

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
