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
  Vehicle and aerospace store hydration and library UI expansion belong to later
  slices. No fallback creates a BattleMech from a different family.
- Custom library entries are BattleMech-only until UL-25a records their family.
