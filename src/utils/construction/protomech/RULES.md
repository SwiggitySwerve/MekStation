# ProtoMech construction rules

This package owns ProtoMech construction calculations. Consumers use its public
barrel. The engine-rating rule below is verified independently; other existing
rules in this package do not acquire that verification by sharing an owner.

## Weapon BV diagnostic projection

`calculateProtoOffensive` retains optional `weaponMountBV` facts beside the
existing weapon addition. Each fact snapshots the already-admitted resolved
value, local equipment index/id and supplied public input location. The
misc-first exclusion, classifier/resolver guards, mounted order, full main-gun
value, exact-key ammo policy and every arithmetic operation remain unchanged.
No second resolver call, quantity expansion, rounding or modifier is introduced.
An unarmed input has no optional list; legacy breakdowns remain accepted.

`protoMechBVTerms` formats those values at known native locations. Pinned
MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`BVCalculator.java:702-727,803` owns the inherited weapon pass and per-mount
valuation; `ProtoMekBVCalculator.java:40-63` has no weapon-pass override.
`ProtoMek.java:87-89` supplies HD/T/RA/LA/L/MG abbreviations. Unknown and
quad-only input locations remain unprojected with their original facts retained.
Native Body is not represented by the public BV input; the trace never infers
it from source syntax or changes the handler's existing location policy.

`weapon.<localEquipmentIndex>.<locationAbbreviation>.<equipmentId>` keys do
not assert native equipment indices or identities. The existing comparator
compares each location's count and descending per-mount values. Source mounts
and their order remain intact. Absent, unresolved, defensive, ammo, miscellaneous
and zero-valued non-weapon equipment do not create weapon facts or synthetic
zeros. Ammo and miscellaneous term omissions remain separate. This projection
does not establish complete construction validity, weight or equipment parity.

## Native offensive-misc diagnostic projection

The existing `resolveProtoOffensiveEquipmentBV` owner supplies quad melee,
magnetic-clamp and electric-discharge values. Its already-computed finite
positive results are retained in optional `offensiveEquipmentMountBV` facts
beside the original addition. Zero/fallback, nonfinite and negative values do
not create diagnostic facts; their original arithmetic is unchanged. No second
resolution, identity table, formula, quantity expansion or modifier is added.
Other offensive-kind equipment and zero-valued movement/defensive miscellany
remain outside this projection. Missing facts remain absent.

The neutral `IProtoMechBVMountValue` owns the shared four-field snapshot shape;
the existing public weapon type remains an identical alias. The trace uses
its single location-format map for both weapon abbreviations and native
location numbers (`ProtoMek.java:87-89,102-108`, pin `48fcb2f64`). Unknown,
quad-only and unrepresented Body locations remain unprojected with facts
retained. Neither equipment admission nor handler location policy changes.

The existing native trace hook in `java_bv_terms.py` records
`equipment.native.<locationNumber>.<internalName>` from
`BVCalculator.offensiveEquipmentBV` (`BVCalculator.java:978-1042`). Its number
is a location, never an equipment index. Local facts retain actual source ids
and local indices independently; the thirteen represented native source keys
use their actual ids at Torso2. Repeated location/id keys retain last-put
semantics and original fact order, rather than inventing an arithmetic sum.
Weapon projections, ammo policy, scalar values, modifiers and totals remain
unchanged. Other miscellaneous/ammo omissions, native equipment order and
complete construction validity/weight remain separate.

## Positive native ammo availability diagnostics

The existing native ammo resolver owns registry identity, kg-per-shot valuation
and the equipment-id shot count (`ProtoMekBVCalculator.java:50-52` and
`AmmoType.java:17103-17105`, pin `48fcb2f64`). Its positive finite result and
existing registry native group supply optional
`ammoAvailableMountBV` facts. The indexed ammo worklist retains actual mount
references/order without changing admission, resolution, quantities or caps.
No extra resolver call, parser, formula or identity table is introduced.

