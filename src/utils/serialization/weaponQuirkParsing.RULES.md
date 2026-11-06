# Weapon quirk source parsing

This owner parses weapon-quirk source text. MTF/BLK import helpers and the
gameplay parser exports delegate here; game effects stay in quirkModifiers.
Keep the public record-of-arrays shape, source order and repeated entries.
Legacy imports retain their name-keyed entries and empty/malformed-line guards.
