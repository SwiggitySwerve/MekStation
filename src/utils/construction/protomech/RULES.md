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
legacy handler still resolves chassis from its old Quad/Glider tags; native
`ProtoMek` discovery and `motion_type` decoding need separate loading work.
This correction does not establish full source, persistence or numerical parity.

## Absent main-gun contents

`getProtoMainGunTopologyError` owns the requirement that Main Gun equipment or
nonzero armor needs a mount. BLK source loading retains inconsistent equipment
with a warning; export fails with no content. This prevents the pinned
`BLKProtoMekFile` location loop from silently dropping source contents when
five armor entries make `ProtoMek.locations()` exclude Main Gun. It does not
remove equipment from the editor or certify general equipment/legality parity.
