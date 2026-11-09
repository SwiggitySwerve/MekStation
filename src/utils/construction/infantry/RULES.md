# Infantry BV ownership

`infantryBV.ts` owns platoon arithmetic. Field guns and bins use the shared
`battleValueAmmo.getNativeAmmoBVGroup` type:rack rule before the shared cap;
unknown and explicit caller keys retain their legacy fallback. Pinned MegaMek
48fcb2f64 BVCalculator.java:1199,1233 builds the same key for both sides.

## Source weapon stage diagnostics

`infantryBV.ts` also owns the native raw weapon-stage facts. It retains primary
and represented secondary shooter values, non-archaic anti-Mek repeats, and the
remaining weapon-stage contribution. Native addition order, individual field-gun
values, and left-associative remainder subtraction preserve floating-point
residuals without rounding. Prosthetic anti-Mek bonuses and augmentation bonuses
belong to the remainder, not the anti-Mek weapon-repeat subtotal.

`bvTrace.ts` only maps these facts to the four `infantry.*` keys. Missing source
facts and absent secondary weapons remain absent; represented zeros remain zero.
Per-trooper fields, existing arithmetic, aggregates, totals and source inputs are
unchanged. Per-mount weapon and ammunition projections are separate work.

Authority: MegaMek 48fcb2f64 InfantryBVCalculator.java:128-237 and
BVCalculator.java:803-827; `java_bv_terms.py`'s `finishInfantryWeapons` records
the raw returns and remainder subtraction.
