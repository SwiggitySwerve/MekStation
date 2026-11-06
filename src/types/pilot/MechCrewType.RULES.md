# Native multi-crew identity

`MechCrewType` owns the requested native indexed roles. MegaMek
[`48fcb2f64 CrewType.java:51-53`](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/CrewType.java#L51)
defines TRIPOD as Pilot/Gunner, SUPERHEAVY_TRIPOD as Pilot/Gunner/Tech Officer,
and QUADVEE as Pilot/Gunner. Index zero is Pilot, including QuadVee. The final
constructor argument is `maxPrimaryTargets` (lines65,68,74), while crew slot count
is `roleNames.length` (line81). Do not mistake the target count for a third slot.

Mek.java:422-440 maps ordinary/industrial tripod cockpits to TRIPOD and
superheavy/industrial-superheavy tripod cockpits to SUPERHEAVY_TRIPOD.
TripodMek.java:115-117 and QuadVee.java:164-166 select the native crew type.
This registry accepts explicit native identity; it does not guess from local
configuration, cockpit spelling or tonnage, assign people, or resolve gameplay.

Crew.java:174,1313-1318 has one crew-global PilotOptions object;1492/1496 reads
Edge there. New print slots omit the legacy pilot shape's aerospace Edge field. MML
62bf193 PrintEntity.java:495-550 prints indexed names/skills but selects the SPA
region using total crew count minus one;574-593 reads global options. The print
contract retains the existing crew-global SPA block and defines no per-slot SPA
lists. Authoring, persistence and actual multi-slot rendering remain required
follow-up work. `mechCrewPrintContract.test.ts` enforces this payload boundary.
