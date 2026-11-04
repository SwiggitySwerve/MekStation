# Runtime BV source boundary

`bvAdapter.ts` accepts legacy Mech saves, serialized non-Mech contracts, and
already projected domain/editor values. Recognized serialized contracts are
validated and routed through existing family projections before dispatch.
Vehicle, aircraft and capital construction use `contractUnitToBVUnit`; personnel
and ProtoMechs use their existing definition mappers and editor BV entry.
Domain values retain their direct dispatcher path; unsupported types retain 0.
Projection and calculator errors propagate. This boundary defines no BV formula.

Pinned MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
BLKTankFile.java:200-233 loads armor/mounts into Tank; BVCalculator.java:103-139
selects the loaded entity calculator. The unchanged AC/2 Carrier and Astrolux
sources pin 403 and 296 respectively; other families retain their mapper results.
