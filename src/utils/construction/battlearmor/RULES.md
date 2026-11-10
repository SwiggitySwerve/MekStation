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