`protoMechBVTerms` uses the existing `addBVToAmmoCapGroup` owner to add actual
bin values in order, then transports `ammo.available.<nativeGroup>` terms.
The facts never feed arithmetic inputs or alter the Proto exact-key cap policy.
All old weapon/misc facts, scalar values, modifiers and totals remain intact.
Missing, nonpositive, nonfinite, unresolved, generic fallback or unsupported
public-group facts remain absent; no zero or launcher-derived bin is invented.
The resolver transports its already-resolved registry group independently of
weapon matching. An unmatched real bin therefore retains availability even
when its arithmetic weaponType remains the enum-form fallback such as `SRM:2`;
no launcher or cap is invented.

The optional readonly `ammoCapBVByGroup` map transports the existing public
`calculateAmmoBVPools(weaponsForAmmo, []).cap` values. Only its cap output is
used; its total and matching policy never replace ProtoMech's exact-key
calculation. The owner receives already-admitted weapon values without a
second value resolution. Retain only finite positive caps whose native group
has a real positive native bin. Unmatched bins retain availability without a
cap; launcher-only, excluded-bin and legacy inputs invent neither cap nor zero.
The trace formats `ammo.cap.<nativeGroup>` directly from the optional map,
without arithmetic or identity inference. Shared-group weapon accumulation
belongs to the existing public pool owner; repeated bins do not repeat caps.
Pinned `BVCalculator.java:1212-1238` at `48fcb2f64` owns the native raw weapon
cap pass. This diagnostic does not establish general native admission policy.

The represented 79 positive bins on 61 pinned sources supply 71 availability
and 71 raw-cap terms through these public owners. This scope does not establish
general effective-quantity/admission rules, defensive ammo or complete ammo,
construction, validity, weight or settings parity. Native equipment indices and
the separately deferred Sprite 3 order remain outside this projection.

## Offensive BV movement

At MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`battleValue/ProtoMekBVCalculator.java` inherits `BVCalculator`'s offensive
speed factor and movement assembly. Its effective MP is Run plus rounded half
the greater of Jump and UMU; the nearby upstream comment saying Walk is stale.
The local ProtoMek contract has no UMU field, so its existing helper now takes
explicit Run and Jump, using the shared movement owner with UMU zero. Negative
Jump contributes zero, consistent with that owner and Java's component rule.

The BV consumer uses `unit.runMP`, never reconstructs it from Walk or a booster
flag, and never changes movement. Source handlers and store projections retain
their existing movement ownership. New stores and BV-affecting edits compute
the corrected factor. Existing saved movement and cached BV are not migrated;
an explicit recompute or a BV-affecting mutation refreshes the saved breakdown.

This verifies only the offensive movement factor on matching movement inputs.
Equipment pools, damage/options, UMU/mechanical jump equipment, complete BV and production
editor/save workflows remain open. Nonfinite/fractional/out-of-range movement
is not admitted as Java integer component parity by these comparisons.

## Defensive BV movement

Pinned `ProtoMekBVCalculator` adds one to Glider running TMM before taking
the maximum with jumping/UMU TMM, including Run zero. It adds 0.1 to the
inherited defensive factor for every ProtoMek. The factor therefore follows
`(1 + max(running TMM, jumping TMM) / 10) + 0.1`, retaining Java's operation
order. The current ProtoMek contract has UMU zero. Positive Jump includes
the standard jump bonus; Jump zero contributes zero.

`protoMechBVDefensive.ts` applies these ProtoMek rules through the shared
construction movement selector, then multiplies the existing defensive pool.
It uses explicit Run, Jump and chassis without reconstructing movement. Store
defaults, BV-affecting edits and explicit recomputation consume this result.
Hydration and identity edits preserve cached BV and saved movement; no saved
state migration is introduced.

The separately verified threshold consolidation preserves construction,
vehicle and gameplay behavior, including their different fractional/nonfinite
contracts. Component parity covers nonnegative integer movement, undamaged
default construction and the standard TMM table. The 86 native sources and
synthetic loaded entities use matched native movement inputs. MaxTech options,
negative/fractional/nonfinite movement, full equipment pools, complete BV and
production browser flows remain unverified.

