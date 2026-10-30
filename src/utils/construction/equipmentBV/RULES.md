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

Pinned MegaMek 48fcb2f6 EquipmentType.get and the Clan weapon classes provide
the independent identity and type-BV reference. Fourteen LB-X, Streak, Gauss,
Ultra AC and Rotary AC internal names and their case variants are tested.
CLRotaryAC2 and CLRotaryAC5 now select clan-rac-2 (BV 161) and clan-rac-5
(BV 345); MTF and other shared consumers receive those corrected identities.

The expanded capture combines pinned MTF/BLK lines, local all-family unit JSON
strings, name mappings, punctuation/case variants and retained pattern probes.
It contains 224,300 inputs, of which 67 change: 38 are accepted by the native
registry and match identity and type BV; 29 native-rejected compatibility spellings
receive no native-parity credit. The other 224,233 are unchanged. The source
extraction admits nonempty trimmed strings up to 80 characters; these counts
describe that input set, not every possible name or a complete equipment census.
The earlier 19,374-input capture was narrower and omitted the Rotary AC names.

The conversion name resolver retains its separate input contract and TS fallback
catalog. MTF mapping, the unit loader and simulation hydration delegate to this
normalizer, so their output changes for the corrected CL-prefixed spellings
even though their own code is unchanged. Browser and persistence effects remain
unproven. Existing explicit name-map collisions, missing catalog types,
effective ammunition, mount locations and full source parity remain open.
Unresolved lookup returns resolved=false even though its numeric fields are
zero; those zeroes must not be counted as native numerical agreement.

## Ammunition matching boundary

`../battleValueAmmo.ts` owns ammunition compatibility aliases, matching and
excessive-ammunition caps. The resolver only selects catalog identities.
The ammunition audit imports that owner's matcher; it no longer retains its
older alias table and matching algorithm. Audit matches intentionally now
include the owner's existing aliases and Clan-prefix fallback.

Matching retains exact keys (including zero), then the first exact alias,
then the original family's positive technology-stripped sum. If none matches,
the same fallback tries each existing alias in order and returns its positive
sum once. Numbered torpedo fallback, bin/weapon aggregation and the cap remain
unchanged. Thus ordinary LB 2-X/5-X vehicle bins retain 6/12 BV with corrected
Clan weapons worth 47/93. Different rack sizes remain distinct.

Pinned MegaMek `BVCalculator.java` at 48fcb2f6 keys excessive ammunition by
ammo type and rack size for both ammunition and weapons. This bounded local
compatibility repair does not establish full native ammunition parity: the
existing exact-match precedence on mixed-tech weapons is retained, and native
ammo quantity, all equipment identities and full BV remain open.
