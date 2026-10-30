# ProtoMech construction rules

This package owns ProtoMech construction calculations. Consumers use its public
barrel. The engine-rating rule below is verified independently; other existing
rules in this package do not acquire that verification by sharing an owner.

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
Equipment pools, physical bonuses, defensive movement, chassis multipliers,
damage/options, UMU/mechanical jump equipment, complete BV and production
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
negative/fractional/nonfinite movement, full equipment pools, chassis final
multipliers, complete BV and production browser flows remain unverified.

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