## BV weight, chassis and skill adjustments

Pinned `ProtoMekBVCalculator` inherits the empty `BVCalculator.processWeight`,
`processTypeModifier` and `processOffensiveTypeModifier` methods. There is no
tonnage-only offensive term or generic Glider/Ultraheavy final multiplier.
`physicalWeaponBV` remains exactly 0; `getProtoChassisMultiplier` and the
breakdown's `chassisMultiplier` remain 1 for API compatibility. Chassis effects
in structure, armor and defensive movement retain their own owners.

`BVCalculator.bvMultiplier` fixes ProtoMek Piloting at 5. The existing shared
skill table owns its values; this calculator supplies Gunnery (default 4) and
fixed Piloting 5. The optional Piloting argument stays accepted but has no
effect. The sum of defense and offense is rounded before applying the skill
factor, then the final value is rounded. Point BV sums those final values.

Saved cached breakdowns and movement remain untouched during hydration and
identity edits. Existing recomputation and BV-affecting actions use these
rules; this is not a save migration. The scoped evidence calls actual Java
weight/type/summary/skill methods and compares simple unarmed loaded entities,
including the zero-BV native booster. All 86 source fields, exports and
unrelated components are preserved; their complete equipment-based BV remains
unproven. This does not cover drones, force bonuses, implants, damage/options,
full equipment resolution or production editor/save/browser workflows.

## Explosive-equipment BV

Pinned MegaMek `BVCalculator.processExplosiveEquipment` is empty and
`ProtoMekBVCalculator` does not override it. The local compatibility breakdown
field `explosivePenalty` is therefore exactly zero, independent of equipment
names, count, chassis or movement. Generic Mech critical-slot penalties do not
apply here. The former ProtoMech-only hint list had no other consumers and is
removed; no catalog or other-family rule changes.

New calculations and existing recomputation actions use the native stage.
Saved cached breakdowns remain intact during hydration and identity edits.
Actual Java stages on all 86 sources verify this penalty and the resulting
defensive subtotal; source fields, equipment, exports, other BV components and
cost remain unchanged. Full equipment identity, ammunition amounts, weapon
pools, whole-unit BV and production editor/save/browser workflows remain open.

## Engine rating

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`megamek/src/megamek/common/verifier/TestProtoMek.java:548-562`.

1. Take the ceiling of base walk MP multiplied by 1.5.
2. Subtract 2 for Quad or Glider.
3. Multiply by tonnage and truncate toward zero.
4. Above rating 40 only, round upward to a multiple of 5.

Biped and the existing Ultraheavy enum use the unadjusted factor. A myomer
booster does not change base engine rating. Zero-speed Quad/Glider inputs can
produce a negative raw rating; construction legality is a separate concern.

The store's direct-rating action uses an exact inverse of the forward function.
It retains a matching current nonnegative integer speed, otherwise selects the
greatest matching nonnegative safe integer speed. It rejects nonfinite or
unsafe integer ratings, nonpositive/nonfinite tonnage, and unrepresentable
ratings before changing state. This ambiguity policy belongs to MekStation;
MegaMekLab's pinned `PMStructureTab.java` exposes forward edits, not this setter.
Walk and cruise aliases agree after rating, chassis, tonnage or movement edits.

The separate MP/tonnage caps, default speed choices, weight classes, equipment
and complete BV rules remain
unverified against the pinned runtime. Existing saves are not migrated. The
native handler preserves chassis, motion, armor order and main-gun presence;
its source projection does not establish a production editor import path.
This correction does not establish full source, persistence or numerical parity.

## Undamaged running movement

`computeRunMP` owns derived running from base Walk and explicit enabled booster
state. Pinned MegaMek Entity.java:4004-4016 uses ceiling(Walk times 1.5);
ProtoMek.java:612-627 uses twice Walk when its operable booster is enabled.
Walk itself stays unchanged. Default state, all six movement-affecting setters,
handler/store projections use this owner. Movement controls display stored
flank, matching the status bar and BV, including preserved legacy saves. Base
engine rating remains independent. Existing clamps and default choices are retained.

