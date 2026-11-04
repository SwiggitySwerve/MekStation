# Infantry BV ownership

`infantryBV.ts` owns platoon arithmetic. Field guns and bins use the shared
`battleValueAmmo.getNativeAmmoBVGroup` type:rack rule before the shared cap;
unknown and explicit caller keys retain their legacy fallback. Pinned MegaMek
48fcb2f64 BVCalculator.java:1199,1233 builds the same key for both sides.
