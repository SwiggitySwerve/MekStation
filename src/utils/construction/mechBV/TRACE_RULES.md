# Mech BV diagnostic projection

`bvTrace.ts` names existing Mech owner results for comparison with native stages.
It does not set calculator inputs or alter totals. A missing diagnostic fact
stays absent; a source reference or matched total cannot supply a missing value.

`weaponInputs.ts` retains the legacy `normalizeWeaponKey` ids and listed values
in `ammoCapWeapons` for the existing arithmetic. That compatibility policy maps
torpedoes to missile keys. For admitted, resolved torpedo mounts, it separately
captures source ids recognized by `getNativeAmmoBVGroup` in the optional
`ammoCapProjectionWeapons` list. The list follows the same expanded mount order,
one-shot exclusion and pre-modifier snapshot as the arithmetic list. Non-torpedo
mounts in that list retain their existing ids. A unit without an eligible
torpedo has no diagnostic list. Unresolved identities do not create native facts.

The calculator transports this list into the breakdown. `bvTrace.ts` passes it
to public `calculateAmmoBVPools(list, []).cap` to obtain the native diagnostic
cap map. That owner alone sums weapon values and names supported native groups.
The adapter does not add/subtract caps, infer zeroes, or read oracle values.
When the list is absent, the adapter uses the original arithmetic cap map.
The original `ammoPools`, available terms, actual ammo BV, heat tracking,
modifiers, aggregates and totals remain unchanged.

Pinned MegaMek 48fcb2f64 `BVCalculator.java:1189-1242` supplies this trace contract:
raw weapon type BV is grouped by native ammo type/rack, with one-shot weapons
excluded at line 1230. `ISSRT6.java:60-68` supplies rack 6 and BV 59. Thus the pinned
Javelin's two SRT 6 mounts project `ammo.cap.SRM_TORPEDO:6 = 118`, while its
existing arithmetic pool retains `SRM:6 = 118`. Equal numbers under a different
key do not establish native term coverage.

This slice covers only torpedo raw cap names. Defensive caps, other unsupported
ammo identities/quantities and complete detailed parity remain separate work.