The separately verified consolidation preserved both former +1 and cruise-floor
policies before this correction removed them. The historical BV fixture's +1
run value remains explicit test data. Generic vehicle rules have another owner.
Saved flank is preserved until a movement-affecting edit; a missing legacy
flank value is derived. No save migration is introduced. Existing BV consumes
the corrected Run for defensive TMM, but complete BV is not verified here.

This contract covers undamaged nonnegative integer movement with explicit
booster context. Damage/options, jump/cap rules, weight classes and equipment
legality are separate. The BLK source adapter derives the undamaged booster
flag from exact equipment identities; its contract is documented in
`src/services/conversion/BLK_PROTOMEK_EQUIPMENT.md`. Source-loaded effects do
not establish equipment mass, cost, damage or legality.
Production import/editor/persistence workflows remain unverified.

## Armor limits and allocation

`armor.ts` owns total and location limits from pinned `TestProtoMek.java:675-740`.
The total table uses truncated, clamped tonnage; Head uses truncated tonnage
and integer division. Arms use original weight thresholds and are absent on
Quad. Torso and Legs use twice original internal points; present Main Gun uses
three times its original points. Explicit manual structure is respected.
Total is independent of location sums. Unusable tonnage or original structure
produces a domain diagnostic. Extreme signed-integer overflow parity is excluded.

The utility's omitted topology means Biped without Main Gun. The diagram and
store supply current topology and original points. Source validation retains
all armor and reports excessive or unusable points as construction errors.
Opening saved state or unrelated edits never redistributes armor.

Explicit allocation fills the lesser of total capacity and summed location
capacity, proportionally to each cap, with leftover points in enum order.
This deterministic maximum-budget choice is MekStation policy, not proof of
MegaMekLab's partial-budget allocator. BV refreshes through the existing store
action. The prior consolidation preserved all three former policies before
this numerical correction. Full BV, equipment, production import/save/reload,
diagram topology and real editor flows remain unverified.

## Normal-engine mass

`computeProtoEngineWeight` owns the loaded-unit and canonical-projection mass.
Pinned `Engine.java:396-450` uses rating times0.025 below40; ratings40-500 use
the existing standard-fusion table at the next multiple of5. `RoundWeight`
rounds to the nearest gram before rounding upward to a kilogram. Rating0 is
exactly0. Negative, fractional, nonfinite or greater-than500 ratings return
null; `getProtoEngineWeightError` supplies the construction diagnostic. This
preserves invalid-but-loadable source ratings without inventing a numeric mass.
It deliberately does not emulate Java's invalid-engine reset or table overrun.

The separate refactor preserved the former raw and half-ton policies before
this correction removed them. No duplicate engine table remains. Canonical
projections calculate from current rating, ignoring any stale stored mass;
no migration or new persisted store field is introduced. BV does not consume
engine mass and its numerical results remain unchanged. This does not prove
total-unit mass, cost, other engine types, production editor or persistence.
The BV fixture's historical rating default is test data, not the rating rule.

## Internal structure

`computeProtoStructure` owns original internal points for loaded units, new
stores, structural edits and record-sheet bindings. Source: pinned MegaMek
`ProtoMek.java:785-826`. Lookup and torso use truncated tonnage; main-gun points
use the original weight (>9 means 2, otherwise 1). Biped/Glider/Ultraheavy
share the head/arm and leg table; Quad has no arms and a distinct leg table.
The source table's default rows are retained for positive out-of-range weights;
calculation is separate from construction validity. Nonfinite/nonpositive
tonnage or values above signed 32-bit range fail at the owner boundary.
`getProtoStructureTonnageError` owns that admission rule. The BLK handler uses
its diagnostic for all spellings before calculation, preserving a structured
parse failure; direct calculations still throw. Unrelated errors are not caught.

