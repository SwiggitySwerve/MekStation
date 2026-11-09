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

`bvTrace.ts` maps these facts to the four `infantry.*` keys. Missing source
facts and absent secondary weapons remain absent; represented zeros remain zero.
Per-trooper fields, existing arithmetic, aggregates, totals and source inputs are
unchanged. Ammunition projections remain separate work.

Authority: MegaMek 48fcb2f64 InfantryBVCalculator.java:128-237 and
BVCalculator.java:803-827; `java_bv_terms.py`'s `finishInfantryWeapons` records
the raw returns and remainder subtraction.

## Per-weapon diagnostics

The same owner observes the existing primary, secondary and eligible anti-Mek
weapon calls. It merges temporary trooper identities in call order, including
represented zeros; prosthetic and augmentation bonuses remain in the existing
remainder. Each admitted field gun retains its local resolved id and computed
value separately. These observations do not feed BV arithmetic.

`bvTrace.ts` only formats the retained facts as `weapon.-1.TPRS.<id>` and
`weapon.<localMountOrdinal>.FGUN.<id>`. The comparator already normalizes each
location to descending values and a count, independently of Java equipment
indices and names. Missing source facts remain absent. Replay accepts only
optional finite values at these diagnostic keys and still rejects unknown keys.

Authority: pinned `InfantryBVCalculator.java:128-157,233-237`,
`BVCalculator.java:803-827` and `java_bv_terms.py`'s `terms.merge` hook.
