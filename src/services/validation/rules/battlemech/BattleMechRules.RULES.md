# BattleMech tonnage validation

`constructionConstants.BATTLEMECH_TONNAGE` owns the accepted range and step.
The service rule, construction validator and structure controls read that owner:
10/15-ton ultralights remain available alongside standard and superheavy mechs.
The five-ton increment, 200-ton maximum and other construction checks remain.

Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`:
`TestMek.java:1814-1820` checks multiples of five without a 20-ton floor;
`Mek.java:1068-1069` defines the 10/15-ton internal-structure rows.

The standard-only `MechBuilderService` and standard weight-class classifier
retain their separate 20-100-ton scope. They do not own source validity.
