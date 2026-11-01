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

## Ammunition catalog context

`resolveAmmoBV` uses the existing normalizer, then selects only records loaded
from `AMMUNITION_CATALOG_FILES` by this package's catalog owner. The source
collection identifies ammunition; category strings such as SRM and Autocannon
do not distinguish bins from weapons. Conversion and insertion reuse the
owner's existing validation and precedence helper. Generic equipment and MTF
lookup retain weapon-first precedence and the existing normalization algorithm.

Twelve local IDs occur in both ammunition and weapon catalogs: Clan LB-X
2/5/10/20, MRM 10/20/30/40, AMS and Clan Streak SRM 2/4/6. Ammo lookup uses
their ammunition BV; generic lookup still uses their weapon BV. Weapon-only
and other non-ammunition entries return resolved=false as ammo. Battle armor
uses this result without a generic fallback; explicit bvOverride is retained.
The returned weaponType keeps its legacy ID-derived form, not a native type/rack
key. Existing aliases can still select the wrong technology or fail to resolve.

`initializeCatalog` accepts explicit ammunition entries as its optional third
argument. They populate the custom ammo context and participate in generic
normalization, with ordinary custom entries winning shared IDs. Omitting that
argument supplies no ammunition, rather than inferring it from categories or
leaking bundled records. Supplying name mappings invalidates their lowercase
cache. Reset clears both catalog contexts and the mapping caches.

The critical-slot validator and full ammo audit retain their separate
pattern-first policies, raw compatibleWeaponIds, overrides and filesystem data
contract. Only their calls to this resolver's fallback observe the new context.
`scripts/debug-bv.ts` has a distinct legacy name-based resolver reading a single
ammunition.json file; it does not call this API and is not parity evidence.
The equipment service and combat hydrator retain their different full-record
and compatibility contracts. No duplicate normalizer or matching table is added.

This is a local identity correction. It does not change source parsing, native
aliases, quantities, Body/None mounts, implicit one-shot bins, grouping, or the
ProtoMech offensive path's generic lookup. Those remain separate obligations;
unchanged source totals receive no new full-BV or ammunition parity credit.

## Native ProtoMek SRM identities

The existing missile-SRM catalog owns distinct `clan-srm-1`, `clan-srm-3`
and `clan-srm-5` entries. The name-mapping owner directs native CLSRM1/3/5,
Clan SRM 1/3/5, Clan SRM-1/3/5 and SRM 1/3/5 to these entries. The BV resolver
and MTF mapper receive these identities through their existing contracts.
Combat receives damage 2/6/10 for native CLSRM1/3/5 names, now asserted directly.
Bare SRM 3/SRM3 still select the old battle-armor record in combat, even though
BV selects the ProtoMek record. No pinned source uses those bare spellings;
that consumer disagreement remains open. No lookup algorithm changed.

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
The generator is a manual check; CI and package scripts do not invoke it.

## Native Clan lasers and light weapons

The existing mapping owner selects the Clan ER Micro Laser, three chemical
lasers, three improved heavy lasers, Light Machine Gun and Light TAG from
their pinned internal, registered lookup and unambiguous display names.
Only actual registry-accepted mappings change; a guessed alias is not proof
of identity. In particular, the large improved heavy laser's internal name
is `CLImprovedHeavyLargeLaser`, while the small and medium internal names
put their size before `Heavy`.

Actual repeated MegaMek 48fcb2f6 registry observations verify represented
type BV, heat, damage, mass, cost, slots, ranges, introduction and static
rules level. The existing laser records gain their native extreme ranges.
ER Micro introduction becomes 3054; the chemical and improved heavy laser
static levels become Standard. Light TAG remains in the electronics owner
with introduction 3046 and Standard level. Its contract does not represent
weapon ranges or damage. These dates/levels do not prove full historical
availability or contextual mount legality.

The machine-gun catalog gains `clan-light-machine-gun`: BV 5, heat 0,
damage 1, mass 0.25, cost 5,000, one Mech critical slot and ranges 2/4/6/8.
Pinned `AmmoType.createCLLightMGAmmo` supplies 200 shots in a one-ton bin;
the weapon record uses that existing ammo-per-ton convention. Native bare
`Light Machine Gun` still denotes the Inner Sphere identity. Existing
Inner Sphere and battle-armor records are preserved, including their known
field gaps. The legacy `light-tag` local ID remains a separate old record;
native Light TAG names now select `clan-light-tag`.

