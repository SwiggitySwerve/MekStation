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
- BattleMech equipment mapping, normalization and session creation stay unchanged.
  Aerospace store hydration and library UI expansion belong to later slices.
  No fallback creates a BattleMech from a different family.
- Custom library entries are BattleMech-only until UL-25a records their family.

## Vehicle definition mapping

- `mapToVehicleState` accepts contract JSON or a loaded vehicle definition.
  `normalizeVehicleConfiguration` validates required vehicle facts and maps them
  deterministically; `createVehicleSession` assigns fresh editor identity and
  copies mutable state. It uses the existing vehicle store, without registering
  the library-open flow or adding equipment and Omni pods.
- Engine identities use the BLK engine owner. Known identities the store cannot
  represent (including NONE and STEAM) throw `UnsupportedVehicleConfigurationError`,
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
  CI gate. Existing handlers and `vehicleValidation.ts` are unchanged.
