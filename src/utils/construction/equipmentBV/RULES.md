# Equipment BV catalog resolution

The equipment-BV owner supplies the Artemis IV/V launcher multipliers (1.2/1.3)
to Mech, vehicle and large-craft callers, preserving each caller's modifier
ordering. `getLargeAerospaceAmmoEntry` alone accepts the native IS LRM/SRM
Artemis-capability suffix as the represented standard bin. It delegates identity
lookup to `getAmmunitionEntry`; general ammo resolution remains unchanged.
Pinned `AmmoType.java` Artemis mutators preserve bin BV and shots. Missing Clan,
MML and capital ammo records remain unresolved; no technology fallback is added.

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

## Converted vehicle and aerospace identities

`normalization.ts` owns normalization for the BV resolver, conversion adapter,
unit loader and simulation hydration. Extend its alias/pattern tables rather
than adding lookup rules in callers. Lookup is case insensitive, including
MegaMek internal names. A terminal `:omni`, converted `(ST)` suffix (`st`) or
converted `(R)` prefix (`r-`) describes the mount, not its item. Direct catalog
IDs retain precedence. See pinned `BLKFile.java` mount parsing.

`catalogLoader.ts` keeps ammunition separate when an input identifies ammo or
pods. Catalog IDs are not globally unique: `mrm-20`, `clan-streak-srm-6` and
`clan-lb-10-x-ac` identify both weapons and ammo in their respective files.
`resolveAmmoBV` always uses the ammunition namespace; generic resolution uses
the original input to select it. A bare overlapping ID retains weapon priority.
Consumers must retain ammunition context when storing such identities.

Ammunition patterns preserve rack size, tech base and munition variant. Do not
strip Artemis/Narc, prototype or other variant markers to force a match. Clan
LRM/SRM and Ultra ammunition cannot use IS entries: their BV can differ. Only
explicit shared identities (such as Gauss ammunition) cross tech prefixes.
An absent catalog item stays unresolved with zero BV; the catalog owner must
add its actual data. A prototype laser must not become a production laser.

Source: pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`EquipmentType.java` (`get`, `setInternalName`, `addLookupName`) and
`AmmoType.java` factory identities. The focused `equipmentConverterIds` tests
enforce aliases, mount suffixes, namespace collisions and missing variants.
These rules do not change ammo quantities, offensive caps or BV formulas.

Canonical critical-slot names such as `IS Ammo MG - Full` keep their explicit
packaging identity. Normalize whitespace around existing separators before
joining words; otherwise that source spelling produces three hyphens and
misses the full bin. Native IS/Clan MG full and half names resolve to the
represented full/half records with 200/100 rounds. Generic MG aliases must not
replace those explicit bins. Engine launch and canonical loader tests enforce
the real Warhammer inventory and its retained 70-ton construction.

## Converted mount qualifiers

Native bay prefixes `(B)` and converted `b-` are mount grouping metadata,
like rear prefixes. Preserve an exact catalog identity before stripping them.
BA location suffixes `:Body`, `:LA`, `:RA`, `:TU` and mount markers `:APM`,
`:DWP`, `:SSWM` likewise do not change EquipmentType identity. A terminal
`:Shots<nonnegative integer>#` describes ammunition quantity; ProtoMech ammo
may instead end in ` (<nonnegative integer>)`, and capital ammo in `:<quantity>`.
Parse these without applying
quantity to catalog BV or mass. Malformed quantities remain unresolved.

Sources at MegaMek `48fcb2f64`: `BLKDropShipFile.java:289-302`,
`BLKBattleArmorFile.java:215-236`, `BLKFile.java:280-287`, and
`BLKProtoMekFile.java:198-214`. `equipmentBVResolver.sourceAliases` enforces
the qualifiers, exact variant selection, and absent-variant guards.
The exact Vehicle Flamer catalog identity is `vehicle-flamer` (BV 5,
0.5 tons); see `ISVehicleFlamer.java:59-65`. Migrating the legacy converted
alias and unresolved native names requires BV-consumer reconciliation first:
the pinned corpus exposed 15 lost exact totals during that migration.
Preserve represented aliases before sponson suffix stripping as well; an
infantry `myomer,-vest` alias must retain its terminal `st`.

For compatibility lookup, terminal `:SIZE:<nonnegative decimal>` and `:OMNI`
segments describe a mount, not its EquipmentType name. Remove the terminal
chain before lookup, preserving an exact catalog ID first. Check the base ID
before stripping converted sponson `st`; otherwise a real `hoist` becomes
`hoi`. This lookup supplies identity only: it does not apply size to mass,
slots, cost or ammunition quantities. Those mount values remain outside this
resolver's contract. Malformed sizes and missing base types stay unresolved.

