# ProtoMech construction rules

This package owns ProtoMech construction calculations. Consumers use its public
barrel. The engine-rating rule below is verified independently; other existing
rules in this package do not acquire that verification by sharing an owner.

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

The separate MP/tonnage caps, default speed choices, flank policies, engine
weight factor and rounding, weight classes, equipment and BV rules remain
unverified against the pinned runtime. Existing saves are not migrated. The
native handler preserves chassis, motion, armor order and main-gun presence;
its source projection does not establish a production editor import path.
This correction does not establish full source, persistence or numerical parity.

## Armor policy consolidation

`armor.ts` now owns the utility table, diagram limits and automatic allocation.
Its three temporary policies deliberately preserve their different existing
results so consolidation can be verified before the numerical correction.
They are not yet certified armor rules. The pending Armor Limits requirement
will replace them with the pinned total and location limits; imported and
stored armor must remain unchanged unless the user requests allocation.

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
there is no save migration. Printing data now carries Quad and optional
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
