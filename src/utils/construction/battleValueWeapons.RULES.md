# Weapon BV rules

`battleValueWeapons.ts:isDirectFireBVWeapon` owns the existing Mech direct-fire
classification for normalized identifiers. Its extraction preserves the exact
Mech guards and results. Vehicles normalize mounted IDs before calling it.
The older public `calculateOffensiveBV` retains its historical three-family TC
exclusion policy; its separate compatibility contract is not changed here.

`applyTargetingComputerBV` owns the 1.25 bonus for already eligible mounts
(MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`BVCalculator.java:880-882`). The public legacy sum, heat-tracked Mech sum and
vehicle owner and script-side orientation calculator call it with their existing eligibility, ordering and fire-control
guards. AES also uses 1.25 but is a separate rule.
`hasBVTargetingComputer` owns the catalog-backed chassis capability; vehicle
explicit mount flags remain authoritative alongside that lookup.

Ordinary aircraft apply the shared bonus to represented direct-fire weapons
before forward/rear dominance and heat sorting. Ammo, miscellaneous mounts
and defensive equipment do not receive it. Support-vehicle FCS remains outside
this aircraft slice. Pinned `BVCalculator.java:690-699,880-891` and
`HeatTrackingBVCalculator.java:81-86,111-145` define this ordering.

calculateArcWeaponBV owns weapon arc weighting plus grouped additions outside
that weight (BVCalculator.java:839-856, pin 48fcb2f64). Large craft retain their
grouped-arc contract; ordinary aircraft use it per weapon before heat and for
their arc totals. Capacitor additions include TC once before this shared stage.