The existing alias owner covers the pinned MiscType/EquipmentTypeLookup names
HeavyBridgeLayer, Hitch, PintleTurret, SponsonTurret and Tank Sprayer, plus
converted `mek-taser`. Native `CLAPGaussRifle Ammo` and its converted slug
share the registered `apgaussrifle` ammunition identity, including counted
ProtoMech bins. Both spellings live in the alias table; quantity parsing does
not define another identity rule. Focused qualifier tests enforce the shared
identity, and the pinned corpus comparison checks Mech BV regression.

## One-shot BV heat

`weaponHeat.ts` owns one-shot identity projection and heat /4. The shared
resolver applies it once, before Ultra/Rotary/Streak heat adjustments, using
the resolved item identity/name and the retained source one-shot spelling.
Mech weapon construction consumes that resolved heat; its script fallback
boundary uses the same owner. The legacy Mech missile BV /5 guard remains a
separate compatibility policy, as do its existing fallback table heat facts.
Raw catalog firing heat and weapon BV do not change.
Source: MegaMek 48fcb2f64, HeatTrackingBVCalculator.java:170-180,203-209;
WeaponMounted.java:231-234 reads WeaponType.F_ONE_SHOT (WeaponType.java:577).
`equipmentBVResolver.oneShotHeat.test.ts` pins RL10/15/20, I-OS, combined
Streak heat, Mech single application and Ahab/Avar native totals.

Tech-qualified Mech candidate lookups retain the original source identity at
the resolver boundary, so a source I-OS flag survives a different Clan catalog
spelling. Crossbow T's SRM2/6 I-OS regressions enforce this retained fact.

`weaponLinks.ts` owns the represented LRM/SRM/MML Artemis compatibility and
first-unlinked/same-physical-location assignment for aircraft and large craft.
Links follow source order; rear flags and list adjacency do not select the
launcher (MekFileParser.java:425-449). The existing multiplier owner supplies
1.2/1.3 before arc weighting and heat sorting (BVCalculator.java:860-872).
Mech's older critical-grid/location heuristic is retained as a separate input
projection; vehicles already consume explicit links. No catalog flags added.

The BV heat override also accepts native `Ultra Autocannon` display names,
including the imported IS Ultra AC/5 prototype. Its catalog firing heat stays
1; BV uses 2 and still applies one-shot heat reduction first. Pinned MegaMek
48fcb2f64a1b3f2d575707ce5653dad64927b587: ISUAC5Prototype.java:62-71,
UACWeapon.java:65; HeatTrackingBVCalculator.java:170-180.

getWeaponLinkBVMultiplier owns IV/V/Apollo factors; getArtemisBVMultiplier
preserves the existing IV/V API as a wrapper. Ordinary aircraft link Apollo to
one MRM at the same physical location in source order, before direction and
heat sorting. Unmatched controllers do not alter weapons or ammo.
Source: MegaMek 48fcb2f64, MekFileParser.java:499-528 and BVCalculator.java:860-876.
aerospaceBV.apollo.test.ts enforces native Oni, location/source-order matching,
incompatible launchers, Omni aliases, dominance and heat-sort order.

PPC capacitors share weaponLinks.ts compatibility/year gating with aircraft
explosive penalties. Links choose the first unlinked eligible PPC at the same
physical location. Native linked additions depend on PPC type, not the generic
catalog capacitor value (MiscType.java:1322-1347). Clan ER PPCs require 3101
(MekFileParser.java:90-93,471-497). Ordinary aircraft apply that addition after
rear weighting, before TC and heat sorting; linked PPCs gain five heat
(BVCalculator.java:853-882; HeatTrackingBVCalculator.java:211-214, pin 48fcb2f64).
Unlinked capacitors contribute no offense. Legacy Mech/vehicle projections
retain their distinct unintegrated-capacitor contract in getOffensiveBVRole.
Enforcement: aerospaceBV.ppcCapacitors.test.ts and the all-family corpus proof.

B-Pods remain weapons when their native display name or converted alias
contains plural `Pods`. Ammunition names (including Narc/iNarc pods) keep the
ammo namespace. Existing aliases and native name mappings resolve identity.
Pinned MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
ISBPod.java:49-53; BPodWeapon.java:79-80; BVCalculator.java:522-526.

Explicit direct aliases may select an existing registry ID at the BV boundary;
this does not enable fuzzy matching over registry names. The canonical C3
sensor launcher alias uses the imported BV-30 MissileWeapon, not C3 Master.
Obsolete Mek fallback copies are removed. ISC3RemoteSensorLauncher.java:69-80
at MegaMek pin 48fcb2f64; the imported catalog remains the value owner.
