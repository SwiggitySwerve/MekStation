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

## Explicit Hard Pilot

Native `hard_pilot` (`OptionsConstants.java:123` at the same pin) and saved
`hard_to_pilot` share membership without double counting. The explicit quirk
adds +1 only when native DNI is inactive, following
[Entity.java:8939-8946](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Entity.java#L8939).
`pilotingQuirks.ts` consumes public `@/lib/spa/neuralInterface.hasActiveDNI`;
the SPA owner alone interprets mode, implants and verified hardware
(`Entity.java:13365-13379`, `NeuralInterfaceMode.java:102-119,151-158`).
The PSR boundary forwards actual session mode/hardware retained by replay.
Missing mode remains inactive; the represented jack-in flag does not replace
native context. BVDNI qualifies even though its represented PSR bonus is zero.
EI and BA NIU do not establish DNI activity or cockpit hardware.

This correction covers explicit design/save quirks. DNI-induced Hard Pilot
synthesis (`Entity.java:15675-15693`), higher-level mode authoring and AirMek
landing PSRs remain separate. Easy Pilot's existing arithmetic and represented
SPA modifiers are preserved; the unpublished native Easy alias is not added.
