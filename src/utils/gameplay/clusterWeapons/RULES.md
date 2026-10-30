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
`missileMechanics.ts`) does not use it. The single-missile AMS path
(`weaponAttackAMS.ts`, `projectileCount === 0 ? 0 : damage`) is the same
conversion for a rack of one, written as a conditional; it stays separate
because the owner would return `NaN` for non-finite damage where it returns 0.

## Missile rack identification

`missileRack.ts` owns `missileRackSize(weaponId, weaponName)` and
`isMissileClusterWeapon(weaponId, weaponName)`: the rack read from the
mount-stripped id, the full id, then the name, and the LRM/SRM/MRM/ATM/MML
family check. The runner's missile-cluster and Streak resolution and the
selected-AMS session cluster used separate copies with identical behavior and
now share it; a test freezes both copies as oracles over the whole weapon
catalog. The family list mirrors `isMissileWeapon` and stays local because
`specialWeaponMechanics` imports this module's facade. UAC, RAC and LB-X are not
missiles here; their rack and rate-of-fire contracts are separate.

## Damage previews

`damage/expectedDamage.ts` now reads missile racks through that owner and the
total through `damageForProjectiles`. For a hydrated missile cluster weapon the
preview is `p x E[hits(rack)] x d` with `d` = total / rack (LRM 16 at p = 0.5:
5.2083, SD 5.5526) and the variance `d^2 (p Var(C) + p(1-p) E[C]^2)`; a Streak
launcher previews `p x total` and `sqrt(p(1-p)) x total`. Pinned MegaMek
`48fcb2f6`: `Compute.calculateClusterHitTableAmount` (Compute.java:5599),
`MissileWeaponHandler.calcDamagePerHit` (1 per LRM/MRM missile, :308),
`SRMHandler.calcDamagePerHit` (2, :66), `ATMHandler.calcDamagePerHit` (2, 3 high
explosive, 1 extended range, :78), `StreakHandler.calcHits` (whole rack on a
lock, :97) and MegaMek's own `DamageProfile.expectedClusterHits` (:454).

Not corrected, measured and left open: UAC/RAC/LB-X previews (legacy name/id
rack lookup, no firing-mode input), MRM's column modifier (the runner applies
-1 to every MRM roll; the previews ignore situational cluster modifiers),
MML's LRM/SRM mode (hydrated as SRM damage), the 151 catalog launchers that
hydrate to `damage: 0`, and `critProbability`'s one location roll per landed
missile (MegaMek groups LRM/MRM/ATM damage in 5-point clusters; the runner
rolls one location per salvo).
