# Weapon quirk source parsing

This owner parses weapon-quirk source text. MTF/BLK import helpers and the
gameplay parser exports delegate here; game effects stay in quirkModifiers.
Keep the public record-of-arrays shape, source order and repeated entries.
Legacy imports retain their name-keyed entries and empty/malformed-line guards.

Native MTF `weaponquirk:QUIRK:LOCATION:SLOT:WEAPON_NAME` and BLK
`<weaponQuirks>` entries use the key `LOCATION:SLOT:WEAPON_NAME`, preserving
location case, expected weapon name and zero-based integer slot. Do not key
native records by name alone. Entity.java:17256-17315 locates the mount and
verifies its type name before assigning the quirk (MegaMek 48fcb2f64).

`parseNativeWeaponQuirkKey` reads that key back. The custom mech writer
(`CustomUnitSerializer.sourceFacts.ts`) applies Java's load rule on save: a
native entry is kept only while a mount in that critical slot is the named
item.

Java also requires the mount to be a WeaponType or a club
(Entity.java:17284-17287). The catalog's equipment categories cannot express
that (TAG is Electronics; vibroblades and the chain whip, which are clubs, are
Miscellaneous), so the writer excludes only ammunition, which is never a weapon
or club and whose bins can carry their weapon's id. Known divergence: Slagmaiden
SLG-X `LA:4:ISLargeShield` is kept here, while Java drops it on load as "not a
weapon" (the large shield has F_SHIELD, not F_CLUB). A pinned test names it;
per-item Java weapon/club facts would flip that test deliberately.

Java matches the name against the mount type's own
names (Entity.java:17289-17297), and each name belongs to one item, so the name
alone decides its side: with a Clan marker (`getTechHintFromToken`: CLFlamer,
Clan Flamer) it is the Clan item, otherwise the Inner Sphere item, never by the
unit's or the mount's mode. The entry is kept iff that item's id equals the
mount's. A Clan twin swapped in for an IS weapon drops the entry (CLFlamer.java
names only CLFlamer and Clan Flamer); an identical twin moved into the cells
keeps it, as a file load would. Java reads only the cell's primary mount
(Entity.java:17258-17260); the editor has no primary/secondary cell model, so
any mount in the cell counts, which is broader than Java but differs on no
committed mech.

This deliberately diverges from MegaMekLab, which holds quirks on the mount and
re-keys them on save from its current location and slot (Mek.java:5241-5247,
Entity.java:19096-19110), so in MML a quirk follows its weapon. The editor has
no per-mount quirk identity, so a moved weapon drops its entry and nothing is
re-keyed. That includes moves made by Sort/Compact or by displacement, which
drop canon quirks. Carrying weapon quirks by mount instance is a follow-up.

Retain native quirk IDs, source order and duplicates. Slot references are
nonnegative safe integers; malformed native entries do not become legacy keys.
The BLK native tag takes precedence over the legacy `weapon_quirks` alias.
