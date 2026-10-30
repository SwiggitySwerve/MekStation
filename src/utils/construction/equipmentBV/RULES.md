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

## Native ProtoMek SRM identities

The existing missile-SRM catalog owns distinct `clan-srm-1`, `clan-srm-3`
and `clan-srm-5` entries. The name-mapping owner directs native CLSRM1/3/5,
Clan SRM 1/3/5, Clan SRM-1/3/5 and SRM 1/3/5 to these entries. The resolver,
MTF mapper and other shared consumers receive these identities through their
existing contracts; no additional lookup algorithm is introduced.

Pinned MegaMek [CLSRM1.java](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/weapons/srms/clan/CLSRM1.java),
[CLSRM3.java](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/weapons/srms/clan/CLSRM3.java)
and [CLSRM5.java](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/weapons/srms/clan/CLSRM5.java)
define type BV 15/30/47, heat zero, weight 0.25/0.75/1.25 tons, cost
10,000/30,000/50,000 C-bills and zero Mech critical slots. Actual pinned Java
registry observations verify those values, ranges, introduction and tech rules.
The inherited no-minimum sentinel becomes catalog minimum zero; cluster damage
becomes the existing `2/missile` representation. Zero critical slots does not
establish ProtoMek location-slot legality. The official loader's unit filter
admits these entries only for ProtoMechs. A resolver lookup is not a legality check.

The existing `basrm1/3/5` records, one-shot entries and ammunition are unchanged.
In particular, preserving legacy `basrm3` BV 21 does not prove battle-armor parity.
Native ProtoMek SRM 3 now contributes 30 instead of that unrelated value.

The current-main capture extends the earlier source-derived input set to
224,336 strings. Exactly 60 lookups change: 30 accepted by the pinned native
registry match identity, type BV and heat; 30 rejected strings receive no native
parity credit, including compatibility aliases and local canonical IDs.
These are bounded capture counts, not an exhaustive native-name census.
All 86 loaded source records, serialization and costs stay unchanged. Three
source BVs change: Delphyne 2 (256 to 288), Orc 3 (154 to 167) and Orc 4 (124 to
137). Only weapon, offensive and final/base BV terms change; ammo remains as
before. Shared-cap, Mech and vehicle probes over 63 names and 289 catalog bins
show no ammo-BV change: all these combinations still produce zero. The missing
odd-rack ammunition connection remains open. Preserving these zero results
earns no native ammo parity credit.

Contextual loader lookup, exact mount semantics, full equipment/ammunition,
complete source BV and production import/save/browser workflows remain open.

After adding catalog records, run `node scripts/sync-equipment-index.mjs --write`
and `--check` to regenerate and verify category counts. The existing weapon
total counts ranged entries; physical weapons remain separately counted by the
combat catalog contract. The generator preserves file paths and provenance.
This recount also corrects the pre-existing miscellaneous total from 321 to
322; its records are unchanged.

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
