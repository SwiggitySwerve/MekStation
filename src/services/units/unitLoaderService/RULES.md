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
  type. Battle armor and infantry have no store mapper.
- Capital ships (DropShip, JumpShip, WarShip, Space Station) open read-only
  (UL-14). `mapCapitalDefinitionToView` maps the definition to a deep-frozen
  view (`capitalShipView.ts`), kept in memory by tab id; no store is created and
  nothing persists, so a reloaded capital tab asks to be reopened from the
  library. BV comes from the unified dispatcher with its scope: complete
  DropShips show the total; `defensive-only` shows the defensive value with a
  plain "not available yet" note and never as the total.
- BattleMech equipment mapping, normalization and session creation stay unchanged.
  No fallback creates a BattleMech from a different family.
- Custom library entries are BattleMech-only until UL-25a records their family.

## Vehicle definition mapping

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
- Source engine ratings are retained; missing ratings use the vehicle engine and
  suspension owner. Flank MP always uses the movement owner.
- Armor uses named `armor.byLocation` entries and the shared converter-location
  owner; no positional order is inferred. Zero-valued turret entries still
  install turrets. Turret presence and equipment flags use `equipmentMounts.ts`.
- Turrets reuse the existing store action's capacity derivation. Its 10% cap
  contradicts owner ruling 5 and awaits a separate slice. This mapper adds no cap.
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
