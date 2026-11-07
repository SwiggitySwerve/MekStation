# Quirk identity and combat effects

`catalog.ts` owns unit-quirk ids and membership through `hasQuirk`. Unit
modifier helpers call that contract. Preserve unknown ids and legacy save
keys; recognize native ids at lookup without rewriting saved data or adding
a modifier twice when both spellings occur. Per-mount weapon quirks retain
their distinct ids and membership scope.

MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`
`OptionsConstants.java:72-74,135-137` names native targeting ids.
`Entity.java:12721-12781` applies -1 Improved / +1 Poor Targeting in the
matching short, medium or long bracket; independent checks cancel when both
are present. The native-id port changes lookup only, retaining existing
range/SPA arithmetic and every legacy quirk id. Parsers and converters carry
native data; they do not own runtime modifier rules.

## Explicit Hard Pilot

Native `hard_pilot` (`OptionsConstants.java:123` at the same pin) and saved
`hard_to_pilot` share membership without double counting. The explicit quirk
adds +1 only when native DNI is inactive, following
[Entity.java:8939-8946](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Entity.java#L8939).
`pilotingQuirks.ts` consumes public `@/lib/spa/neuralInterface.hasActiveDNI`;
the SPA owner alone interprets mode, implants and verified hardware
(`Entity.java:13365-13379`, `NeuralInterfaceMode.java:102-119,151-158`).
The PSR boundary forwards actual session mode/hardware retained by replay.
Missing mode remains inactive; the represented jack-in flag does not replace
native context. BVDNI qualifies even though its represented PSR bonus is zero.
EI and BA NIU do not establish DNI activity or cockpit hardware.

This correction covers explicit design/save quirks. DNI-induced Hard Pilot
synthesis (`Entity.java:15675-15693`), higher-level mode authoring and AirMek
landing PSRs remain separate. Easy Pilot's existing arithmetic and represented
SPA modifiers are preserved.

## Easy Pilot identity

`OptionsConstants.java:62` names `easy_pilot`. Resolve it through the same
membership owner, retaining the `easy_to_pilot` saved key. This is a unit
design quirk, not a pilot SPA.
`Entity.java:9989-9995` gates Easy Pilot terrain relief to base piloting >3;
`TWGameManager.java:17878-17888` applies that same gate to damage PSRs.
This identity correction preserves existing PSR arithmetic and eligibility.
Both native Easy and Hard identities coexist; the explicit Hard exception
continues to use the public native DNI owner and actual session inputs.

## Weapon cooling

`weaponQuirks.ts` owns `getWeaponCoolingHeatModifier`; interactive heat and
autonomous heat phases both consume its delta through their existing calls.
At the same MegaMek pin,
[WeaponMounted.java:167-178](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/equipment/WeaponMounted.java#L167)
first applies Improved Cooling as `max(1, heat - 1)`, then independently adds
1 for Poor Cooling and 2 for No Cooling. The floor applies before additions;
No Cooling is not a multiplier. `WeaponQuirks.java:81-83` and
`OptionsConstants.java:106-108` register the native ids.

Native `imp_cooling` and saved `improved_cooling` are one boolean flag here;
duplicates and both spellings together do not multiply it. Unknown near ids
do not match. Existing consumers retain their outer zero clamp and per-fired-
weapon summation. This does not bind source critical slots to runtime mount
ids, change heat sinks/firing modes, regenerate catalogs or establish complete
weapon-quirk parity. Those source/runtime and other modifier paths remain
separate from this bounded cooling correction.

## Native Weak Legs

`getWeakLegsCriticalLocations` owns native `weak_legs` membership and the
extra critical-check requests. At the same pin,
[TWGameManager.java:12869-12872](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L12869-L12872)
requests a normal critical determination after kick damage, at the actual
kicked location even if armor remains. This is neither a critical modifier
nor a forced hit. A low determination roll can produce no critical.

[TWGameManager.java:17207-17217](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L17207-L17217)
checks a successful DFA attacker's left leg, then right leg. A quad also
checks left arm, then right arm: all four checks, in that order. The miss
branch returns before these checks. Source metadata, family and `isQuad`
already travel in GameCreated and replay; no construction inference is added.
The target owns the kick quirk and the attacker owns the DFA quirk. Duplicate
ids do not stack; unknown or differently cased ids do not match.

Session and runner consume this owner after the relevant damage. Normal
determinations reuse the critical resolver, existing component/event owners,
and injected dice. The runner's omitted `rollNumber` option preserves the
existing forced-single path. Critical limb/head loss uses one shared event
adapter so the zero-damage location removal also survives replay; the extra
check does not invent another physical damage amount.

This slice adds the check requests and represented critical consequences.
Existing broader physical critical-system and ammunition-explosion consequence
gaps remain separate; this is not full critical-system or quirk parity.
It changes no catalog data, parser, regeneration, construction or BV rule.

## Native Prototype: BattleMech ranged critical determination

At the same pin, `Quirks.java:168` and `OptionsConstants.java:139` register
`prototype`. [TWGameManager.java:23257-23258](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L23257-L23258)
adds +2 to `critMod` for the damaged unit. Lines 23290-23308 add that modifier
to the rolled critical determination before applying the critical table.
`getPrototypeCriticalHitModifier` owns this +2 once through exact native
membership; duplicate ids do not stack and near ids are not aliases.

The two ranged consumers add its result to the existing Low Profile modifier.
Low Profile glancing damage stays halved; its -2 critical-table modifier
cancels Prototype's +2. The critical owner still decides the count and slot
effects. Forced-single checks, including the existing armored TAC path,
bypass the determination roll and retain their count.

The family gate reuses public `isMechUnit`; absent family retains the existing
legacy BattleMech convention. Explicit other or unknown families receive no
new modifier. Existing source hydration, GameCreated, session and serialized
replay carry the native quirk, family and resolved critical events. This slice
changes no construction, BV, catalog data or input producer. Other families,
physical attacks and broader critical-system parity remain open.

## Native Anti-Air

At the same pin, `Quirks.java:75` registers `anti_air`
(`OptionsConstants.java:44`).
[ComputeAbilityMods.java:64-68](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L64-L68)
adds -2 when the attacking unit has that quirk and the Entity target satisfies
`isAirborneVTOLorWIGE() || isAirborne()`. `calculateAntiAirQuirkModifier` owns
that numerical effect. Membership is boolean: repeated ids apply it once;
unknown, differently cased and near-match ids do not create new aliases.
The target's own Anti-Air quirk does not grant the attacker a benefit.

The modifier consumes `target.isAirborne` from the shared native
`combatAirborne.ts` owner merged in #2972. That owner interprets transported
flight lifecycle, altitude/elevation, destruction and existing building/bridge
terrain; see `../combatAirborne.RULES.md`. No quirk helper duplicates those
predicates or infers flight from chassis/family. Missing native state remains
unqualified. Direct public to-hit callers must supply that established fact.
Normal range/movement, other unit/weapon quirks and outer to-hit clamping stay
unchanged. Real converted Orion metadata reaches the effect through the
existing source hydration owner and GameCreated/session/replay paths.

This slice adds no parser, generated/catalog data, producer, BV or additional
quirk effect. Other family airborne mappings and other quirk gaps remain open.
