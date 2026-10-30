# Cluster table ownership

`hitTable.ts` owns cluster counts and gameplay lookup. `resolution.ts` preserves
its public lookup export by forwarding to that owner. The legacy validation
module imports the same pure table; the owner imports no types or consumers.
Validation retains floor selection and invalid-roll zero, while gameplay keeps
its ceiling fallback and integer-roll clamping. The refactor precedes numerical
corrections and has separate unchanged-output evidence.

## Native integer racks

Reference: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`megamek/src/megamek/common/compute/Compute.java`,
`calculateClusterHitTableAmount`. Actual JVM observations define rolls 2-12 for
integer racks 1-20. Add columns 1, 11, 13, 14, 16, 17, 18 and 19 and correct eleven
cells in existing columns 3, 7, 8 and 9. Columns 2, 4, 5, 6, 10, 12, 15 and 20
keep every value. Every supported hit count is between one and its rack size.

All shared consumers receive corrected counts: missile/AMS resolution, selected
autocannon rates, battle-armor damage/vibroclaws and expected-damage previews.
This changes combat outcomes for affected racks, including existing SRM 3 and
RAC 3 use. The expected-damage caches derive from the same table.

Gameplay keeps its old selection for fractional, nonpositive, nonfinite and
greater-than-20 sizes. Validation keeps its floor policy over available columns,
so its unsupported inputs can select a newly added column. Neither policy is
native parity for unsupported inputs. Fractional/nonfinite rolls, racks above
20, complete ProtoMech combat, ammo eligibility/consumption and full source BV
remain unverified; this prerequisite does not make PR #2408 merge-ready.
