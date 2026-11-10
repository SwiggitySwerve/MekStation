# Battle armor BV source rules

The native chassis technology controls missile burden and anti-Mek eligibility.
Mixed equipment on a Clan chassis retains Clan eligibility. The BLK loader uses
the shared conversion owner `isClanSourceChassis`, also used by BLK engine
decoding. It supplies an explicit chassis technology to the shared field builder;
other families retain their existing default parsing. Both loaded-unit and editor
BV paths use `canMakeBAAntiMekAttacks` and the same mount projection/calculator.

The canonical BA mapper uses its typed `clanChassis` fact for MIXED definitions,
so the same eligibility owner receives the native chassis on source and catalog
paths. An absent fact retains the existing fallback; pure definitions and saved
editor state retain their own technology. No eligibility result is cached or
inferred from equipment technology. BattleArmor.java:953-987,1360-1387 governs
the shared missile-burden, manipulator, weight and movement guards.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:

- `BLKFile.java:720-735` assigns Clan tech levels to mixed Clan-chassis sources.
- `BattleArmor.java:953-984` exempts Clan chassis from loaded missile burden,
  then applies the common manipulator, weight and movement eligibility guards.
- `BattleArmorBVCalculator.java:146-160` values eligible non-missile arm weapons
  again in the anti-Mek section; `BVCalculator.java:799-882` owns weapon valuation.
- `ISBAFiredrakeNeedler.java:61-72` supplies BV 2 and non-missile weapon flags.

The Gray Death Strike Suit (HarJel) has ordinary weapon BV 32 plus anti-Mek BV 2,
ammo BV 0.48 and speed factor 0.77: offensive BV 26.5496 per trooper. Defense is
28.2. The existing squad factors yield rounded totals 285, 383 and 493 for sizes
4, 5 and 6. The source's unimplemented HarJel note creates no additional BV rule.

## Native weapon diagnostics

`classifyBAWeaponMount` in `battleArmorMounts.ts` is the one owner of BA weapon
mount classification (claw, trooper, support, infantry and the per-mount
anti-Mek half). The averaged-trooper `weapons` list and the native
`nativeWeapons` facts both read it. A native fact carries the full catalog BV,
the native `unitLocation` (`Squad` for IS, `Point` for Clan, `Trooper N`) and
those flags; it needs a location and a positive BV, so editor-built mounts
without `unitLocation` add no fact and no term.

`battleArmorNativeWeaponBV` in `battleArmorBV.ts` follows
`BattleArmorBVCalculator.java:133-160` (pin 48fcb2f64) per trooper: Weapons
(squad-located, not support, not a claw), Squad Support (non-infantry weapons at
the trooper or marked support, divided by the shooting strength for support) and
Anti-Mek (only when `canMakeBAAntiMekAttacks`; squad or own-trooper mounts). A
mount in several passes reports their sum, as Java merges `weapon.*` terms.
`bvTrace.ts` only formats the result as `weapon.<n>.<location>.<id>`, with
trooper 1's list at squad level and every trooper's under `trooper.N.`.

Scope limit: the parity comparator folds each location to a count plus a
descending value list, so these terms establish per-location value parity, not
MegaMek equipment numbers or internal names. `<n>` is MekStation's mount order.

## Native section diagnostics

`nativeMountPasses` in `battleArmorBV.ts` is the one owner of the per-mount pass
values of `BattleArmorBVCalculator.java:133-160`; the `weapon.*` terms (a mount's
passes summed) and the `section.*` terms (each pass summed over the mounts)
both read it. The Java probe records `section.<label>` as the offensive value
that pass adds (`java_bv_terms.py:107-108`), including 0, under the labels
`Weapons:`, `Squad Support:` and, only when `canMakeBAAntiMekAttacks`,
`Anti-Mek:` (`:154-160`). `bvTrace.ts` formats trooper 1's totals at squad level
and every trooper's under `trooper.N.`.

`projectBAMounts` reports `nativeWeaponsComplete`: false when a counted
(positive-BV) weapon mount has no native `unitLocation`. The totals would then
miss that mount, so no section term is traced; such units get no sections rather
than a wrong 0.

## Native equipment diagnostics

`BVCalculator.processOffensiveEquipment` (`BVCalculator.java:978-1039`) asks for
the value of every misc mount that has none of the flags tested at `:1000-1017`
(ECM, active probes and improved sensors are the only ones a BA carries), and
the Java probe records each request as `equipment.native.<location>.<internalName>`
(`java_bv_terms.py:51-54`). `BattleArmorBVCalculator.java:223-226` answers 0
unless the mount's location is the trooper being calculated, so a mount adds
its catalog value to its own trooper only and 0 to every other.

`projectBAMounts` retains each such mount as a `nativeEquipment` fact: the
Java name as written in the source, the Java location (`Squad` and `Point` are
0, `Trooper N` is N: `BattleArmor.java:274-276`; `NONE` is -1: `Entity.java:254`)
and the full catalog value. The ECM, sensor and probe sets that already feed the
defensive bonus are the same exclusion, so there is one list. A mount without a
numbered location adds no fact; the facts are independent, so that costs only
its own term. `battleArmorNativeEquipmentBV` in `battleArmorBV.ts` is the owner of
the per-trooper values (one entry per location and name, as the probe keys
overwrite); `bvTrace.ts` formats trooper 1's at squad level and every trooper's
under `trooper.N.`. Totals, the averaged `offensiveEquipmentBV` and every scalar
are unchanged.

Jump jets, VTOL and UMU gear are `slotless_equipment` entries
(`BLKFile.java:404,469`) placed at LOC_NONE. The converted catalog already lists
them with `unitLocation: NONE`, so `BattleArmorUnitHandler` now keeps the block
the same way, with the editor mapping's squad suit location. The block alone
decides: 60 pinned Leg-motion suits list `BAJumpJet` and 12 Jump-motion suits
with 0 jump MP do too. `BLKBattleArmorFile.java:170-190` also adds the movement
item when the file omits it; no pinned source does, so that is not modelled.

The visited-name table lives in `scripts/__tests__/unit-bv-ba-terms.test.ts`:
every misc name the 1,188 pinned sources reach, with the `MiscType.java` /
`ArmorType.java` line of its internal name and flags and its `misc.bv`. The test
derives which names the probe visits from those flags and the list at
`BVCalculator.java:1000-1017`, and checks that the projection agrees.
