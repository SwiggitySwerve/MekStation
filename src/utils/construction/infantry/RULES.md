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
unchanged.

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

## Ammunition pool diagnostics

`infantryBV.ts` retains resolved field-gun BV in native type:rack pools through
`battleValueAmmo.addBVToAmmoCapGroup`. It calls `calculateAmmoBVPools` once on
the existing normalized arithmetic inputs, taking the unchanged capped total
and uncapped availability from that call. Diagnostic caps use the retained gun
groups because normalizing already-normalized ids again loses native identity.
Personal infantry weapons contribute no ammunition pools.

`bvTrace.ts` only formats retained groups as `ammo.cap.<type:rack>` and
`ammo.available.<type:rack>`. Caps sum launchers; availability sums admitted bins
once per platoon before capping or speed. A cap without bins has no availability
key. Represented zeros remain zero; unknown groups stay absent. Positive partial
source bins keep the existing native bin BV without new shot proration.
Replay accepts optional finite pool diagnostics and validates raw keys before
Zod clones them, retaining own and inherited unknown-key rejection.

Authority: MegaMek 48fcb2f64 `InfantryBVCalculator.java:233-240` and
`BVCalculator.java:1189-1242`.
