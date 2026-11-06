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

Retain native quirk IDs, source order and duplicates. Slot references are
nonnegative safe integers; malformed native entries do not become legacy keys.
The BLK native tag takes precedence over the legacy `weapon_quirks` alias.
