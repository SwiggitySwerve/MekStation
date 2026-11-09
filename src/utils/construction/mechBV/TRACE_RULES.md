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

## Source-backed NARC/iNARC available values

`processCritAmmoSlot` separately records diagnostic facts for physical NARC/iNARC
bins with positive shots from public `resolveNativeAmmoBin` and an actual
resolved BV of zero from public `resolveAmmoBV`. The existing native group
owner restricts this path to `NARC:1` or `INARC:1`. Original cleaned ids, physical locations
and encounter order remain intact, including duplicate and pipe-separated bins.
The side facts never enter arithmetic `ammo`, and the original explosivity
handling stays unchanged. Missing, unresolved, empty or other-type bins do not
produce facts. Launcher presence cannot supply an implicit source bin.

The optional `ammoAvailableProjectionBins` list travels through the Mech
builder's `ammoProjection` wrapper to the breakdown. The trace delegates its
available grouping to `calculateAmmoBVPools([], bins).available` and combines
the returned actual values with existing availability through public
`addBVToAmmoCapGroup`. It does not replace a nonzero available value with zero,
invent a zero for an absent bin, or change arithmetic pools and computed BV.

Pinned MegaMek 48fcb2f64 `AmmoType.java:10711-10729` defines ordinary NARC
pods with rack 1, six shots and BV 0. `BVCalculator.java:1147-1154,1189-1212`
preserves a zero-valued available group for usable physical bins.
`AmmoType.java:10803-10818,10862-10876` defines the represented standard and
explosive iNARC pods with rack 1, four shots and actual BV 0. Their source
facts use the same collector and public guards. Native grouping keeps mixed
NARC and iNARC bins separate; iNARC alone cannot invent an ordinary NARC key.
This diagnostic support does not extend to other omitted ammo identities.
Defensive caps, effective quantity parity, arithmetic native grouping and
complete detailed parity remain separate work.

## Supplemental Mech ammo groups

The Mech input owner optionally transports `ammoDiagnosticPools`, composed by
`projectMechAmmoBVPools` from the existing pools and actual supplemental source
facts. The trace formats this result without resolving equipment or calculating
caps. Legacy breakdowns retain their original projection policy. Existing
projection lists and all arithmetic fields remain unchanged.

The supplemental identity owner covers raw AMS/APDS caps, improved AC/5 and
Gauss, fluid guns, coolant pods and the converter's primitive AC launcher id.
Raw caps preserve mounted multiplicity, one-shot exclusion and listed values
before modifiers. Available values come from existing admitted ammo entries or
actual zero-valued usable physical bins. Repeated facts accumulate through the
public addition owner; existing pool keys are never overwritten. AMS/APDS raw
caps are diagnostics only and do not change defensive ammunition arithmetic.

Pinned MegaMek 48fcb2f64 `BVCalculator.java:1189-1242` defines the raw pools.
`ISAMS.java:64-76` and `ISAPDS.java:61-72` supply raw cap values 32 and 64;
`CLImprovedGaussRifle.java:74-82`, `CLImprovedAC5.java:64-78`,
`ISFluidGun.java:58-63` and `ISAC10Primitive.java:77-87` define the other
represented launcher identities and listed values. Effective quantities,
defensive arithmetic parity and other families remain separate obligations.

Physical diagnostic bins reuse `normalizeMechBVSourceName`, extracted unchanged
from the calculator's defensive-equipment and armored-PPC lookups. The shared
policy removes armored/rear annotations for identity lookup; the original
source token and all legacy scanning remain unchanged. This admits Turkina U's
`Coolant Pod (OMNIPOD) (ARMORED)` through the existing real-bin resolver and
retains its actual zero-valued availability without changing armored BV.