Local fixed records use 0 for absent Quad arms and absent Main Gun. The explicit
chassis and mount flags carry topology. The Java comparator checks absence
separately before normalizing `ARMOR_NA` (-1); it never treats -1 as a numeric
match to 0. The existing standard-structure BV term receives the corrected
points through its ordinary consumers. This does not certify complete BV.

Tonnage, chassis and mount edits restore calculated points. Manual location
edits and existing saved structure remain intact until a structural edit;
there is no save migration. Registry duplication copies the stored structure
record independently, including manual values, before calculating its BV.
Printing data now carries Quad and optional
main-gun presence, including empty mounts; omitted legacy mount presence uses
the weapon-name fallback. This is a data/binding contract, not proof of the
production editor-to-print flow, sheet assets or all source equipment.

## Absent main-gun contents

`getProtoMainGunTopologyError` owns the requirement that Main Gun equipment or
nonzero armor needs a mount. BLK source loading retains inconsistent equipment
with a warning; export fails with no content. This prevents the pinned
`BLKProtoMekFile` location loop from silently dropping source contents when
five armor entries make `ProtoMek.locations()` exclude Main Gun. It does not
remove equipment from the editor or certify general equipment/legality parity.

## Equipment projection

`equipmentProjection.ts` owns the shared mounted-equipment field projection
into the BV contract. Both the source handler and store call it. Their location
adapters remain separate to preserve existing malformed-input behavior: the
handler uses an enum switch, while the store retains its legacy object lookup.
Native Body locations and exact equipment identities are not established by
this preserving extraction. New source fields must extend the shared projection.
The optional `blkSource` extension now carries the original parsed block and
entry syntax through both projections. Its single schema is owned by the BLK
format types and populated by the shared conversion decoder. It does not
replace current equipment IDs, locations or effective ammunition state; BV
and costs continue using their existing inputs until those rules are verified.

## Native offensive BV equipment

`protoMechBVEquipment.ts` owns native miscellaneous offensive BV. Pinned
MegaMek `48fcb2f6` `MiscType.java:1367-1369` assigns Quad melee
`2.5 * ceil(0.2 * tonnage)`, before the offensive speed factor. There is no
final Quad chassis multiplier. Clamps and electric-discharge armor use their
catalog BV in this equipment pool, outside weapon BV and ammo caps
(`BVCalculator.java:978-1042`). Their incorrect/missing catalog values remain
catalog defects, without code overrides. Electric-discharge equipment does
not change the armor-point coefficient. Fusillade uses ordinary weapon BV
once per launcher; its two built-in shots add no separate ammo term
(`CLFussilade.java:58-81`). Source fixtures verify all 12 residuals with the
missing catalog facts supplied at the resolver boundary; this does not claim
that the shipped catalog has those facts.

## Main Gun and arm placement

`mainGun.ts` owns the slot and weight limits of the Main Gun and the arms, the
slot classification of a mount and the weapon-legality test, from pinned
MegaMek `48fcb2f64` `TestProtoMek.java`: `maxSlotsByLocation` (606-629),
`maxWeightByLocation` (651-678), `requiresSlot` (572-585) and
`hasIllegalEquipmentCombinations` (296-380). Ultraheavy is above 9 t (line 65).
An arm holds one mount of at most 0.5 t (1.0 t ultraheavy), a quad has none, and
the Main Gun holds one slot-taking mount (two on a quad that is also
ultraheavy) of any weight. Ammunition, MASC, UMU, jump jets and the EI interface
take no slot. An enabled Main Gun may be empty.

The hand-written approved-weapon list, the "heavy weapon" arm class and the
"a weapon must be assigned" finding are removed: none exists upstream.