BV and MTF lookup share the mappings. Combat native internal-name lookups
are checked for the eight weapon records; TAG follows the electronics
contract. Data changes affect combat damage, heat and ammunition requirements
even though no runtime arithmetic changed. The existing combat catalog adapter
discards extreme ranges; only the official equipment loader preserves the new
extreme-range fields. The capture retains 15 unresolved combat alias cases
(five spellings in three cases), all unresolved before this change.
Combat alias/range propagation, complete mechanics and production workflows remain separate
proof obligations. The source-derived capture and all 86 ProtoMek records
track numeric effects and preserve source strings, mount provenance,
serialization, costs and existing BLK export/reload results.

No ammunition catalog or matching rule changes here. Captured newly positive
matches use the existing shared owner; they do not prove native quantities,
bin identities or complete ammo BV. The ProtoMek exact-key cap, unresolved
source ammunition and complete source BV remain open.

## Native ProtoMek LRM identities

The missile-LRM catalog owns four distinct `clan-lrm-1/2/3/4` records and
the existing `lrm6/7/8/9/11/12/13/14/16/17/18/19` records. Eight mappings
redirect native CLLRM1-4 and LRM 1-4 display names from battle-armor entries.
Four additional mappings make the local catalog names LRM 1-4 (Clan) resolve
to their own ProtoMek IDs. Java rejects these decorated names; this correction
earns local compatibility credit only. Equipment-service/store tests confirm
battle armor emits plain LRM N with explicit balrm IDs, while ProtoMechs emit
LRM N (Clan) with clan-lrm IDs. Historic external saves remain unverified.
The twelve other IDs remain stable. Existing battle-armor, one-shot, Streak
and ordinary LRM 5/10/15/20 definitions are unchanged, including known gaps.

Repeated pinned MegaMek 48fcb2f6 registry observations and the
[Clan LRM sources](https://github.com/MegaMek/megamek/tree/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/weapons/lrms/clan)
establish zero heat/Mech criticals, cost rack times 10,000, mass rack times
0.2 tons, introduction 3050 and Standard static rules level. Catalog mass
uses decimal tons, without retaining Java binary multiplication artifacts.
Type BVs remain native values. These fields do not prove historical options
or location capacity. Unit-type filtering permits only ProtoMechs.

Native no-minimum and cluster-damage sentinels use minimum zero and
`1/missile`; ranges are 7/14/21/28. Combat and AI receive native CLLRM names
with nominal rack-sized damage and ranges 7/14/21, changing their previous
zero fields. Actual cluster resolution is not certified here. The official
loader retains extreme range 28; the existing combat adapter discards it.
Extreme-range option, airborne and damage policy must be established before
propagating that field. Ammunition-per-ton is not guessed: native ammoType is
LRM, but these records still lack connected quantities and consumption.

The bounded capture contains 224,344 inputs, extending the inherited
224,300 source-derived inputs with current registry names and local IDs.
332 lookups change; 64 native-accepted cases match BV/MTF identity, type BV
and heat, while 268 rejected compatibility/local strings earn no parity
credit. Combat data changes for 288 inputs. The own-name repair changes
12 captured resolutions without changing BV, heat or combat results.
Twenty resolved-name disagreements remain: eight bare LRM 1-4 cases select
battle armor in combat and ProtoMeks for BV/MTF; twelve Clan LRM 1-4 case
variants select ProtoMeks in combat and battle armor for BV/MTF. Another
56 compatibility spellings have combat data but remain unresolved for BV.
These gaps earn no parity credit. The eight bare-name combat results are
unchanged. Editor-created LRM N (Clan) mounts still fail BLK export because
the native parser reads the suffix as a shot count; ordinary Clan LRM 5/10
already share that limitation. Source-file export preservation below does
not cover those editor-created mounts.

All 86 loaded source records, provenance, handler serialization, costs,
existing local BLK export/reload outputs and BVs remain unchanged. Equal BV
alone had concealed the incorrect rack 1-4 identities. Shared ammo-cap,
Mech and vehicle comparisons over 340 names and 289 bins (98,260 combinations)
retain all results: eight positive combinations per consumer before and
after, all ordinary LRM controls. Preserved unresolved zeros earn no native
ammo credit. These are local regression checks; no new Java entity/export
replay, complete equipment/BV or production-flow parity is claimed.

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
