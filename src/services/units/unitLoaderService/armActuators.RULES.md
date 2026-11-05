# Native actuator presence

The source-loading boundary infers arm actuator presence only when the critical
list contains a shoulder. Normalize native annotation tokens through the existing
`parseCriticalSlotToken` owner before checking any actuator. Armored shoulders
provide the same presence evidence as ordinary shoulders. Explicit lower-arm and
hand systems remain installed; equipment-only legacy saves keep their defaults.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`MtfFile.java:952-956` strips the armored annotation before resolving systems;
`MtfFile.java:914-929` removes absent actuators;
`TestMek.java:438-477` checks mounted critical allocation.
