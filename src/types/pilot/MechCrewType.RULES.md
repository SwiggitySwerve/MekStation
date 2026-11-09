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

## Authored seats (row 4.3-c)

`MechCrewSeats.ts` holds the editor's seats: `{ slotIndex, name, gunnery, piloting }`,
unassigned seats absent, saved as the optional `crewSeats` field of a custom
BattleMech record. The crew type is derived when the sheet is projected, never
stored: TripodMek.java:115-117 returns SUPERHEAVY_TRIPOD when `isSuperHeavy()`
(Mek.java:7167, weight > 100) and TRIPOD otherwise; QuadVee.java:164-166 always
returns QUADVEE. A stored Tech Officer seat is kept, not printed, at 100 tons or
less. Skills are integers 0 to `Crew.MAX_SKILL` = 8 (Crew.java:218); Java's
`setGunnery`/`setPiloting` (:1090,:1126) do not bound them, so the lower bound
is this app's choice. MegaMekLab does not author crew on a design: it reads
seats from the Entity, a MUL or ForceBuildUI (ForceBuildUI.java:347,813-815;
PrintQueueDialog.java:305), so the editor field is an app-level workflow. Wounds
print as 0, and Edge and SPAs stay crew-global.
