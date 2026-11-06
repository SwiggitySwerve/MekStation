# Native critical equipment projection

Catalog critical counts describe ordinary criticals. At the source-loading
boundary, mounted equipment uses physical critical entries: the existing
`getEquipmentCritEntries` owner converts superheavy demand before matching
source positions. Apply it once to mapped mounts and recovered heat sinks,
ammunition and variable physical mounts. Keep standard demand, weights,
identities, explicit positions, rear flags and all existing recovery guards.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`Mek.java:3484-3492` halves entry demand, rounding up;
`MtfFile.java:1156-1166` applies the same rule to sized components;
`TestMek.java:438-477` checks the complete mounted allocation.

The fixed-slot topology reads the same entry conversion for engine and gyro
occupancy when the selected superheavy gyro identifies the paired frame.
Engine.java:609-641,653-696 and Mek.java:5940-5949 define the native system positions;
ordinary gyros retain ordinary engine/gyro occupancy.

## Mixed-tech identity

`MtfFile.java:1052` builds one mount per critical token, so the token names the
mount. A token's own Clan/IS marker comes before a neighbour's
(`ISERMediumLaser` beside `CLERMediumLaser` stays IS). On a mixed-tech unit, a
list entry with no free entry of its own id takes the free entries of its
other-tech twin (`er-medium-laser` / `clan-er-medium-laser`) and that twin's
identity, in physical entries like any other mapped mount.
