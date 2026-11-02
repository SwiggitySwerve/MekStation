# Weapon BV rules

`battleValueWeapons.ts:isDirectFireBVWeapon` owns the existing Mech direct-fire
classification for normalized identifiers. Its extraction preserves the exact
Mech guards and results. Vehicles normalize mounted IDs before calling it.
The older public `calculateOffensiveBV` retains its historical three-family TC
exclusion policy; its separate compatibility contract is not changed here.
