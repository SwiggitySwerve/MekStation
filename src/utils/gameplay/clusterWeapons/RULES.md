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

## Total-to-projectile damage

`projectileDamage.ts` owns `damageForProjectiles(totalDamage, rackSize,
landedProjectiles)`, the conversion from the launcher total hydrated into
`IWeapon.damage` (LRM 16 = 16) to the damage of the projectiles that landed.
The runner's missile-cluster and Streak resolution and the selected-AMS session
cluster share it, with outputs unchanged. Code whose input is already damage per
hit (`resolution.ts`, `streak.ts`, battle-armor `damagePerMissile`,
`missileMechanics.ts`) does not use it. The expected-damage and variance
previews still multiply the total by expected hits; correcting them is the next
slice.

## Committed (interactive and host) missile attacks

`resolveMissileClusterDamage` in `gameSessionAttackResolution.ams.ts` resolves a
committed missile attack that has no selected AMS: one 2d6 cluster roll (drawn
after the to-hit roll and before the hit-location roll, like the selected-AMS
path) picks the landed missiles through `lookupClusterHits`, and
`damageForProjectiles` turns the hydrated launcher total into their damage.
Streak lands every missile on a hit and rolls nothing. Before this the whole
launcher total landed (LRM 20 = 20).

Not modelled yet, recorded as the next slices: MegaMek rolls a location per
group (`calculateNumCluster`: LRM/MRM 5 damage points, SRM and Streak 1, ATM 5
under TW rules and 6 under Core, `MissileWeaponHandler.java:303`,
`SRMHandler.java:82`, `StreakHandler.java:92`, `ATMHandler.java:124`; ATM
converts missiles to points first, `ATMHandler.java:118-119`), while the
session still applies all landed damage at one location. Cluster modifiers
(Artemis, Narc, low profile, MRM) and the cluster roll's audit record outside
AMS are absent. LB-X cluster mode and UAC/RAC rates cannot be selected through
the interactive fire modes.
