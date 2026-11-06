# Pilot SPA identity rules

`src/lib/spa` owns the canonical SPA registry, compatibility aliases and pure
identity queries. Purchase and creation policy belongs to
`src/services/pilots/PilotService.spa.ts`; storage belongs to the pilot repository.
Consumers call this package instead of maintaining alias maps.

- `resolveSPAId` accepts a canonical or registered compatibility id and returns
  its canonical id, or null for unknown input.
- `canonicalizeSPAIds` projects recognized ids into canonical ids, preserving
  ordering and multiplicity. Unknown ids are omitted from the projection only;
  this function never migrates or rewrites stored pilot references.
- `hasSPA` accepts stored ids and a canonical target. It retains the existing
  exact-id fast path (including unknown exact ids), then uses the canonical
  projection for alias membership. Gameplay keeps its old import as a re-export.
- Acquisition metadata, designation and recorded XP remain attached to the
  original stored reference. Identity queries do not change any of those values.
- Unified SPA purchase rejects an existing canonical identity before XP or
  ability writes, including when the saved row uses a compatibility alias.
  Successful purchases still store the canonical id. Existing raw rows and
  unknown saved ids are not migrated. Removal targets the exact stored row id;
  designation lookup already resolves aliases through this owner.

The native identity for Iron Man is one false-default boolean option:
[OptionsConstants.java:209](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/options/OptionsConstants.java#L209)
and [PilotOptions.java:101](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/options/PilotOptions.java#L101).
Native options are keyed by name in
[AbstractOptions.java:232](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/options/AbstractOptions.java#L232).
The existing local `iron-man`, `iron-will` and `iron_will` aliases share that
canonical identity; no native aliases or XP prices are inferred from Java.

These identity helpers do not implement native option values. Native vectors,
integer Edge points and crew-slot aptitude arrays require their own verified
value/persistence contracts. The existing single designation does not establish
vector or slot parity. The separate legacy `SPECIAL_ABILITIES` purchase path
retains its own prices and prerequisites; identity projection does not migrate it.
