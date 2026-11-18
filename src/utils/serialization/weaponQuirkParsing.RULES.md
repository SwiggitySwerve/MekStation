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
weapon, checked against the mount's own type whatever the unit's tech base
(Entity.java:17289-17297). An identical twin moved into those cells keeps the
entry, as a file load would.

This deliberately diverges from MegaMekLab, which holds quirks on the mount and
re-keys them on save from its current location and slot (Mek.java:5241-5247,
Entity.java:19096-19110), so in MML a quirk follows its weapon. The editor has
no per-mount quirk identity, so a moved weapon drops its entry and nothing is
re-keyed. That includes moves made by Sort/Compact or by displacement, which
drop canon quirks. Carrying weapon quirks by mount instance is a follow-up.

Retain native quirk IDs, source order and duplicates. Slot references are
nonnegative safe integers; malformed native entries do not become legacy keys.
The BLK native tag takes precedence over the legacy `weapon_quirks` alias.
