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

`hasBVActuatorEnhancement` owns mounted AES location matching. Physical and
heat-tracked weapon callers preserve their parsing, rounding and bonus order.

Active vibroblades enter the Mech weapon heat sequence once, with their arm
AES flag and without TC, and leave the separate flat physical sum.
physicalWeapons.ts owns their forced-active BV heat (3/5/7).
Pinned 48fcb2f64: HeatTrackingBVCalculator.java:89-103 and
MekWithArms.java:242-270. validate-bv-vibroblade-heat.test.ts enforces all
three sizes, overheat weighting, and the existing AES order.
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

# Direct-fire BV ownership

`isDirectFireBVWeapon` owns production TC eligibility. Represented identities
use pinned native F_DIRECT_FIRE facts; unrepresented legacy IDs retain their
existing compatibility policy. The shared bonus remains 1.25. Rocket-launcher
IDs such as rl10 are ineligible (BVCalculator.java:880; RLWeapon.java at pin
48fcb2f64). The generated fact owner is equipmentBV/nativeWeaponFlags.ts.

The Mech critical scanner collects Talons as one spreadable mount across
limbs. Other physical weapons retain per-location mount identity, per-mount
rounding and AES before accumulation in physicalWeapons.ts.
Pinned 48fcb2f64: MiscType.java:1401-1404,4310-4316 and
MtfFile.java:1053-1068. validate-bv-physical-weapons.test.ts enforces biped,
quad/TSM and mixed-claw cases without changing the damage-based BV formula.

applyWeaponBVModifiers in battleValueHeatTracking.ts owns mounted AES,
rear, Artemis and TC arithmetic for Mech weapons. Orientation selection
and heat sorting call it with their own stage guards. Its public extraction
preserves the prior orientation guards before changing that behavior.
Orientation compares both sides with full mounted modifiers and no rear
discount; rear weighting starts only after the dominant side is selected.
Arms and Mek turrets remain excluded. Pinned MegaMek 48fcb2f64
BVCalculator.java:690-699,764-765,829-882; MekBVCalculator.java:384-405.
validate-bv-facing.test.ts enforces selection, links, ties and exclusions.

Apollo-linked Mech weapons retain the fractional product from the shared
getWeaponLinkBVMultiplier owner through orientation, heat sorting, ammo caps
and offensive movement. Round only the final unit BV, as pinned MegaMek
48fcb2f64 BVCalculator.java:860-876 does. The existing controller assignment
guards are unchanged. validate-bv-apollo-precision.test.ts checks all MRM sizes
and accumulation across separate mounts through the shared Mech calculator.

Magshot's native ISMagshotGR and display-name criticals carry the same
F_GAUSS explosive eligibility as other Gauss weapons: one BV per occupied
critical, subject to existing CASE protection. Its ammunition remains
nonexplosive. Pinned MegaMek 48fcb2f64 GaussWeapon.java:54-59,
ISMagshotGaussRifle.java:59-77 and MekBVCalculator.java:204-215.
validate-bv-magshot.test.ts includes the Morpheus MASS prerequisite.

# Marked weapon identity

The critical-mount owner resolves rear/turret markers to the same catalog
weapon family consumed by Mech weapon inputs. Match a complete identity;
medium and ER-medium lasers are distinct. Tech-specific critical counts remain
on each marked source mount, including one-slot Clan ER large lasers. Explicit
rear mounts consume their marker before front copies. Pinned MegaMek
48fcb2f64: MtfFile.java:1015-1023,1062; BVCalculator.java:744-765.
