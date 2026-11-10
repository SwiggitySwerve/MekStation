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
