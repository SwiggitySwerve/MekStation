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

`OptionsConstants.java:62,123` names `easy_pilot` and `hard_pilot`.
Resolve both through the same membership owner, retaining `easy_to_pilot`
and `hard_to_pilot` saved keys. These are unit design quirks, not pilot SPAs.
`Entity.java:9989-9995` gates Easy Pilot terrain relief to base piloting >3;
`TWGameManager.java:17878-17888` applies that same gate to damage PSRs.
The ordinary non-DNI Hard Pilot path adds +1 (`Entity.java:8939-8946`).
This identity correction preserves existing PSR arithmetic and eligibility;
it does not establish parity for unrepresented crew/DNI state or every PSR.
