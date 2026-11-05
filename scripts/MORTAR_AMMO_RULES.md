# Shaped-charge mortar ammunition BV

`validate-bv-ammo-overrides.ts` owns the legacy ammunition fallback values.
Shaped-charge mortar bins retain native fractional BV: sizes 1, 2, 4 and 8
use 1.2, 2.4, 3.6 and 7.2 respectively, for both tech bases. Keep each value
in the fallback list once; represented catalog identities remain authoritative.
The shared ammo-pool owner groups and caps these resolved bin values without
rounding them.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`AmmoType.java:11919-12130` defines the IS and Clan shaped-charge factories;
`BVCalculator.java:1189-1242` accumulates bins by native type/rack and builds
the weapon cap. This correction changes no catalog values or identities.
