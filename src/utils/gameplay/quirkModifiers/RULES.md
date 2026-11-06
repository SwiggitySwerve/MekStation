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
