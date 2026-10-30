# Weapon attack classification

weaponAttackBuilder.ts owns translation from a mounted simulation weapon to
IWeaponAttack. Its category inference uses the existing isMissileWeapon
contract in specialWeaponMechanics/missileMechanics.ts. It does not repeat
the family predicate or change catalog parsing.

Recognized missile names produce MISSILE even when capacity metadata is -1.
For other names the legacy fallback stays intact: capacity -1 means ENERGY;
otherwise ballistic-name substrings mean BALLISTIC and the rest mean MISSILE.
This remains incomplete inference, not a native equipment-type registry.

GameEngine, InteractiveSession and P2P attack translation use the builder.
gameSessionCore.attackToHit passes its category through toHit/stateHydration
to the existing Gunnery Specialist rule. The captured catalog changes contain
154 ENERGY-to-MISSILE transitions. For an Energy specialist, the modifier
changes from -1 to +1; for a Missile specialist, +1 becomes -1. Ballistic
specialists and pilots without this ability retain their results. All other
attack fields, catalog data and resource policies are unchanged.

Pinned MegaMek uses weapon flags for this rule:
[ComputeAbilityMods.java](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L127).
[MissileWeapon.java](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/weapons/missiles/MissileWeapon.java)
sets F_MISSILE; LRMWeapon and SRMWeapon inherit it. This source check supports
the classification and isolated modifier, not full native combat parity.

Ammo readiness and quantity projection are separate work. Legacy fallbacks
for unrecognized names, torpedo names, native multi-SPA precedence and complete
catalog categories remain open. The tactical combat projection currently
omits category when hydrating its attacker state; this existing preview gap
is not repaired here. No browser, complete combat, source serialization or
full numerical-parity claim follows from the local category correction.