Weapon legality (`F_PROTO_WEAPON`) comes from the catalog's `allowedUnitTypes`,
which only the Java-derived `-registry` entries carry. A weapon is rejected only
when the catalog describes it and omits `ProtoMech`. Most plain entries that
canonical units resolve to carry no list, so an absent list is unknown, not
illegal; 127 canonical weapon mounts depend on this. Catalog weights of
variable-weight miscellany (magnetic clamp, partial wing) and ProtoMech quad
melee are unknown and add no weight. The catalog also lists the mech weights of
the Clan LRM-10 and LRM-15 (2.5 and 3.5 t) where Java mounts them at 2.0 and
3.0 t; this matters only in the unlimited Main Gun.

The torso is not enforced: it needs the armor's slot (Electric Discharge) and
the variable weights above.

`__tests__/fixtures/main-gun-java-verdicts.json` holds the pinned verifier's
verdict, limits and mounts for the 86 canonical ProtoMechs (mm-data `50f7efe`),
produced by `__tests__/fixtures/ProtoMekPlacementProbe.java` against the pinned
MegaMek build (jar and probe SHA-256 in the fixture's `meta`). To regenerate,
compile the probe against that jar and its runtime classpath, then run it with
a units directory that holds `UnitVerifierOptions.xml` and the BLK files.

## Auto armor allocation

`allocateProtoArmor` in `armor.ts` is MegaMekLab's Auto allocation, ported from
`PMStructureTab.java` at megameklab `62bf193` (`autoAllocateArmor`,
`allocateLeftoverPoints`, `addArmorPoint`). Each location first takes its limit
times (points / total cap), truncated and never more than remain; locations are
walked Head, Torso, **Right** Arm, Left Arm, Legs, Main Gun
(`ProtoMek.java:102-108`, `firstArmorIndex()` is `LOC_HEAD`). Leftover points go
one at a time to the torso, legs, head, then both arms, then the head again for a
main gun; a Quad starts with the legs and has no arm step. A point aimed at a full
location is dropped, so edited structure that shrinks the limits leaves points
unplaced, exactly as upstream does. A point count above the cap is clamped.

MegaMekLab buys armor points separately from placing them. MekStation stores only
placed points, so the store's Auto passes no count and places the legal total, the
same as MegaMekLab's Maximize followed by Auto. At the default structure the old
proportional policy gave identical results at the full total; the port differs
for any smaller count and for edited structure.

`__tests__/fixtures/armor-auto-allocate-java.json` holds 2,944 results from the
original classes: every tonnage 2-15, biped/quad/glider, with and without a main
gun, up to 14 point totals each, plus cases with larger and with reduced internal
structure. `ProtoAutoAllocateProbe.java` copies the three methods byte-for-byte
(hashes in the fixture's `meta`) and runs them on a real `ProtoMek` with the
pinned `UnitUtil` and `TestProtoMek`. It needs a working directory that holds the
pinned `mmconf/milestoneReleases.yml`.

## Electric Discharge ProtoMech armor

`armorType.ts` owns Standard ProtoMech (42; legacy 0/omitted) and Electric
Discharge (18), their mass-per-point, torso slots and equipment identities.
MegaMek `48fcb2f64` `ArmorType.java:1375-1420` gives Standard 0.05 t/point and
EDP 0.075 t/point, one torso slot and equipment BV 32. The armor mount itself
has zero mass. The catalog is unchanged. EDP is Clan Experimental, approximate
prototype 3071, no production/common date, extinct 3085, no reintroduction;
TechAdvancement's five-year approximation margin explains catalog year 3066.
Both choices are available without year/faction filters: tech filtering remains
deferred under O3. This is not a claim of tech-legality parity.

`weight.ts` owns allocated armor mass and the extracted minimum-weight rule.
`TestProtoMek.getWeightAllocatedArmor` returns points times weight-per-point;
`calculateWeight` rounds the complete component sum to the nearest kilogram.
There is no half-ton rounding. Complete weight is returned only when mounted
mass can be accounted for; unknown equipment produces an explicit missing list.
The Basilisk pair exercises the complete path, including the pinned fixed 1 t
Quad melee mount (`MiscType.createProtoQuadMeleeSystem:9440-9450`) and Myomer
Booster (`MiscType.getTonnage`, 0.025 times unit mass rounded to kg). Other
weight families and unmodelled linked-equipment effects are not certified.
EDP source validation uses this complete mass when available, otherwise the
known minimum; Standard source validation retains the minimum-weight policy.

`getProtoArmorSlotErrors` supersedes the earlier torso-slot deferral: count
ordinary slot-taking torso mounts, excluding armor equipment, then add the
selected armor's required slots. Torso equipment-mass limits remain separate.
The mount remains the sole EDP BV contributor through
`resolveProtoOffensiveEquipmentBV`; the armor-point coefficient is unchanged.
An explicit armor edit creates/removes that mount; source loading retains the
source declarations. Unknown armor identities produce diagnostics, not a
Standard-looking identity. Saves retain the existing numeric field and schema.

Compatibility deviation approved by Coordinator 3: pinned MML `62bf193`
`PMStructureTab.freeUpSpace` (line 289) unassigns optional torso mounts with
`UnitUtil.changeMountStatus(... Entity.LOC_NONE ...)` at line 310 before
creating the armor mount (`createArmorMountsAndSetArmorType`, line 319).
MekStation has no unallocated ProtoMech location yet. Its armor edit retains
all equipment, allows EDP and displays slot overflow instead of unassigning.
Follow-up: **unallocated ProtoMech mounts and MML's EDP transition**, routed by
Coordinator 3 with Equipment/Assign Criticals work.

## Resolved zero-misc diagnostic projection

At MegaMek `48fcb2f64`, `BVCalculator.processOffensiveEquipment` calls
`offensiveEquipmentBV` while testing for zero, before skipping arithmetic.
The existing Java trace hook records that actual zero. The local equipment
owner retains separate optional `resolvedZeroEquipmentMountBV` facts only
for resolved catalog zeros with error-free, matching BLK source identity and
the represented source block: EIInterface, CLMyomerBooster,
ProtoMechJumpJet and ExtendedJumpJetSystem at Body, and ProtoMechPartialWing
at Torso. `BLKProtoMekFile.loadEquipment` and `TestProtoMek.requiresSlot`
place the four no-slot types at native Body 0. Public mount locations and
existing positive-misc facts are preserved; the trace's existing location map
continues to format Torso 2. Other blocks and identities remain unprojected.

Unknown resolver fallback zeros, missing/malformed provenance, and nonzero or
nonfinite values produce no fact. Optional zero facts retain each actual mount
index, id and public location in encounter order, with a separate Body index
where needed. The trace formats those facts with native last-put semantics.
These diagnostic facts never enter arithmetic, admission, quantities or caps.
Legacy breakdowns remain supported without inferred zeros. This establishes
only the represented zero-term projection, without catalog, source-location,
persistence or general equipment-rule changes.

## Native weapon indices after intrinsic one-shot ammunition

`nativeEquipmentIndices.ts` owns the diagnostic mapping from source mounts to
native equipment positions. MegaMek `48fcb2f64` `Entity.java:5093-5175`
appends intrinsic ammo immediately after its launcher; Fusillade inserts two
mounts through `F_DOUBLE_ONE_SHOT`. `AmmoType.java:2443-2447` excludes weapons
without an ammo type. The independent generated `nativeOneShotAmmoMounts.ts`
retains those insertion counts without changing the legacy weapon-flag tables.

Weapon snapshots retain their local `equipmentIndex`, identity, location and
already-admitted BV. The parity trace entry point `withProtoMechNativeIndices`
in `nativeTraceEnrichment.ts` copies the breakdown and appends
`nativeEquipmentIndex` only to shifted snapshots; ordinary calculator
breakdowns retain local indices without that field. The trace formats the
enriched value and falls back to the local index for existing
breakdowns. Sprite 3 therefore renames only raw weapon indices 8/9/10 to
10/13/14. Source equipment, explicit ammo, quantities, equipment projections,
classification, caps, arithmetic, validity and persistence are unchanged.
