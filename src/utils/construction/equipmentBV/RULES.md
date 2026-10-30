# Equipment BV catalog resolution

This package owns the compatibility lookup from an equipment string to the
bundled BV catalog. Public callers use equipmentBVResolver.ts. Catalog data,
explicit name mappings, normalization and BV-context heat adjustments keep
their existing modules. This lookup is not an exact native mount decoder.

Canonical IDs, direct aliases and explicit name mappings take precedence over
patterns. When a CL-prefixed string reaches a normalization pattern, the same
Clan-prefix selector used for compact names first checks the corresponding
Clan catalog ID. If no such entry exists, the prior fallback remains. This
prevents CLLBXAC2 and CLStreakSRM2/4/6 from becoming Inner Sphere weapons merely
because the generic pattern appears first. No new alias table is introduced.

Pinned MegaMek 48fcb2f6 EquipmentType.get and the Clan LB-X/Streak weapon classes
provide the independent identity and type-BV reference. The twelve LB-X, Streak, Gauss
and Ultra AC internal names and their case variants are covered explicitly.
The retained capture changes 43 spellings: all 32 native-accepted changes match
registry identity and type BV; 11 compatibility spellings are rejected by Java.
The other 19,331 captured lookups are unchanged. Native-rejected fuzzy
spellings receive no native-identity credit.

The conversion name resolver and MTF name mapper retain their separate input
contracts and TS fallback catalogs; they are not changed or claimed native-exact
by this correction. Existing explicit name-map collisions, missing catalog
types, effective ammunition, mount locations and full source parity remain
open. Unresolved lookup returns resolved=false even though its numeric fields
are zero; those zeroes must not be counted as native numerical agreement.
